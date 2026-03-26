# COLLABIO PROJECT CONTEXT

### 1. Project Overview
Collabio is a visual workspace and reference management platform designed for creatives and teams. It allows users to create themed workspaces, collect references (images, videos, links, documents), organize them into folders and tags, and collaborate in real-time through chat and shared workspace access.

### 2. Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, PostCSS
- **Database & Auth**: Supabase (@supabase/ssr, @supabase/supabase-js)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Utilities**: Fuse.js (fuzzy search), date-fns, clsx, tailwind-merge
- **Font**: Outfit (Google Fonts)

### 3. All Pages and Routes
- `/` - Landing page with hero section, features, and stats. (Public)
- `/login` - User sign-in page. (Public)
- `/signup` - User registration page. (Public)
- `/auth/callback` - Supabase PKCE auth callback handler. (Public)
- `/dashboard/[id]` - User's main dashboard showing personal and shared workspaces. (Protected) - Reads `workspaces`, `workspace_members`.
- `/workspace/[id]` - The main workspace view with references, folders, and chat. (Protected/Public depending on ws settings) - Reads `workspaces`, `references`, `workspace_members`, `workspace_folders`.
- `/workspace/[id]/settings` - Workspace configuration (general settings, members, activity). (Protected/Owner Only) - Writes `workspaces`, `workspace_members`.
- `/explore` - Public exploration page for trending workspaces and creators. (Public) - Reads `workspaces`, `profiles`.
- `/search` - Global search for workspaces, references, and people. (Public/Mixed) - Reads `workspaces`, `profiles`, `references`.
- `/profile/[id]` - Public user profile showing their public workspaces and bio. (Public) - Reads `profiles`, `workspaces`.
- `/profile/setup` - Initial user profile setup and editing. (Protected) - Writes `profiles`.
- `/api/import-url` - Backend route for fetching metadata and uploading media from a remote URL. (Protected) - Writes `Link-UpWorkpace` bucket.

### 4. All Features
- **Authentication**: Email/Password login and signup via Supabase Auth.
- **Workspace Management**: Create, edit, archive, and delete workspaces with custom titles and privacy settings.
- **Reference Collection**: Import references via URL (automated metadata/media extraction) or manual upload.
- **Dynamic Organization**: Organize references using nested folders and multi-select tags.
- **Real-time Collaboration**: Dedicated workspace chat with presence indicators and live message updates.
- **Member Permissions**: Role-based access control (Owner, Member, Viewer) for workspace collaboration.
- **Activity Tracking**: Logging of workspace actions (adding/deletes) visible in an activity log.
- **Global Search**: Fuzzy search across workspaces, references, and user profiles using Fuse.js.
- **Explore Community**: Discover public workspaces and follow other creators.
- **Notifications**: Real-time alerts for invitations, new references, and workspace updates.

### 5. All Components
- **Workspace Sidebar**: Navigation for folders, tags, and workspace members with filtering capabilities.
- **Workspace Header**: Display workspace metadata, member avatars, and primary action buttons.
- **Reference Card**: Visual representation of a reference with type-specific icons and metadata previews.
- **Workspace Chat**: Real-time messaging interface with member list and online status indicators.
- **Add/Edit Reference Modal**: Forms for adding new content or modifying existing references.
- **Manage Members Modal**: Owner interface for inviting, removing, or changing roles of workspace members.
- **Create Workspace Modal**: Simple modal for initializing a new flow/workspace.
- **Activity Log Drawer**: Side panel showing a chronologial list of workspace events.
- **Notification Bell**: Dropdown for viewing and managing user notifications.
- **Explore Search Bar**: Top navigation component with filter tabs for the Explore page.
- **Tag Manager**: Interface for creating and assigning tags to references.
- **Toast**: Application-wide notification system for feedback (success, error).

### 6. All Hooks and Utilities
- `useAuth`: Manages user session, profile loading, and sign-out logic.
- `useWorkspace`: Core hook for workspace data, permissions, and CRUD operations (references, folders, members).
- `useNotifications`: Handles real-time notification fetching and management.
- `useFollow`: Manages creator following/unfollowing logic.
- `authStore`: Zustand store for current user and profile state.
- `workspaceStore`: Zustand store for current workspace, members, and folders.
- `referencesStore`: Zustand store for workspace references.
- `notificationsStore`: Zustand store for user notifications.
- `getFileTypeFromUrl`: Utility to detect file category from URL patterns or extensions.
- `detectPlatform`: Identifies social/media platforms (YouTube, Instagram, etc.) from URLs.
- `expandSearchQuery`: Lightweight "AI" utility that expands search terms based on a concept map.

### 7. Database Tables in Use
- `profiles`: User profile data (id, display_name, bio, avatar, skills). (Select, Insert, Update)
- `workspaces`: Workspace metadata and owner information. (Select, Insert, Update, Delete)
- `workspace_members`: Junction table for users and workspaces with roles. (Select, Insert, Update, Delete)
- `references`: Individual items (links, media) within a workspace. (Select, Insert, Update, Delete)
- `workspace_folders`: Folder structure within workspaces. (Select, Insert, Delete)
- `messages`: Real-time chat messages. (Select, Insert, Realtime)
- `notifications`: User-specific alerts. (Select, Insert, Update, Delete, Realtime)
- `activity_logs`: Audit trail for workspace changes. (Select, Insert)
- `tags`: Global or workspace-specific tags (linked via reference_tags). (Select, Insert)

### 8. Auth Flow
- **Signup**: User enters email/password -> confirmation email sent -> confirm link redirects to `/auth/callback`.
- **Login**: User authenticates -> session established -> redirect to `/dashboard/[id]`.
- **Session Handling**: Managed via `@supabase/ssr` with cookies for server-side validation and `onAuthStateChange` for client-side state.
- **Profile Setup**: New users are redirected to `/profile/setup` to complete their profile (display name, bio, skills).
- **Protected Routes**: Middleware (`middleware.ts`) protects `/dashboard`, `/workspace`, and `/profile` routes, redirecting unauthenticated users to `/login`.

### 9. Known Issues
- Cover images for workspace cards currently use placeholder Unsplash URLs.
- Storage cleanup for deleted references is "best effort" and may leave orphaned files.
- Some complex database joins (references with tags) have simple fallbacks if the join fails.
