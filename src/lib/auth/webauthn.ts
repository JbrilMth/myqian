import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { webauthnChallenges, passkeyCredentials, type users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const RP_NAME = "My Qian";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function getRpConfig() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const hostname = host.split(":")[0];

  return {
    rpName: RP_NAME,
    rpID: hostname,
    origin: `${proto}://${host}`,
  };
}

/**
 * Saves a WebAuthn challenge in database
 */
export async function saveChallenge(challenge: string, userId?: string): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

  await db.insert(webauthnChallenges).values({
    id,
    challenge,
    userId,
    expiresAt,
  });

  return id;
}

/**
 * Retrieves and consumes a WebAuthn challenge
 */
export async function consumeChallenge(challengeId: string): Promise<string | null> {
  const result = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        gt(webauthnChallenges.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) return null;

  // Clean up
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId));

  return result[0].challenge;
}

/**
 * Generates options for registering a new Face ID / Passkey credential
 */
export async function createPasskeyRegistrationOptions(user: { id: string; email: string }) {
  const { rpName, rpID } = await getRpConfig();

  // Find existing passkeys for this user to exclude them
  const existingCredentials = await db
    .select({ id: passkeyCredentials.id, transports: passkeyCredentials.transports })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.email.split("@")[0],
    attestationType: "none",
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred", // Prompts Face ID / Touch ID / PIN
    },
  });

  const challengeId = await saveChallenge(options.challenge, user.id);

  return {
    options,
    challengeId,
  };
}

/**
 * Verifies the WebAuthn registration response and stores the passkey in DB
 */
export async function verifyPasskeyRegistration(
  user: { id: string },
  challengeId: string,
  response: any
): Promise<{ verified: boolean; error?: string }> {
  const expectedChallenge = await consumeChallenge(challengeId);
  if (!expectedChallenge) {
    return { verified: false, error: "Registration session expired. Please try again." };
  }

  const { rpID, origin } = await getRpConfig();

  try {
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: "Passkey verification failed." };
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const base64PublicKey = Buffer.from(credential.publicKey).toString("base64url");

    await db.insert(passkeyCredentials).values({
      id: credential.id,
      userId: user.id,
      publicKey: base64PublicKey,
      counter: credential.counter.toString(),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      lastUsedAt: new Date(),
    });

    return { verified: true };
  } catch (err: any) {
    console.error("Passkey registration verification error:", err);
    return { verified: false, error: err.message || "Failed to verify passkey." };
  }
}

/**
 * Generates options for authenticating via Face ID / Passkey
 */
export async function createPasskeyAuthenticationOptions(userId?: string) {
  const { rpID } = await getRpConfig();

  let allowCredentials: { id: string; transports?: any }[] | undefined = undefined;

  if (userId) {
    const userPasskeys = await db
      .select({ id: passkeyCredentials.id, transports: passkeyCredentials.transports })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));

    if (userPasskeys.length > 0) {
      allowCredentials = userPasskeys.map((p) => ({
        id: p.id,
        transports: p.transports ? JSON.parse(p.transports) : undefined,
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials,
  });

  const challengeId = await saveChallenge(options.challenge, userId);

  return {
    options,
    challengeId,
  };
}

/**
 * Verifies the WebAuthn authentication response
 */
export async function verifyPasskeyAuthentication(
  challengeId: string,
  response: any
): Promise<{ verified: boolean; userId?: string; error?: string }> {
  const expectedChallenge = await consumeChallenge(challengeId);
  if (!expectedChallenge) {
    return { verified: false, error: "Authentication challenge expired. Please try again." };
  }

  const { rpID, origin } = await getRpConfig();

  try {
    const credentialId = response.id;
    const credResult = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, credentialId))
      .limit(1);

    if (credResult.length === 0) {
      return { verified: false, error: "Passkey credential not recognized." };
    }

    const savedCred = credResult[0];
    const publicKeyUint8 = new Uint8Array(Buffer.from(savedCred.publicKey, "base64url"));

    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: savedCred.id,
          publicKey: publicKeyUint8,
          counter: Number(savedCred.counter),
          transports: savedCred.transports ? JSON.parse(savedCred.transports) : undefined,
        },
        requireUserVerification: false,
      });

    if (!verification.verified) {
      return { verified: false, error: "Passkey authentication failed." };
    }

    // Update counter and lastUsedAt
    await db
      .update(passkeyCredentials)
      .set({
        counter: verification.authenticationInfo.newCounter.toString(),
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, savedCred.id));

    return { verified: true, userId: savedCred.userId };
  } catch (err: any) {
    console.error("Passkey auth verification error:", err);
    return { verified: false, error: err.message || "Failed to authenticate with passkey." };
  }
}
