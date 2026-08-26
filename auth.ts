import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getTrustedClientIp } from "@/lib/auth-identity";
import { authenticateCredentials } from "@/lib/authenticate-credentials";
import { assertProductionServerEnv } from "@/lib/server-env";

assertProductionServerEnv();

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials, request) {
        return authenticateCredentials(credentials?.email, credentials?.password, getTrustedClientIp(request.headers));
      },
    }),
  ],
});
