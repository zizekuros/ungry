/*
  # Update list_members RLS policies
*/

-- Enable RLS on the table
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT
CREATE POLICY "Enable SELECT for authenticated users only"
ON list_members
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT
CREATE POLICY "Enable INSERT for authenticated users only"
ON list_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE
CREATE POLICY "Enable UPDATE for authenticated users only"
ON list_members
FOR UPDATE
TO authenticated
USING (true);

-- Policy for DELETE
CREATE POLICY "Enable DELETE for authenticated users only"
ON list_members
FOR DELETE
TO authenticated
USING (true);