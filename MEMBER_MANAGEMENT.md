# Workspace Member Management Feature

This document explains the newly implemented workspace member management feature that allows workspace owners to add collaborators with role-based permissions.

## Features Implemented

### 1. Role-Based Permission System

Three roles are supported:
- **Owner**: Full control over workspace and members
- **Editor**: Can add, edit, and delete references  
- **Viewer**: Can only view references

### 2. Member Management Functions

The updated `useWorkspace` hook provides:

```typescript
// Add a member to the workspace
await addMember(profileId: string, role: MemberRole = 'viewer')

// Remove a member from the workspace  
await removeMember(profileId: string)

// Update a member's role
await updateMemberRole(profileId: string, newRole: MemberRole)

// Invite a member by email
await inviteMemberByEmail(email: string, role: MemberRole = 'viewer')

// Get current user's role
const role = getCurrentUserRole() // 'owner' | 'editor' | 'viewer' | null

// Get current user's permissions
const permissions = getPermissions()
// Returns: { canEditWorkspace, canAddReferences, canDeleteReferences, canUpdateReferences, canManageMembers, canChangeRoles, canDeleteWorkspace }
```

### 3. UI Components

#### ManageMembersModal
A comprehensive modal for managing workspace members:
- Invite new members by email
- Change member roles
- Remove members  
- View member information
- Role-based permission descriptions

#### Updated Workspace Page
- **Manage Members** floating button (owner only)
- Permission-based access to all reference operations
- Dynamic button positioning based on user permissions
- Member-based chat access

### 4. Database Integration

The feature integrates with the existing database schema:

```sql
-- Workspace members table with role constraints
workspace_members (
  workspace_id UUID REFERENCES workspaces(workspace_id),
  profile_id UUID REFERENCES profiles(profile_id), 
  member_role TEXT CHECK (member_role IN ('owner', 'editor', 'viewer')),
  member_joined_at TIMESTAMPTZ DEFAULT now()
)
```

### 5. Real-time Updates

- Real-time synchronization of member changes
- Automatic permission updates when roles change
- Live member list updates in the modal

## Usage Example

```typescript
// In a workspace page component
function WorkspacePage({ workspaceId }: { workspaceId: string }) {
  const {
    members,
    getPermissions,
    addMember,
    removeMember, 
    updateMemberRole,
    inviteMemberByEmail
  } = useWorkspace(workspaceId);
  
  const permissions = getPermissions();
  
  // Only show member management if user has permission
  if (permissions.canManageMembers) {
    return (
      <ManageMembersModal
        isOpen={isOpen}
        onClose={onClose}
        members={members}
        currentUserId={user?.id}
        canManageMembers={permissions.canManageMembers}
        canChangeRoles={permissions.canChangeRoles}
        onInviteMember={inviteMemberByEmail}
        onRemoveMember={removeMember}
        onUpdateMemberRole={updateMemberRole}
      />
    );
  }
}
```

## Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|---------|---------|
| View references | ✅ | ✅ | ✅ |
| Add references | ✅ | ✅ | ❌ |
| Edit references | ✅ | ✅ | ❌ |
| Delete references | ✅ | ✅ | ❌ |
| Edit workspace | ✅ | ✅ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

## Security Features

- Row Level Security (RLS) policies enforce database-level permissions
- Frontend permission checks prevent unauthorized actions
- Cannot remove workspace owner
- Cannot change your own role 
- Cannot change owner role
- Email validation for member invitations

## Error Handling

The system includes comprehensive error handling:
- Invalid email addresses
- Users not found in system
- Duplicate member invitations  
- Permission violations
- Database constraint violations

All errors are displayed in the UI with clear, actionable messages.