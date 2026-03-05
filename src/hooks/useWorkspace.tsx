"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceMember, MemberRole, MemberPermissions } from "@/types";

interface WorkspaceData {
  workspace_id: string;
  workspace_title: string;
  workspace_description: string;
  workspace_owner_id: string;
  workspace_visibility: string;
  workspace_created_at: string;
}

interface ReferenceData {
  reference_id: string;
  reference_title: string;
  reference_url: string;
  reference_thumbnail: string;
  reference_source: string;
  reference_tags: string[];
  reference_type: string;
  reference_category: string;
  workspace_id: string;
  reference_created_at: string;
}

interface WorkspaceOwner {
  profile_id: string;
  display_name: string;
  profile_avatar_url: string;
}

export function useWorkspace(workspaceId: string) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [owner, setOwner] = useState<WorkspaceOwner | null>(null);
  const [references, setReferences] = useState<ReferenceData[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skip all operations if no valid workspace ID
  const isValidWorkspaceId = workspaceId && workspaceId !== "skip" && workspaceId.trim() !== "";

  // Get current user's role in workspace
  const getCurrentUserRole = (): MemberRole | null => {
    if (!user || !workspace || !isValidWorkspaceId) return null;
    
    if (workspace.workspace_owner_id === user.id) {
      return 'owner';
    }
    
    const memberRecord = members.find(m => m.profile_id === user.id);
    return memberRecord?.member_role || null;
  };

  // Get permissions for current user
  // Simplified: owner and member can both edit, only owner can manage members
  // Public workspaces allow anyone to view
  const getPermissions = (): MemberPermissions => {
    const role = getCurrentUserRole();
    const isPublic = workspace?.workspace_visibility === 'public';
    
    // Owner: full access
    if (role === 'owner') {
      return {
        canView: true,
        canEdit: true,
        canManageMembers: true,
        canDeleteWorkspace: true,
      };
    }
    
    // Member: can view and edit, but not manage members
    if (role === 'member') {
      return {
        canView: true,
        canEdit: true,
        canManageMembers: false,
        canDeleteWorkspace: false,
      };
    }
    
    // Not a member: can only view if public
    return {
      canView: isPublic,
      canEdit: false,
      canManageMembers: false,
      canDeleteWorkspace: false,
    };
  };

  // Fetch workspace data
  const fetchWorkspace = useCallback(async () => {
    if (!isValidWorkspaceId) {
      console.log('No valid workspaceId provided to fetchWorkspace:', workspaceId);
      setLoading(false);
      return;
    }

    console.log('Fetching workspace:', workspaceId);
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch workspace details
      console.log('Fetching workspace details...');
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (workspaceError) {
        console.error('Workspace query error:', workspaceError);
        throw workspaceError;
      }
      if (!workspaceData) throw new Error('Workspace not found');

      console.log('Workspace data:', workspaceData);
      setWorkspace(workspaceData);

      // 2. Fetch workspace owner profile
      console.log('Fetching owner profile...');
      const { data: ownerData, error: ownerError } = await supabase
        .from('profiles')
        .select('profile_id, display_name, profile_avatar_url')
        .eq('profile_id', workspaceData.workspace_owner_id)
        .single();

      if (ownerError) {
        console.error('Owner query error:', ownerError);
        throw ownerError;
      }
      console.log('Owner data:', ownerData);
      setOwner(ownerData);

      // 3. Fetch references for this workspace
      console.log('Fetching references...');
      const { data: referencesData, error: referencesError } = await supabase
        .from('references')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('reference_created_at', { ascending: false });

      if (referencesError) {
        console.error('References query error:', referencesError);
        throw referencesError;
      }
      console.log('References data:', referencesData?.length || 0, 'references');
      setReferences(referencesData || []);

      // 4. Fetch workspace members
      console.log('Fetching workspace members...');
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (membersError) {
        console.error('Members query error:', membersError);
        // Don't throw - just log and continue with owner as sole member
      }

      // Get profile IDs for all members
      const memberProfileIds = membersData?.map(m => m.profile_id) || [];
      
      // Fetch profiles for all members
      let memberProfiles: any[] = [];
      if (memberProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('profile_id, display_name, profile_avatar_url, profile_email')
          .in('profile_id', memberProfileIds);
        memberProfiles = profiles || [];
      }

      // Create profile map for easy lookup
      const profileMap = new Map(memberProfiles.map(p => [p.profile_id, p]));

      // Build members list with profiles
      const membersWithProfiles: WorkspaceMember[] = (membersData || []).map(member => ({
        ...member,
        profile: profileMap.get(member.profile_id) || {
          profile_id: member.profile_id,
          display_name: 'Unknown User',
          profile_avatar_url: '',
          profile_email: ''
        }
      }));

      // Always include the workspace owner
      const ownerMember: WorkspaceMember = {
        workspace_id: workspaceId,
        profile_id: workspaceData.workspace_owner_id,
        member_role: 'owner' as MemberRole,
        member_joined_at: workspaceData.workspace_created_at || new Date().toISOString(),
        profile: {
          profile_id: workspaceData.workspace_owner_id,
          display_name: ownerData?.display_name || 'Workspace Owner',
          profile_avatar_url: ownerData?.profile_avatar_url || '',
          profile_email: ownerData?.profile_email || ''
        }
      };

      // Combine owner with other members (avoiding duplicates)
      const allMembers = [ownerMember, ...membersWithProfiles.filter(m => m.profile_id !== workspaceData.workspace_owner_id)];
      setMembers(allMembers);
      console.log('Members loaded:', allMembers.length);

    } catch (err: any) {
      console.error('Error fetching workspace:', err);
      setError(err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, isValidWorkspaceId]);

  // Add a new reference
  const addReference = useCallback(async (referenceData: Omit<ReferenceData, 'reference_id' | 'reference_created_at'>) => {
    if (!user) throw new Error('User not authenticated');

    const permissions = getPermissions();
    if (!permissions.canEdit) {
      throw new Error('You do not have permission to add references');
    }

    try {
      const { data, error } = await supabase
        .from('references')
        .insert({
          ...referenceData,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setReferences(prev => [data, ...prev]);

      // Notify all other workspace members about the new reference
      const otherMembers = members.filter(m => m.profile_id !== user.id);
      if (otherMembers.length > 0 && workspace) {
        const notifications = otherMembers.map(m => ({
          recipient_profile_id: m.profile_id,
          notification_type: 'reference_added' as const,
          notification_message: `A new reference "${referenceData.reference_title}" was added to ${workspace.workspace_title}`,
          notification_link: `/workspace/${workspaceId}`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      return data;

    } catch (err: any) {
      console.error('Error adding reference:', err);
      throw err;
    }
  }, [user, workspaceId, workspace, members, getPermissions]);

  // Delete reference
  const deleteReference = useCallback(async (referenceId: string) => {
    if (!user) throw new Error('User not authenticated');

    const permissions = getPermissions();
    if (!permissions.canEdit) {
      throw new Error('You do not have permission to delete references');
    }

    try {
      const { error } = await supabase
        .from('references')
        .delete()
        .eq('reference_id', referenceId);

      if (error) throw error;

      // Update local state
      setReferences(prev => prev.filter(ref => ref.reference_id !== referenceId));

    } catch (err: any) {
      console.error('Error deleting reference:', err);
      throw err;
    }
  }, [user, getPermissions]);

  // Update reference
  const updateReference = useCallback(async (referenceId: string, updates: Partial<ReferenceData>) => {
    if (!user) throw new Error('User not authenticated');

    const permissions = getPermissions();
    if (!permissions.canEdit) {
      throw new Error('You do not have permission to update references');
    }

    try {
      const { data, error } = await supabase
        .from('references')
        .update(updates)
        .eq('reference_id', referenceId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setReferences(prev => 
        prev.map(ref => ref.reference_id === referenceId ? data : ref)
      );

      return data;

    } catch (err: any) {
      console.error('Error updating reference:', err);
      throw err;
    }
  }, [user, getPermissions]);

  // Update workspace details
  const updateWorkspace = useCallback(async (updates: Partial<WorkspaceData>) => {
    if (!user || !workspace) throw new Error('User not authenticated or workspace not loaded');
    
    const permissions = getPermissions();
    if (!permissions.canEdit) {
      throw new Error('You do not have permission to edit this workspace');
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      setWorkspace(data);

      // Notify all members (excluding the owner who made the change) about the update
      const otherMembers = members.filter(m => m.profile_id !== user.id);
      if (otherMembers.length > 0) {
        const notifTitle = data?.workspace_title ?? workspace.workspace_title;
        const notifs = otherMembers.map(m => ({
          recipient_profile_id: m.profile_id,
          notification_type: 'workspace_updated' as const,
          notification_message: `"${notifTitle}" workspace details have been updated`,
          notification_link: `/workspace/${workspaceId}`,
        }));
        await supabase.from('notifications').insert(notifs);
      }

      return data;

    } catch (err: any) {
      console.error('Error updating workspace:', err);
      throw err;
    }
  }, [user, workspace, workspaceId, members]);

  // Member management functions
  // Add a member (always as 'member' role - simplified)
  const addMember = useCallback(async (profileId: string): Promise<void> => {
    if (!user || !workspace) throw new Error('User not authenticated or workspace not loaded');
    
    const permissions = getPermissions();
    if (!permissions.canManageMembers) {
      throw new Error('Only workspace owners can add members');
    }

    // Check if user is already a member
    const existingMember = members.find(m => m.profile_id === profileId);
    if (existingMember) {
      throw new Error('User is already a member of this workspace');
    }

    // Can't add owner as member
    if (profileId === workspace.workspace_owner_id) {
      throw new Error('Owner is already part of the workspace');
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          profile_id: profileId,
          member_role: 'member',
          member_joined_at: new Date().toISOString()
        });

      if (error) throw error;

      // Notify the new member
      await supabase.from('notifications').insert({
        recipient_profile_id: profileId,
        notification_type: 'workspace_invite',
        notification_message: `You have been added to ${workspace.workspace_title} as a member`,
        notification_link: `/workspace/${workspaceId}`,
      });

      // Notify existing members that someone new joined
      const existingOtherMembers = members.filter(
        m => m.profile_id !== profileId && m.profile_id !== user.id
      );
      if (existingOtherMembers.length > 0) {
        const joinNotifs = existingOtherMembers.map(m => ({
          recipient_profile_id: m.profile_id,
          notification_type: 'member_joined' as const,
          notification_message: `A new member joined ${workspace.workspace_title}`,
          notification_link: `/workspace/${workspaceId}`,
        }));
        await supabase.from('notifications').insert(joinNotifs);
      }

      // Refetch to update members list
      await fetchWorkspace();
    } catch (err: any) {
      console.error('Error adding member:', err);
      throw err;
    }
  }, [user, workspace, workspaceId, members, getPermissions, fetchWorkspace]);

  const removeMember = useCallback(async (profileId: string): Promise<void> => {
    if (!user || !workspace) throw new Error('User not authenticated or workspace not loaded');
    
    // Can't remove the owner
    if (profileId === workspace.workspace_owner_id) {
      throw new Error('Cannot remove the workspace owner');
    }

    const permissions = getPermissions();
    // Allow users to remove themselves, or owners to remove anyone
    if (!permissions.canManageMembers && profileId !== user.id) {
      throw new Error('Only workspace owners can remove members');
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId);

      if (error) throw error;

      // Add notification only if removed by someone else
      if (profileId !== user.id) {
        await supabase.from('notifications').insert({
          recipient_profile_id: profileId,
          notification_type: 'workspace_removal',
          notification_message: `You have been removed from ${workspace.workspace_title}`,
          notification_link: `/explore`,
        });
      }

      // Update local state
      setMembers(prev => prev.filter(m => m.profile_id !== profileId));
    } catch (err: any) {
      console.error('Error removing member:', err);
      throw err;
    }
  }, [user, workspace, workspaceId, getPermissions]);

  // Invite member by email (always adds as 'member')
  const inviteMemberByEmail = useCallback(async (email: string): Promise<void> => {
    if (!user || !workspace) throw new Error('User not authenticated or workspace not loaded');
    
    const permissions = getPermissions();
    if (!permissions.canManageMembers) {
      throw new Error('Only workspace owners can invite members');
    }

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('profile_id')
        .eq('profile_email', email.toLowerCase().trim())
        .single();

      if (profileError || !profile) {
        throw new Error('User not found with that email address');
      }

      // Add them as a member
      await addMember(profile.profile_id);
    } catch (err: any) {
      console.error('Error inviting member by email:', err);
      throw err;
    }
  }, [user, workspace, getPermissions, addMember]);

  // Check if current user is owner
  const isOwner = workspace && user && workspace.workspace_owner_id === user.id;

  // Set up real-time subscriptions
  useEffect(() => {
    if (!workspaceId) return;

    console.log('Setting up real-time subscriptions for:', workspaceId);

    // Subscribe to references changes
    const referencesSubscription = supabase
      .channel(`references:workspace_id=eq.${workspaceId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'references',
          filter: `workspace_id=eq.${workspaceId}`
        }, 
        (payload) => {
          console.log('References change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setReferences(prev => [payload.new as ReferenceData, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setReferences(prev => prev.filter(ref => ref.reference_id !== payload.old.reference_id));
          } else if (payload.eventType === 'UPDATE') {
            setReferences(prev => 
              prev.map(ref => ref.reference_id === payload.new.reference_id ? payload.new as ReferenceData : ref)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to workspace changes
    const workspaceSubscription = supabase
      .channel(`workspace:workspace_id=eq.${workspaceId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspaces',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          console.log('Workspace change received:', payload);
          setWorkspace(payload.new as WorkspaceData);
        }
      )
      .subscribe();

    // Subscribe to workspace members changes
    const membersSubscription = supabase
      .channel(`workspace_members:workspace_id=eq.${workspaceId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          console.log('Members change received:', payload);
          fetchWorkspace();
        }
      )
      .subscribe();

    return () => {
      referencesSubscription.unsubscribe();
      workspaceSubscription.unsubscribe();
      membersSubscription.unsubscribe();
    };
  }, [workspaceId, isValidWorkspaceId, fetchWorkspace]);

  // Initial data fetch
  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return {
    // Data
    workspace,
    owner,
    references,
    members,
    
    // State
    loading,
    error,
    isOwner,
    
    // User role and permissions
    getCurrentUserRole,
    getPermissions,
    
    // Actions
    addReference,
    deleteReference,
    updateReference,
    updateWorkspace,
    refetch: fetchWorkspace,
    
    // Member management
    addMember,
    removeMember,
    inviteMemberByEmail,
  };
}
