/*
  # Shopping Lists Schema

  1. New Tables
    - `shopping_lists`
      - `id` (uuid, primary key)
      - `name` (text)
      - `access_key` (text, unique)
      - `created_at` (timestamp)
      - `owner_id` (uuid)
    - `list_items`
      - `id` (uuid, primary key)
      - `list_id` (uuid, foreign key)
      - `name` (text)
      - `created_at` (timestamp)
    - `list_members`
      - `list_id` (uuid, foreign key)
      - `member_id` (uuid)
      - `created_at` (timestamp)
    - `item_suggestions`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `usage_count` (integer)
      - `last_used` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for list access based on membership
*/

-- Create tables
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  access_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  owner_id uuid NOT NULL
);

CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE list_members (
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (list_id, member_id)
);

CREATE TABLE item_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  usage_count integer DEFAULT 1,
  last_used timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view lists they are members of"
  ON shopping_lists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_id = shopping_lists.id
      AND member_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Only owners can delete lists"
  ON shopping_lists
  FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Members can view list items"
  ON list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_id = list_items.list_id
      AND member_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE id = list_items.list_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can add list items"
  ON list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_id = list_items.list_id
      AND member_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE id = list_items.list_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view suggestions"
  ON item_suggestions
  FOR SELECT
  TO PUBLIC
  USING (true);