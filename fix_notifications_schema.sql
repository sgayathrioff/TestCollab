-- FIX: Drop the table first to fix the incorrect schema (wrong foreign keys)
DROP TABLE IF EXISTS notifications;

-- RECREATE notifications table with CORRECT foreign key references
-- The previous version used 'id' but the actual primary keys are 'profile_id' and 'workspace_id'
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Corrected: references profiles(profile_id) instead of profiles(id)
  recipient_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
  -- Corrected: references profiles(profile_id) instead of profiles(id)
  sender_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  -- Corrected: references workspaces(workspace_id) instead of workspaces(id)
  workspace_id UUID REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('workspace_invite', 'workspace_removal')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- 2. Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- 3. Users can insert notifications (sender must be the authenticated user)
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
