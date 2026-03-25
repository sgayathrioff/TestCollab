"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceMember, MemberRole, MemberPermissions, WorkspaceFolder } from "@/types";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { useReferencesStore } from "@/lib/stores/referencesStore";

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
  reference_type: string;
  reference_status?: 'processing' | 'ready' | 'failed';
  reference_metadata: {
    thumbnail?: string;
    source?: string;
    colorPalette?: string[];
  };
  workspace_id: string;
  uploaded_by_profile_id: string;
  reference_created_at: string;
  folder_id?: string | null;
  tags?: Array<{ tag_id: string; tag_name: string; tag_color: string }>;
}

interface WorkspaceOwner {
  profile_id: string;
  display_name: string;
  profile_avatar_url: string;
}

export function useWorkspace(workspaceId: string) {
  const { user } = useAuth();
  const {
    workspace,
    members,
    folders,
    setWorkspace,
    setMembers,
    setFolders,
    setUserRole,
    reset,
  } = useWorkspaceStore();
  const {
    references,
    setReferences,
    addReference: addReferenceState,
    updateReference: updateReferenceState,
    removeReference,
  } = useReferencesStore();
  const [owner, setOwner] = useState<WorkspaceOwner | null>(null);
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      if (!workspaceData) throw new Error('Workspace not found');

      setWorkspace(workspaceData);

      // 2. Fetch workspace owner profile
      const { data: ownerData, error: ownerError } = await supabase
        .from('profiles')
        .select('profile_id, display_name, profile_avatar_url, profile_email')
        .eq('profile_id', workspaceData.workspace_owner_id)
        .single();

      if (ownerError) throw ownerError;
      setOwner(ownerData);

      // 3. Fetch references for this workspace with tags
      const { data: referencesData, error: referencesError } = await supabase
        .from('references')
        .select(`
          *,
          reference_tags!left(
            tags!left(
              tag_id,
              tag_name,
              tag_color
            )
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('reference_created_at', { ascending: false });

      if (referencesError) {
        // Fall back to simple query without tags if join fails
        const { data: simpleData, error: simpleError } = await supabase
          .from('references')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('reference_created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        setReferences(simpleData || []);
        return; // Exit early with simple data
      }
      
      // Transform the nested structure to match our interface
      const transformedReferences = (referencesData || []).map((ref: any) => ({
        ...ref,
        tags: ref.reference_tags?.map((rt: any) => rt.tags).filter(Boolean) || []
      }));
      
      setReferences(transformedReferences);

      // 4. Fetch workspace folders (table may not exist until migration is run)
      try {
        const { data: foldersData, error: foldersError } = await supabase
          .from('workspace_folders')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('folder_created_at', { ascending: true });
        // Silently ignore if table doesn't exist yet (pre-migration)
        setFolders(foldersError ? [] : (foldersData || []));
      } catch {
        setFolders([]);
      }

      // 5. Fetch workspace members
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

      const role = user
        ? (workspaceData.workspace_owner_id === user.id ? 'owner' : allMembers.some(m => m.profile_id === user.id) ? 'viewer' : null)
        : null;
      setUserRole(role as 'owner' | 'editor' | 'viewer' | null);

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
      addReferenceState(data as any);

      // Notify all other workspace members about the new reference
      const otherMembers = members.filter(m => m.profile_id !== user.id);
      if (otherMembers.length > 0 && workspace) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('profile_id', user.id)
          .maybeSingle();
        const actorName = actorProfile?.display_name || 'A workspace member';
        const notifications = otherMembers.map(m => ({
          recipient_profile_id: m.profile_id,
          notification_type: 'reference_added' as const,
          notification_message: `${actorName} added "${referenceData.reference_title}" to ${workspace.workspace_title}`,
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
      removeReference(referenceId);

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
      // Only update fields that exist in the database
      const validUpdates: any = {};
      if (updates.reference_title !== undefined) validUpdates.reference_title = updates.reference_title;
      if (updates.reference_type !== undefined) validUpdates.reference_type = updates.reference_type;
      if (updates.reference_url !== undefined) validUpdates.reference_url = updates.reference_url;
      if (updates.reference_metadata !== undefined) validUpdates.reference_metadata = updates.reference_metadata;

      const { data, error } = await supabase
        .from('references')
        .update(validUpdates)
        .eq('reference_id', referenceId)
        .select()
        .single();

      if (error) throw error;

      // Update local state - preserve existing tags since they're managed separately
      const existing = references.find((ref) => ref.reference_id === referenceId);
      updateReferenceState(referenceId, {
        ...(data as any),
        tags: existing?.tags || [],
      } as any);

      return data;

    } catch (err: any) {
      const errorMessage = err?.message || err?.hint || 'Failed to update reference';
      throw new Error(errorMessage);
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
      setMembers(members.filter(m => m.profile_id !== profileId));
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

  // Create a new folder
  const createFolder = useCallback(async (name: string): Promise<WorkspaceFolder> => {
    if (!user) throw new Error('User not authenticated');
    const permissions = getPermissions();
    if (!permissions.canManageMembers) throw new Error('Only workspace owners can create folders');

    const { data, error } = await supabase
      .from('workspace_folders')
      .insert({ workspace_id: workspaceId, folder_name: name.trim() })
      .select()
      .single();

    if (error) throw error;
    setFolders([...(folders as any), data]);
    return data;
  }, [user, workspaceId, getPermissions, folders, setFolders]);

  // Delete a folder (references become uncategorized)
  const deleteFolder = useCallback(async (folderId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    const permissions = getPermissions();
    if (!permissions.canManageMembers) throw new Error('Only workspace owners can delete folders');

    // Nullify folder_id on all references in this folder
    await supabase
      .from('references')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    const { error } = await supabase
      .from('workspace_folders')
      .delete()
      .eq('folder_id', folderId);

    if (error) throw error;

    setFolders(folders.filter(f => f.folder_id !== folderId));
    setReferences(references.map(r => r.folder_id === folderId ? { ...r, folder_id: null } : r));
  }, [user, getPermissions, folders, references, setFolders, setReferences]);

  // Move a reference into a folder (or remove from folder)
  const moveReference = useCallback(async (referenceId: string, folderId: string | null): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    const permissions = getPermissions();
    if (!permissions.canEdit) throw new Error('You do not have permission to move references');

    const { error } = await supabase
      .from('references')
      .update({ folder_id: folderId })
      .eq('reference_id', referenceId);

    if (error) throw error;

    updateReferenceState(referenceId, { folder_id: folderId });
  }, [user, getPermissions]);

  // Delete entire workspace (owner only)
  const deleteWorkspace = useCallback(async (): Promise<void> => {
    if (!user || !workspace) throw new Error('User not authenticated or workspace not loaded');

    const permissions = getPermissions();
    if (!permissions.canDeleteWorkspace) {
      throw new Error('Only the workspace owner can delete this workspace');
    }

    try {
      // Delete all references files from storage (best effort)
      const storagePaths = references
        .map(r => {
          try {
            const url = new URL(r.reference_url);
            const parts = url.pathname.split('/object/public/');
            return parts[1] ? decodeURIComponent(parts[1]) : null;
          } catch { return null; }
        })
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        await supabase.storage.from('Link-UpWorkpace').remove(storagePaths);
      }

      // Notify all members before deleting
      const otherMembers = members.filter(m => m.profile_id !== user.id);
      if (otherMembers.length > 0) {
        const notifs = otherMembers.map(m => ({
          recipient_profile_id: m.profile_id,
          notification_type: 'workspace_removal' as const,
          notification_message: `The workspace "${workspace.workspace_title}" has been deleted by the owner`,
          notification_link: `/explore`,
        }));
        await supabase.from('notifications').insert(notifs);
      }

      // Delete workspace (cascade deletes members, references, messages in DB)
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  }, [user, workspace, workspaceId, members, references, getPermissions]);

  // Check if current user is owner
  const isOwner = workspace && user && workspace.workspace_owner_id === user.id;

  // Initial data fetch and real-time subscriptions
  useEffect(() => {
    if (!isValidWorkspaceId) return;

    // Initial fetch
    fetchWorkspace();

    // Set up realtime subscriptions
    const referencesChannel = supabase
      .channel(`workspace-references-${workspaceId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'references',
          filter: `workspace_id=eq.${workspaceId}`
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addReferenceState(payload.new as any);
          } else if (payload.eventType === 'DELETE') {
            removeReference(payload.old.reference_id as string);
          } else if (payload.eventType === 'UPDATE') {
            const current = useReferencesStore.getState().references as any[];
            const existing = current.find((ref) => ref.reference_id === payload.new.reference_id);
            updateReferenceState(payload.new.reference_id as string, {
              ...(payload.new as any),
              tags: existing?.tags || [],
            });
          }
        }
      )
      .subscribe();

    const workspaceChannel = supabase
      .channel(`workspace-details-${workspaceId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspaces',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          setWorkspace(payload.new as WorkspaceData);
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel(`workspace-members-${workspaceId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          // Re-fetch workspace data when members change
          // Using a small delay to batch updates
          setTimeout(() => {
            fetchWorkspace();
          }, 500);
        }
      )
      .subscribe();

    const refChannel = supabase
      .channel(`references-${workspaceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'references',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        updateReferenceState(payload.new.reference_id as string, payload.new as any);
      })
      .subscribe();

    return () => {
      // Properly remove all channels
      supabase.removeChannel(referencesChannel);
      supabase.removeChannel(workspaceChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(refChannel);
      reset();
      setReferences([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, isValidWorkspaceId]);

  return {
    // Data
    workspace,
    owner,
    references,
    members,
    folders,
    
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
    deleteWorkspace,

    // Folder management
    createFolder,
    deleteFolder,
    moveReference,
  };
}
