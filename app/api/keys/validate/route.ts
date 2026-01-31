import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getAuthenticatedUser } from '@/app/lib/auth';

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// POST - Validate an API key (only validates keys belonging to the authenticated user)
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { valid: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Verify authentication and get user
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) {
      return NextResponse.json(
        { valid: false, error: 'Unauthorized. Please sign in to validate API keys.' },
        { status: 401 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Unauthorized. Please sign in to validate API keys.' },
        { status: 401 }
      );
    }

    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Check if the API key exists in the database and belongs to the authenticated user
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, type')
      .eq('key', apiKey.trim())
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching record found
        return NextResponse.json({ valid: false, error: 'Invalid API key' });
      }
      console.error('Supabase error:', error);
      return NextResponse.json(
        { valid: false, error: 'Validation failed' },
        { status: 500 }
      );
    }

    // API key is valid and belongs to the user
    return NextResponse.json({
      valid: true,
      keyInfo: {
        id: data.id,
        name: data.name,
        type: data.type,
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
