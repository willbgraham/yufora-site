import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendMagicLinkEmail } from "./auth-email";

const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV === "production") {
  // Don't crash the build, but make the misconfiguration impossible to miss.
  console.error(
    "[auth] BETTER_AUTH_SECRET is not set in production — sessions are signed with an insecure fallback. Set it in Vercel project settings.",
  );
}

export const auth = betterAuth({
  baseURL,
  secret:
    process.env.BETTER_AUTH_SECRET ?? "insecure-dev-secret-do-not-use-in-prod",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Passwordless only: magic links are the sole sign-in method.
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    // Must be last: lets Better Auth set cookies from Server Actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
