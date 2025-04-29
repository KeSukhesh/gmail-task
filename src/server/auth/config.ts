import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { Session, User } from "next-auth";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      accessToken?: string;
      refreshToken?: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
    error?: "RefreshTokenError";
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
          access_type: "offline", // << REQUIRED for refresh_token
          prompt: "consent",
        },
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  session: { strategy: "database" as const },
  callbacks: {
    async session({ session, user }: { session: Session; user: User }) {
      const [googleAccount] = await db.account.findMany({
        where: { userId: user.id, provider: "google" },
      });

      if (googleAccount) {
        session.user.accessToken = googleAccount.access_token ?? undefined;
        session.user.refreshToken = googleAccount.refresh_token ?? undefined;
      }

      if (
        googleAccount?.expires_at &&
        googleAccount.expires_at * 1000 < Date.now()
      ) {
        // If the access token has expired, try to refresh it
        try {
          // https://accounts.google.com/.well-known/openid-configuration
          // We need the `token_endpoint`.
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: new URLSearchParams({
              client_id: process.env.AUTH_GOOGLE_ID!,
              client_secret: process.env.AUTH_GOOGLE_SECRET!,
              grant_type: "refresh_token",
              refresh_token: googleAccount?.refresh_token ?? "",
            }),
          });

          const tokensOrError = await response.json() as {
            access_token: string;
            expires_in: number;
            refresh_token?: string;
          } | { error: string };

          if (!response.ok) {
            const error = "error" in tokensOrError ? tokensOrError.error : "Failed to refresh token";
            throw new Error(error);
          }

          const newTokens = tokensOrError as {
            access_token: string;
            expires_in: number;
            refresh_token?: string;
          };

          await db.account.update({
            data: {
              access_token: newTokens.access_token,
              expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
              refresh_token:
                newTokens.refresh_token ?? googleAccount.refresh_token,
            },
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: googleAccount.providerAccountId,
              },
            },
          });
        } catch (error) {
          console.error("Error refreshing access_token", error);
          // If we fail to refresh the token, return an error so we can handle it on the page
          session.error = "RefreshTokenError";
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
