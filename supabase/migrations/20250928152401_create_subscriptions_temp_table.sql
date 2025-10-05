/*
  # Create subscriptions_temp table with auto-sync to user metadata

  1. Changes
    - Create subscriptions_temp table for storing subscriptions before user signup
    - Add trigger to automatically copy subscription data to user app_metadata on signup
    - Handle subscription data transfer from temp table to user metadata
*/

-- Create subscriptions_temp table
CREATE TABLE public.subscriptions_temp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subscription_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT NULL
);

-- Create index for email lookups
CREATE INDEX idx_subscriptions_temp_email ON public.subscriptions_temp(email);
CREATE INDEX idx_subscriptions_temp_processed ON public.subscriptions_temp(processed_at) WHERE processed_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.subscriptions_temp ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts (for storing temp subscriptions)
CREATE POLICY "Allow subscription temp inserts"
  ON public.subscriptions_temp
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow updates (for marking as processed)
CREATE POLICY "Allow subscription temp updates"
  ON public.subscriptions_temp
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow deletes (for cleanup)
CREATE POLICY "Allow subscription temp deletes"
  ON public.subscriptions_temp
  FOR DELETE
  USING (true);

-- Function to handle subscription transfer on user creation
CREATE OR REPLACE FUNCTION public.handle_user_signup_with_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  temp_subscription RECORD;
  current_metadata jsonb;
  new_metadata jsonb;
BEGIN
  -- Look for temp subscription data for this email
  SELECT * INTO temp_subscription 
  FROM public.subscriptions_temp 
  WHERE email = NEW.email 
    AND processed_at IS NULL
  LIMIT 1;

  -- If temp subscription exists, merge it into app_metadata
  IF temp_subscription IS NOT NULL THEN
    -- Get current app_metadata (or create empty object)
    current_metadata := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
    
    -- Merge subscription data into app_metadata
    new_metadata := current_metadata || jsonb_build_object('subscription', temp_subscription.subscription_data);
    
    -- Update the user with merged metadata
    UPDATE auth.users 
    SET raw_app_meta_data = new_metadata
    WHERE id = NEW.id;
    
    -- Mark temp subscription as processed
    UPDATE public.subscriptions_temp 
    SET processed_at = now()
    WHERE id = temp_subscription.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for user signup (after user is created)
CREATE TRIGGER on_user_signup_with_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_signup_with_subscription();

-- Function to store temp subscription
CREATE OR REPLACE FUNCTION public.store_temp_subscription(
  user_email text,
  subscription_info jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_id uuid;
BEGIN
  -- Insert or update temp subscription
  INSERT INTO public.subscriptions_temp (email, subscription_data)
  VALUES (user_email, subscription_info)
  ON CONFLICT (email) 
  DO UPDATE SET 
    subscription_data = EXCLUDED.subscription_data,
    created_at = now(),
    processed_at = NULL
  RETURNING id INTO subscription_id;
  
  RETURN subscription_id;
END;
$$;

-- Function to get temp subscription by email
CREATE OR REPLACE FUNCTION public.get_temp_subscription(user_email text)
RETURNS TABLE (
  id uuid,
  email text,
  subscription_data jsonb,
  created_at timestamptz,
  processed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, email, subscription_data, created_at, processed_at
  FROM public.subscriptions_temp 
  WHERE email = user_email;
$$;
