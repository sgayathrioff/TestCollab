-- Fix RLS policy infinite recursion for workspace_members table

-- 1. Drop all existing policies on workspace_members to start fresh
DROP POLICY IF EXISTS "Users can view workspace members they have access to" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON workspace_members; 
DROP POLICY IF EXISTS "Workspace owners can manage all members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
-- Drop the new policies that might exist
DROP POLICY IF EXISTS "workspace_owners_can_view_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_view_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "workspace_owners_can_manage_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_leave_workspace" ON workspace_members;
-- Drop old default policies that are causing recursion
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

-- 2. Temporarily disable RLS to test
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS with simpler, non-recursive policies
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, non-recursive policies
-- Policy 1: Users can view members of workspaces they own
CREATE POLICY "workspace_owners_can_view_members" ON workspace_members
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspaces 
      WHERE workspace_owner_id = auth.uid()
    )
  );

-- Policy 2: Users can view their own membership records
CREATE POLICY "users_can_view_own_membership" ON workspace_members
  FOR SELECT 
  USING (profile_id = auth.uid());

-- Policy 3: Workspace owners can insert/update/delete any member in their workspace
CREATE POLICY "workspace_owners_can_manage_members" ON workspace_members
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspaces 
      WHERE workspace_owner_id = auth.uid()
    )
  );

-- Policy 4: Users can delete their own membership (to leave a workspace)
CREATE POLICY "users_can_leave_workspace" ON workspace_members
  FOR DELETE 
  USING (profile_id = auth.uid());

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'workspace_members';