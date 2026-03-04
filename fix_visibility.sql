-- Enable public read access to profiles (needed for members to see each other's names/avatars)
-- Check if policy exists first or just drop and recreate
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = profile_id);

-- Fix workspace_members RLS to allow members to see each other (without infinite recursion)
-- We use a SECURITY DEFINER function to bypass RLS when checking membership for the policy

CREATE OR REPLACE FUNCTION is_member_of_workspace(_workspace_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM workspace_members 
    WHERE workspace_id = _workspace_id 
    AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop previous view policy if strictly owner-based
DROP POLICY IF EXISTS "workspace_owners_can_view_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_view_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "members_can_view_other_members" ON workspace_members;

-- Create comprehensive view policy
-- 1. Owners can view (via workspaces table)
-- 2. Members can view (via the security definer function to avoid recursion)
CREATE POLICY "members_can_view_workspace_members" ON workspace_members
  FOR SELECT 
  USING (
    -- Access if owner
    workspace_id IN (
      SELECT workspace_id 
      FROM workspaces 
      WHERE workspace_owner_id = auth.uid()
    )
    OR 
    -- Access if member (using function to avoid recursion loop)
    is_member_of_workspace(workspace_id)
  );
