/*
  # Create subscription processor function

  1. Changes
    - Create function to copy temp subscription data to user app_metadata
    - Function can be called from app code after user signup
*/

-- Function to process temp subscription for a specific user
CREATE OR REPLACE FUNCTION public.process_user_temp_subscription(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  temp_subscription RECORD;
  user_record RECORD;
  current_metadata jsonb;
  new_metadata jsonb;
  result jsonb;
BEGIN
  -- Look for temp subscription data for this email
  SELECT * INTO temp_subscription 
  FROM public.subscriptions_temp 
  WHERE email = user_email 
    AND processed_at IS NULL
  LIMIT 1;

  -- If no temp subscription found
  IF temp_subscription IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No temp subscription found');
  END IF;

  -- Get the user record
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;

  -- If user not found
  IF user_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

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
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Subscription processed successfully',
    'subscription_data', temp_subscription.subscription_data
  );
END;
$$;

-- Function to check if user has temp subscription (for app to call before signup)
CREATE OR REPLACE FUNCTION public.check_user_temp_subscription(user_email text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'has_temp_subscription', EXISTS(
      SELECT 1 FROM public.subscriptions_temp 
      WHERE email = user_email AND processed_at IS NULL
    ),
    'subscription_data', (
      SELECT subscription_data 
      FROM public.subscriptions_temp 
      WHERE email = user_email AND processed_at IS NULL 
      LIMIT 1
    )
  );
$$;
