import { NextResponse } from 'next/server';
import { supabase, UpdateApiKeyInput } from '@/app/lib/supabase';
import { getAuthenticatedUser } from '@/app/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// GET - Fetch a single API key by ID (only if it belongs to the authenticated user)
export async function GET(request: Request, { params }: RouteParams) {
  try {
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

    const { id } = await params;

    // Fetch the API key only if it belongs to the authenticated user
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update an API key (only if it belongs to the authenticated user)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
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

    const { id } = await params;
    const body: UpdateApiKeyInput = await request.json();

    // Only allow updating name, type, and limit
    const updates: UpdateApiKeyInput = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.limit !== undefined) {
      if (typeof body.limit !== 'number' || body.limit < 0) {
        return NextResponse.json(
          { error: 'Limit must be a non-negative number' },
          { status: 400 }
        );
      }
      updates.limit = body.limit;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update only if the API key belongs to the authenticated user
    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete an API key (only if it belongs to the authenticated user)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
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

    const { id } = await params;

    // First, verify the key belongs to the user
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete only if it belongs to the authenticated user
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
