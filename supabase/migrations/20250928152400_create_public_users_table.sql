/*
  # Create public.users table with auto-sync from auth.users

  1. Changes
    - Create public.users table with user_id and email
    - Add function to automatically sync users from auth.users
    - Add trigger to sync on user creation
    - Add RLS policies for user data access
*/

-- Create public.users table
CREATE TABLE public.users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on email
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Create index for email lookups
CREATE INDEX idx_users_email ON public.users(email);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own data
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Allow inserts (for user creation)
CREATE POLICY "Allow user inserts"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow updates (for user updates)
CREATE POLICY "Allow user updates"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid());

-- Function to sync user from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NEW.updated_at)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

-- Function to sync user updates from auth.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET 
    email = NEW.email,
    updated_at = NEW.updated_at
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Function to get user_id by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_id FROM public.users WHERE email = user_email LIMIT 1;
$$;

-- Function to get user email by user_id
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email FROM public.users WHERE user_id = user_uuid LIMIT 1;
$$;
