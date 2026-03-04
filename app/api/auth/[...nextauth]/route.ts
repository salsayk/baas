import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDbClient } from "@/database/accounts/db-client";

// Validate required environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn("Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured");
}

if (!nextAuthSecret) {
  console.warn("Warning: NEXTAUTH_SECRET not configured. Authentication may not work properly.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Save or update user in PostgreSQL on every sign in
      if (account && user.email) {
        try {
          const googleProfile = profile as { picture?: string };
          const client = getDbClient();
          await client.connect();
          try {
            const existing = await client.query(
              "SELECT id FROM users WHERE email = $1",
              [user.email]
            );
            const now = new Date().toISOString();
            if (existing.rows.length > 0) {
              await client.query(
                `UPDATE users SET name = $1, image = $2, last_login_at = $3, updated_at = $3 WHERE email = $4`,
                [user.name ?? null, (googleProfile?.picture || user.image) ?? null, now, user.email]
              );
              console.log("Updated existing user:", user.email);
            } else {
              await client.query(
                `INSERT INTO users (email, name, image, provider, provider_account_id, created_at, updated_at, last_login_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $6, $6)`,
                [
                  user.email,
                  user.name ?? null,
                  (googleProfile?.picture || user.image) ?? null,
                  account.provider,
                  account.providerAccountId ?? null,
                  now,
                ]
              );
              console.log("Created new user:", user.email);
            }
          } finally {
            await client.end();
          }
        } catch (error) {
          console.error("Error saving user to PostgreSQL:", error);
          // Don't block sign in if database save fails
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // On initial sign in, persist user data to the token
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.picture = user.image;
        token.name = user.name;
        token.email = user.email;
      }
      // Also get picture from Google profile if available
      if (profile) {
        token.picture = (profile as { picture?: string }).picture || token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass user data from token to session
      if (session.user) {
        session.user.id = token.sub!;
        session.user.image = token.picture as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/auth-error",
  },
  session: {
    strategy: "jwt",
  },
  // Use env secret or a fallback for development (NOT recommended for production)
  secret: nextAuthSecret || (process.env.NODE_ENV === "development" ? "dev-secret-please-set-nextauth-secret" : undefined),
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

