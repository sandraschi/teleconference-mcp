"use client";

import { Loader2, Monitor } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full glass-panel rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <Monitor className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white">AG-Visio</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        <button
          type="button"
          onClick={() => signIn("authentik", { callbackUrl })}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          Sign in with Authentik
        </button>

        <p className="text-xs text-gray-600 text-center">
          Your credentials are managed by your organization&apos;s identity provider.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
