"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full glass-panel rounded-3xl p-8 space-y-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-semibold text-white">Authentication Error</h1>
        <p className="text-sm text-gray-400">
          Could not sign in. This might be because the authentication provider is not configured or unreachable.
        </p>
        <Link
          href="/auth/signin"
          className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
