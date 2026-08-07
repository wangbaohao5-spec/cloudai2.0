import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { assertProductionServerEnv } from "@/lib/server-env";

assertProductionServerEnv();

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !email.includes("@") || password.length < 6) {
          return null;
        }

        return {
          id: email,
          email,
          name: email.split("@")[0] || "CloudAI User",
        };
      },
    }),
  ],
});
