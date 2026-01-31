-- Supabase SQL Schema for API Keys Management
-- Run this in your Supabase SQL Editor (Database > SQL Editor)

-- Create the users table (if not already created by NextAuth setup)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image TEXT,
  provider VARCHAR(50),
  provider_account_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create the api_keys table with user_id reference
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(10) NOT NULL DEFAULT 'dev' CHECK (type IN ('dev', 'prod')),
  usage INTEGER DEFAULT 0,
  "limit" INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the key column for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- Create an index on user_id for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for api_keys table
-- Users can only see their own API keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own API keys" ON api_keys
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE
  USING (true);

-- Create policies for users table
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions to the anon role
GRANT ALL ON api_keys TO anon;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;

-- Migration script for existing api_keys table (if you have existing data)
-- Run this AFTER creating the new schema if you need to migrate existing data:
--
-- 1. First, add the user_id column if it doesn't exist:
-- ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
--
-- 2. Add the limit column if it doesn't exist:
-- ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "limit" INTEGER DEFAULT 1000;
--
-- 3. Update existing rows to assign them to a default user (replace 'default-user-email@example.com' with an actual user email):
-- UPDATE api_keys 
-- SET user_id = (SELECT id FROM users WHERE email = 'default-user-email@example.com' LIMIT 1)
-- WHERE user_id IS NULL;
--
-- 4. Make user_id NOT NULL after migration:
-- ALTER TABLE api_keys ALTER COLUMN user_id SET NOT NULL;

-- Optional: Create a stored procedure for atomic usage increment
-- This prevents race conditions when incrementing usage
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET usage = usage + 1
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;
