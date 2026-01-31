import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "./supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}

/**
 * Verifies the session using getServerSession and retrieves the user from the database.
 * Returns the authenticated user or an error response.
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    // Get the session using getServerSession
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Unauthorized. Please sign in to access this resource." },
          { status: 401 }
        ),
      };
    }

    // Find the user in Supabase by email
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", session.user.email)
      .single();

    if (error || !user) {
      console.error("Error fetching user from Supabase:", error);
      return {
        user: null,
        error: NextResponse.json(
          { error: "User not found. Please sign in again." },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      error: null,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      error: NextResponse.json(
        { error: "Authentication failed. Please try again." },
        { status: 500 }
      ),
    };
  }
}

/**
 * Helper function to check if the request is authenticated.
 * Returns just the user without the full AuthResult structure.
 */
export async function requireAuth(): Promise<AuthenticatedUser | null> {
  const { user } = await getAuthenticatedUser();
  return user;
}
