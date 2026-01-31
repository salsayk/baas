import { NextResponse } from 'next/server';
import { supabase, CreateApiKeyInput } from '@/app/lib/supabase';
import { getAuthenticatedUser } from '@/app/lib/auth';

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// GET - Fetch all API keys for the authenticated user
export async function GET() {
  try {
    // Check configuration first
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
      return NextResponse.json(
        { error: 'Database not configured. Please check your environment variables.' },
        { status: 503 }
      );
    }

    // Verify authentication and get user
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access this resource.' },
        { status: 401 }
      );
    }

    // Fetch only the API keys belonging to this user
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new API key for the authenticated user
export async function POST(request: Request) {
  try {
    // Check configuration first
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured. Please check your environment variables.' },
        { status: 503 }
      );
    }

    // Verify authentication and get user
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access this resource.' },
        { status: 401 }
      );
    }

    const body: CreateApiKeyInput = await request.json();

    if (!body.name || !body.key || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, key, type' },
        { status: 400 }
      );
    }

    // Create the API key with the user's ID
    // Default limit is 1000 if not specified
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: body.name,
        key: body.key,
        type: body.type,
        usage: 0,
        limit: body.limit ?? 1000,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
