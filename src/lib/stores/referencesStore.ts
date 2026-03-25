import { create } from 'zustand'

type Reference = {
  reference_id: string
  workspace_id: string
  uploaded_by_profile_id: string
  reference_title: string
  reference_type: 'audio' | 'video' | 'document' | 'image' | 'link'
  reference_url: string
  reference_status?: 'processing' | 'ready' | 'failed'
  reference_metadata?: Record<string, any>
  reference_created_at?: string
  folder_id?: string | null
}

type ReferencesStore = {
  references: Reference[]
  setReferences: (refs: Reference[]) => void
  addReference: (ref: Reference) => void
  updateReference: (reference_id: string, updates: Partial<Reference>) => void
  removeReference: (reference_id: string) => void
}

export const useReferencesStore = create<ReferencesStore>((set) => ({
  references: [],
  setReferences: (references) => set({ references }),
  addReference: (ref) => set((state) => ({
    references: state.references.some(r => r.reference_id === ref.reference_id)
      ? state.references
      : [...state.references, ref],
  })),
  updateReference: (reference_id, updates) => set((state) => ({
    references: state.references.map(r =>
      r.reference_id === reference_id ? { ...r, ...updates } : r
    ),
  })),
  removeReference: (reference_id) => set((state) => ({
    references: state.references.filter(r => r.reference_id !== reference_id),
  })),
}))
