import { create } from 'zustand'

type WorkspaceMember = {
  profile_id: string
  member_role: 'owner' | 'editor' | 'viewer'
  profiles?: { display_name: string | null; profile_avatar_url: string | null; profile_email: string | null }
}

type Folder = {
  folder_id: string
  folder_name: string
  workspace_id: string
}

type Workspace = {
  workspace_id: string
  workspace_title: string
  workspace_description: string | null
  workspace_visibility: 'public' | 'private'
  workspace_owner_id: string
  is_archived: boolean
}

type WorkspaceStore = {
  workspace: Workspace | null
  members: WorkspaceMember[]
  folders: Folder[]
  userRole: 'owner' | 'editor' | 'viewer' | null
  setWorkspace: (w: Workspace | null) => void
  setMembers: (m: WorkspaceMember[]) => void
  setFolders: (f: Folder[]) => void
  setUserRole: (r: WorkspaceStore['userRole']) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspace: null,
  members: [],
  folders: [],
  userRole: null,
  setWorkspace: (workspace) => set({ workspace }),
  setMembers: (members) => set({ members }),
  setFolders: (folders) => set({ folders }),
  setUserRole: (userRole) => set({ userRole }),
  reset: () => set({ workspace: null, members: [], folders: [], userRole: null }),
}))
