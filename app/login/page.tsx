import React from "react";
import { redirect } from "next/navigation";
import { validateSession, hasAnyRegisteredUser } from "@/lib/auth/session";
import { getGlobalPasskeyAvailability } from "@/actions/auth";
import { LoginClient } from "@/components/auth/LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await validateSession();
  if (session) {
    redirect("/");
  }

  const hasUsers = await hasAnyRegisteredUser();
  if (!hasUsers) {
    redirect("/register");
  }

  const hasPasskeys = await getGlobalPasskeyAvailability();

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginClient hasPasskeys={hasPasskeys} />
    </div>
  );
}
