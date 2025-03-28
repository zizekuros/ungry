/*
  # Add function to find list by access key

  1. New Functions
    - `find_list_by_access_key`: Function to find a list by its access key
*/

CREATE OR REPLACE FUNCTION find_list_by_access_key(key text)
RETURNS SETOF shopping_lists
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM shopping_lists
  WHERE access_key = key;
$$;