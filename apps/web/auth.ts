import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const config: NextAuthConfig = {
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc" as const,
      issuer: process.env.AUTH_AUTHENTIK_ISSUER || "http://localhost:9000/application/o/ag-visio",
      clientId: process.env.AUTH_AUTHENTIK_ID || "",
      clientSecret: process.env.AUTH_AUTHENTIK_SECRET || "",
      authorization: {
        params: { scope: "openid email profile" },
      },
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.email,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, profile }: { token: any; profile?: any }) {
      if (profile) {
        token.id = profile.sub;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
  // Dev fallback: Auth.js asserts a secret on EVERY request (even for the
  // AUTH_DISABLED bypass or public pages), so without this the dev server
  // 500s with MissingSecret when AUTH_SECRET is unset. Production without
  // AUTH_SECRET still throws — as it should.
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-only-insecure-secret" : undefined),
};

const authInstance = NextAuth(config);

export const handlers = authInstance.handlers as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};
export const signIn = authInstance.signIn as (provider?: string, options?: any) => Promise<void>;
export const signOut = authInstance.signOut as (options?: any) => Promise<void>;
export const auth = authInstance.auth as (req?: any) => Promise<any>;
