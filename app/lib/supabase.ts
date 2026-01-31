import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Ensure URL has https:// prefix
const formattedUrl = supabaseUrl?.startsWith('http') 
  ? supabaseUrl 
  : `https://${supabaseUrl}`;

export const supabase = createClient(formattedUrl || '', supabaseAnonKey || '');

// Type definitions for the users table
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  provider_account_id: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface CreateUserInput {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  provider_account_id: string;
}

// Type definitions for the api_keys table
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  type: 'dev' | 'prod';
  usage: number;
  limit: number;
  created_at: string;
}

export interface CreateApiKeyInput {
  name: string;
  key: string;
  type: 'dev' | 'prod';
  limit?: number;
}

export interface UpdateApiKeyInput {
  name?: string;
  type?: 'dev' | 'prod';
  limit?: number;
}

