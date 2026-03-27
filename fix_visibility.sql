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

-- ---------------------------------------------------------------------------
-- Recursion-safe workspace/workspace_members policies
-- ---------------------------------------------------------------------------
-- The error `42P17 infinite recursion detected in policy for relation "workspaces"`
-- happens when workspaces policies query workspace_members while workspace_members
-- policies also query workspaces. Use SECURITY DEFINER helpers to break the cycle.

-- Helper: check if current user is member of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = _workspace_id
      AND wm.profile_id = auth.uid()
  );
$$;

-- Helper: check if current user owns a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_owner(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspaces w
    WHERE w.workspace_id = _workspace_id
      AND w.workspace_owner_id = auth.uid()
  );
$$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop policies that can contribute to recursive evaluation
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_all_owner" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_owner" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_owner" ON workspaces;

DROP POLICY IF EXISTS "members_select" ON workspace_members;
DROP POLICY IF EXISTS "members_insert_owner_or_self" ON workspace_members;
DROP POLICY IF EXISTS "members_update_owner" ON workspace_members;
DROP POLICY IF EXISTS "members_delete_owner" ON workspace_members;
DROP POLICY IF EXISTS "workspace_owners_can_view_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_view_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "members_can_view_other_members" ON workspace_members;
DROP POLICY IF EXISTS "members_can_view_workspace_members" ON workspace_members;

-- Workspaces: owner + member + public can read
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT
  USING (
    workspace_owner_id = auth.uid()
    OR workspace_visibility = 'public'
    OR is_workspace_member(workspace_id)
  );

-- Workspaces: only owner can write
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT
  WITH CHECK (workspace_owner_id = auth.uid());

CREATE POLICY "workspaces_update_owner" ON workspaces
  FOR UPDATE
  USING (workspace_owner_id = auth.uid())
  WITH CHECK (workspace_owner_id = auth.uid());

CREATE POLICY "workspaces_delete_owner" ON workspaces
  FOR DELETE
  USING (workspace_owner_id = auth.uid());

-- Workspace members: own row, owner view, and same-workspace member view
CREATE POLICY "members_select" ON workspace_members
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR is_workspace_owner(workspace_id)
    OR is_workspace_member(workspace_id)
  );

-- Workspace members insert: self join or owner invite
CREATE POLICY "members_insert_owner_or_self" ON workspace_members
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    OR is_workspace_owner(workspace_id)
  );

-- Workspace members update/delete: owner only
CREATE POLICY "members_update_owner" ON workspace_members
  FOR UPDATE
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

CREATE POLICY "members_delete_owner" ON workspace_members
  FOR DELETE
  USING (is_workspace_owner(workspace_id));
