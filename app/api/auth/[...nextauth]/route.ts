import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/app/lib/supabase";

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
      // Save or update user in Supabase on every sign in
      if (account && user.email) {
        try {
          const googleProfile = profile as { picture?: string };
          
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single();

          if (existingUser) {
            // Update existing user's last login and profile info
            await supabase
              .from("users")
              .update({
                name: user.name,
                image: googleProfile?.picture || user.image,
                last_login_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("email", user.email);
            
            console.log("Updated existing user:", user.email);
          } else {
            // Create new user
            const { error } = await supabase.from("users").insert({
              email: user.email,
              name: user.name,
              image: googleProfile?.picture || user.image,
              provider: account.provider,
              provider_account_id: account.providerAccountId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login_at: new Date().toISOString(),
            });

            if (error) {
              console.error("Error creating user in Supabase:", error);
            } else {
              console.log("Created new user:", user.email);
            }
          }
        } catch (error) {
          console.error("Error saving user to Supabase:", error);
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

