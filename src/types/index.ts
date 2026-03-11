export interface User {
  userId: string;
  email: string;
  displayName: string;
  skills: string[];
  bio?: string;
  photoUrl?: string;
}

export interface Workspace {
  wsId: string;
  title: string;
  ownerId: string;
  description?: string;
  privacy: 'public' | 'private';
  members: Record<string, 'owner' | 'member'>;
  createdAt: number;
}

export interface WorkspaceMember {
  workspace_id: string;
  profile_id: string;
  member_role: 'owner' | 'member';
  member_joined_at: string;
  profile?: {
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
    profile_email?: string;
  };
}

// Simplified: just owner and member
export type MemberRole = 'owner' | 'member';

export interface MemberPermissions {
  canView: boolean;
  canEdit: boolean;           // Add/edit/delete references
  canManageMembers: boolean;  // Invite/remove members
  canDeleteWorkspace: boolean;
}

export interface Reference {
  refId: string;
  wsId: string;
  url: string;
  title?: string;
  mediaType: 'video' | 'pdf' | 'image' | 'link';
  tags: string[];
  storagePath?: string; 
  createdAt: number;
}

export interface WorkspaceFolder {
  folder_id: string;
  workspace_id: string;
  folder_name: string;
  folder_created_at: string;
}

export interface ReferenceData {
  reference_id: string;
  reference_title: string;
  reference_url: string;
  reference_type: string;
  reference_metadata: {
    thumbnail?: string;
    source?: string;
    colorPalette?: string[];
  };
  workspace_id: string;
  uploaded_by_profile_id: string;
  reference_created_at: string;
  folder_id?: string | null;
  // Tags loaded separately via join
  tags?: Array<{ tag_id: string; tag_name: string; tag_color: string }>;
}

// A filter that can target: everything, a folder (optionally a sub-type), or uncategorized
export type FolderFilter =
  | null // All references
  | { type: 'folder'; folderId: string; subType?: string }
  | { type: 'uncategorized' };

export interface Message {
  id: string;
  workspaceId: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export interface Notification {
  notification_id: string;
  recipient_profile_id: string;
  notification_type: 'workspace_invite' | 'workspace_removal' | 'reference_added' | 'member_joined' | 'workspace_updated';
  notification_message: string;
  notification_link?: string;
  notification_is_read: boolean;
  notification_created_at: string;
  sender_name?: string;
  workspace_title?: string;
}
