import React from "react";
import { redirect } from "next/navigation";
import { validateSession, hasAnyRegisteredUser } from "@/lib/auth/session";
import { RegisterClient } from "@/components/auth/RegisterClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await validateSession();
  if (session) {
    redirect("/");
  }

  const hasUsers = await hasAnyRegisteredUser();
  if (hasUsers) {
    // If an account already exists, do not expose public registration
    redirect("/login");
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <RegisterClient />
    </div>
  );
}
