/*
  # Fix list_members column reference in subscription limit checker

  The list_members table uses 'member_id' not 'user_id'
*/

-- Recreate the function with correct column name
CREATE OR REPLACE FUNCTION public.check_user_subscription_limit(
  user_id_param uuid,
  action_type text -- 'add_item' or 'create_list'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription jsonb;
  subscription_plan text;
  subscription_period text;
  subscription_renewed timestamptz;
  subscription_valid_until timestamptz;
  current_active_lists int;
  items_added_this_period int;
  max_items_per_week int;
  max_active_lists int;
  period_start timestamptz;
  is_subscription_active boolean;
BEGIN
  -- Get user's subscription from app_metadata
  SELECT raw_app_meta_data->'subscription' INTO user_subscription
  FROM auth.users
  WHERE id = user_id_param;

  -- If no subscription found, treat as free tier
  IF user_subscription IS NULL THEN
    subscription_plan := 'free';
    subscription_period := NULL;
    subscription_renewed := NULL;
    is_subscription_active := true; -- Free tier is always "active"
  ELSE
    subscription_plan := COALESCE(user_subscription->>'plan', 'free');
    subscription_period := user_subscription->>'period';
    subscription_renewed := (user_subscription->>'renewed')::timestamptz;
    
    -- Check if subscription is still active (only for paid plans that expire)
    -- Free tier has no expiration
    IF subscription_plan != 'free' AND subscription_renewed IS NOT NULL AND subscription_period IS NOT NULL THEN
      -- Calculate valid until date based on period
      IF subscription_period = 'annual' THEN
        -- Annual: add 1 year, set to end of day
        subscription_valid_until := (subscription_renewed + interval '1 year')::date + interval '1 day' - interval '1 second';
      ELSIF subscription_period = 'monthly' THEN
        -- Monthly: add 1 month, set to end of day (handles different month lengths automatically)
        subscription_valid_until := (subscription_renewed + interval '1 month')::date + interval '1 day' - interval '1 second';
      ELSE
        -- Unknown period, treat as expired
        subscription_valid_until := subscription_renewed;
      END IF;
      
      -- Check if subscription is still valid
      is_subscription_active := (now() <= subscription_valid_until);
    ELSE
      -- Free tier is always active
      is_subscription_active := true;
    END IF;
  END IF;

  -- Set limits based on plan
  CASE subscription_plan
    WHEN 'free' THEN
      max_items_per_week := 15;
      max_active_lists := 1;
    WHEN 'standard' THEN
      max_items_per_week := 50;
      max_active_lists := 3;
    WHEN 'unlimited', 'admin' THEN
      max_items_per_week := NULL; -- No limit
      max_active_lists := NULL; -- No limit
    ELSE
      -- Unknown plan, treat as free
      max_items_per_week := 15;
      max_active_lists := 1;
  END CASE;

  -- If subscription is expired, block the action
  IF NOT is_subscription_active THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'plan', subscription_plan,
      'is_active', false,
      'valid_until', subscription_valid_until,
      'reason', 'subscription expired',
      'message', 'Your subscription has expired. Please renew to continue.'
    );
  END IF;

  -- Check limits based on action type
  IF action_type = 'create_list' THEN
    -- Check if unlimited
    IF max_active_lists IS NULL THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'reason', 'unlimited lists'
      );
    END IF;

    -- Count current active shopping lists (FIXED: use member_id instead of user_id)
    SELECT COUNT(*) INTO current_active_lists
    FROM shopping_lists
    WHERE (owner_id = user_id_param OR id IN (
      SELECT list_id FROM list_members WHERE member_id = user_id_param
    ))
    AND deleted_at IS NULL;

    -- Check if user can create more lists
    IF current_active_lists >= max_active_lists THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'reason', 'max lists reached',
        'current_count', current_active_lists,
        'max_allowed', max_active_lists,
        'message', format('You have reached the maximum of %s active list(s) for your %s plan', max_active_lists, subscription_plan)
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', true,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'current_count', current_active_lists,
        'max_allowed', max_active_lists
      );
    END IF;

  ELSIF action_type = 'add_item' THEN
    -- Check if unlimited
    IF max_items_per_week IS NULL THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'reason', 'unlimited items'
      );
    END IF;

    -- Calculate start of current week (Monday 00:00:00)
    -- date_trunc('week', timestamp) returns Monday 00:00:00 of the current week
    period_start := date_trunc('week', now());

    -- Count items added in current week (Monday to now)
    SELECT COUNT(*) INTO items_added_this_period
    FROM user_item_analytics
    WHERE user_id = user_id_param
      AND action = 'added'
      AND created_at >= period_start;

    -- Check if user can add more items
    IF items_added_this_period >= max_items_per_week THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'reason', 'max items per week reached',
        'current_count', items_added_this_period,
        'max_allowed', max_items_per_week,
        'period_start', period_start,
        'message', format('You have reached the maximum of %s items per week for your %s plan', max_items_per_week, subscription_plan)
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', true,
        'plan', subscription_plan,
        'is_active', is_subscription_active,
        'current_count', items_added_this_period,
        'max_allowed', max_items_per_week,
        'period_start', period_start
      );
    END IF;

  ELSE
    -- Unknown action type
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'unknown action type',
      'message', 'Invalid action type specified'
    );
  END IF;
END;
$$;

