/*
  # Fix subscription trigger - Alternative approach

  1. Changes
    - Create a function that can be called manually or from app
    - Add a function to check and process temp subscriptions
    - Alternative to trigger approach
*/

-- Function to manually process temp subscriptions for a user
CREATE OR REPLACE FUNCTION public.process_temp_subscription_for_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  temp_subscription RECORD;
  user_record RECORD;
  current_metadata jsonb;
  new_metadata jsonb;
BEGIN
  -- Look for temp subscription data for this email
  SELECT * INTO temp_subscription 
  FROM public.subscriptions_temp 
  WHERE email = user_email 
    AND processed_at IS NULL
  LIMIT 1;

  -- If temp subscription exists, process it
  IF temp_subscription IS NOT NULL THEN
    -- Get the user record
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = user_email
    LIMIT 1;

    IF user_record IS NOT NULL THEN
      -- Get current app_metadata (or create empty object)
      current_metadata := COALESCE(user_record.raw_app_meta_data, '{}'::jsonb);
      
      -- Merge subscription data into app_metadata
      new_metadata := current_metadata || jsonb_build_object('subscription', temp_subscription.subscription_data);
      
      -- Update the user with merged metadata
      UPDATE auth.users 
      SET raw_app_meta_data = new_metadata
      WHERE id = user_record.id;
      
      -- Mark temp subscription as processed
      UPDATE public.subscriptions_temp 
      SET processed_at = now()
      WHERE id = temp_subscription.id;
      
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Function to process all pending temp subscriptions
CREATE OR REPLACE FUNCTION public.process_all_pending_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  temp_subscription RECORD;
  user_record RECORD;
  current_metadata jsonb;
  new_metadata jsonb;
  processed_count integer := 0;
BEGIN
  -- Get all unprocessed temp subscriptions
  FOR temp_subscription IN 
    SELECT * FROM public.subscriptions_temp 
    WHERE processed_at IS NULL
  LOOP
    -- Find user with this email
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = temp_subscription.email
    LIMIT 1;

    IF user_record IS NOT NULL THEN
      -- Get current app_metadata (or create empty object)
      current_metadata := COALESCE(user_record.raw_app_meta_data, '{}'::jsonb);
      
      -- Merge subscription data into app_metadata
      new_metadata := current_metadata || jsonb_build_object('subscription', temp_subscription.subscription_data);
      
      -- Update the user with merged metadata
      UPDATE auth.users 
      SET raw_app_meta_data = new_metadata
      WHERE id = user_record.id;
      
      -- Mark temp subscription as processed
      UPDATE public.subscriptions_temp 
      SET processed_at = now()
      WHERE id = temp_subscription.id;
      
      processed_count := processed_count + 1;
    END IF;
  END LOOP;

  RETURN processed_count;
END;
$$;
