/*
  # Rollback subscription functions only

  1. Changes
    - Drop all subscription-related functions and triggers
    - Keep public.users table and subscriptions_temp table
*/

-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS on_user_signup_with_subscription ON auth.users;

-- Drop subscription functions
DROP FUNCTION IF EXISTS public.process_temp_subscription_for_user(text);
DROP FUNCTION IF EXISTS public.process_all_pending_subscriptions();
DROP FUNCTION IF EXISTS public.handle_user_signup_with_subscription();
DROP FUNCTION IF EXISTS public.store_temp_subscription(text, jsonb);
DROP FUNCTION IF EXISTS public.get_temp_subscription(text);
