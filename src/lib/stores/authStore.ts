import { create } from 'zustand'

type Profile = {
  profile_id: string
  display_name: string | null
  profile_avatar_url: string | null
  profile_email: string | null
  profile_skills: string[]
  profile_bio: string | null
}

type AuthStore = {
  user: { id: string; email?: string } | null
  profile: Profile | null
  isLoading: boolean
  setUser: (u: AuthStore['user']) => void
  setProfile: (p: Profile | null) => void
  setIsLoading: (v: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, profile: null, isLoading: false }),
}))
