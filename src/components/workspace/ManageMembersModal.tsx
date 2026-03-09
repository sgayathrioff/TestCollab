"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { supabase } from '@/lib/supabase';
import { WorkspaceMember } from '@/types';
import { X, UserPlus, Search, Crown, Shield, Trash2, Mail, Check, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { expandSearchQuery } from '@/lib/conceptExpansion';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: WorkspaceMember[];
  currentUserId?: string;
  ownerId: string;
  canManageMembers: boolean;
  onInviteMember: (email: string) => Promise<void>;
  onRemoveMember: (profileId: string) => Promise<void>;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUserId,
  ownerId,
  canManageMembers,
  onInviteMember,
  onRemoveMember,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Smart search states
  const [findQuery, setFindQuery] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'find' | 'email'>('find');

  // Fetch available profiles on mount (excluding current members)
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchAvailableProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profile_id, display_name, profile_avatar_url, profile_bio, profile_skills, profile_email')
          .limit(100);

        if (error) throw error;

        // Filter out current members
        const memberIds = new Set(members.map(m => m.profile_id));
        const available = (data || []).filter(p => !memberIds.has(p.profile_id));
        setAvailableProfiles(available);
        setFilteredProfiles(available.slice(0, 6)); // Show first 6 by default
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchAvailableProfiles();
  }, [isOpen, members]);

  // Handle smart search
  const handleFindQueryChange = (value: string) => {
    setFindQuery(value);

    if (!value.trim()) {
      setFilteredProfiles(availableProfiles.slice(0, 6));
      return;
    }

    // Expand query terms
    const expandedTerms = expandSearchQuery(value);
    const searchString = expandedTerms.length > 0 ? expandedTerms.join(' | ') : value;

    // Fuse.js search
    const fuse = new Fuse(availableProfiles, {
      keys: [
        { name: 'display_name', weight: 0.7 },
        { name: 'profile_skills', weight: 0.6 },
        { name: 'profile_bio', weight: 0.4 },
      ],
      threshold: 0.4,
      useExtendedSearch: true,
      includeScore: true,
    });

    const results = fuse.search(searchString);
    setFilteredProfiles(results.slice(0, 6).map(r => r.item));
  };

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent, emailOverride?: string) => {
    e.preventDefault();
    const emailToInvite = emailOverride || inviteEmail.trim();
    if (!emailToInvite) return;

    setIsInviting(true);
    setError(null);
    setSuccess(null);

    try {
      await onInviteMember(emailToInvite);
      setSuccess(`Invitation sent to ${emailToInvite}`);
      setInviteEmail('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) return;
    
    try {
      await onRemoveMember(memberId);
      setSuccess(`${memberName} removed successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const filteredMembers = members.filter(member => 
    member.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profile?.profile_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Workspace Members</h2>
            <p className="text-stone-500 text-sm mt-1">Manage access and permissions</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 custom-scrollbar">

          {/* Alert Messages */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
              <button onClick={() => setError(null)} className="ml-auto hover:text-red-800"><X size={14} /></button>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2">
              <Check size={18} />
              {success}
            </div>
          )}

          {/* Tab Switcher */}
          {canManageMembers && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl">
              <button
                onClick={() => setActiveTab('find')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  activeTab === 'find'
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                <Sparkles size={16} />
                Find Collaborators
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  activeTab === 'email'
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                <Mail size={16} />
                Invite by Email
              </button>
            </div>
          )}

          {/* Find Collaborators Section */}
          {canManageMembers && activeTab === 'find' && (
            <div className="space-y-4">
              {/* Smart Search */}
              <div className="relative">
                <Search className="absolute left-4 top-4 text-stone-400" size={18} />
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => handleFindQueryChange(e.target.value)}
                  placeholder='Try "I need someone good at interface design"...'
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-300 focus:bg-white outline-none text-stone-800 placeholder:text-stone-400 font-medium transition-all"
                />
              </div>

              {/* Results */}
              {loadingProfiles ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map((profile) => (
                      <div
                        key={profile.profile_id}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-lime-200 hover:bg-lime-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                            {profile.profile_avatar_url ? (
                              <img src={profile.profile_avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold">
                                {profile.display_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{profile.display_name}</p>
                            {profile.profile_skills && profile.profile_skills.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {profile.profile_skills.slice(0, 3).map((skill: string, idx: number) => (
                                  <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (profile.profile_email) {
                              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                              await handleInviteSubmit(fakeEvent, profile.profile_email);
                            }
                          }}
                          className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          Invite
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      {findQuery ? `No one found matching "${findQuery}"` : 'Type to search for collaborators'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Invite by Email Section */}
          {canManageMembers && activeTab === 'email' && (
            <div className="bg-stone-50 p-1.5 rounded-[24px]">
              <form onSubmit={handleInviteSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Invite by email address..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white rounded-[20px] border-none shadow-sm focus:ring-2 focus:ring-lime-300 outline-none text-stone-800 placeholder:text-stone-400 font-medium transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className={cn(
                    "px-6 rounded-[20px] font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-stone-900/10",
                    isInviting || !inviteEmail 
                      ? "bg-stone-300 cursor-not-allowed" 
                      : "bg-[#1c1917] hover:bg-stone-800 hover:scale-105 active:scale-95"
                  )}
                >
                  {isInviting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span className="hidden sm:inline">Invite</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Members List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                Active Members
                <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full">{members.length}</span>
              </h3>
              
              {/* Search Members */}
              <div className="relative w-48">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                 <input 
                   type="text" 
                   placeholder="Search..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-3 py-1.5 bg-stone-50 rounded-full text-sm font-medium focus:outline-none focus:ring-1 focus:ring-stone-200 transition-all placeholder:text-stone-400"
                 />
              </div>
            </div>

            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isOwner = member.member_role === 'owner';
                const isCurrentUser = member.profile_id === currentUserId;
                const canRemove = canManageMembers && !isOwner && !isCurrentUser;

                return (
                  <div 
                    key={member.profile_id} 
                    className="group flex items-center justify-between p-4 rounded-[24px] border border-stone-100 hover:border-stone-200 hover:shadow-lg hover:shadow-stone-100/50 transition-all bg-white"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                           {member.profile?.profile_avatar_url ? (
                               <img src={member.profile.profile_avatar_url} alt={member.profile.display_name} className="w-full h-full object-cover" />
                           ) : (
                               <span className="text-lg font-bold text-stone-400">
                                   {member.profile?.display_name?.[0]?.toUpperCase() || '?'}
                               </span>
                           )}
                        </div>
                        {isOwner && (
                            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Owner">
                                <Crown size={10} fill="currentColor" />
                            </div>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-stone-900">
                                {member.profile?.display_name || 'Unknown User'}
                            </h4>
                            {isCurrentUser && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                                    You
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-stone-400 font-medium">
                            {member.profile?.profile_email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className={cn(
                           "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                           isOwner 
                            ? "bg-amber-50 text-amber-600 border-amber-100" 
                            : "bg-stone-50 text-stone-500 border-stone-100"
                       )}>
                           {isOwner ? 'Owner' : 'Member'}
                       </div>

                       {canRemove && (
                           <button 
                             onClick={() => handleRemove(member.profile_id, member.profile?.display_name || 'Member')}
                             className="w-8 h-8 flex items-center justify-center rounded-full text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                             title="Remove member"
                           >
                               <Trash2 size={16} />
                           </button>
                       )}
                    </div>
                  </div>
                );
              })}
              
              {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-stone-400 text-sm font-medium">
                      No members found matching "{searchQuery}"
                  </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="px-8 py-4 bg-stone-50 text-xs text-stone-400 font-medium border-t border-stone-100 flex justify-between items-center">
            <span>Only Owners can manage members.</span>
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><Crown size={12} className="text-amber-500" /> Owner</span>
                <span className="flex items-center gap-1.5"><Shield size={12} className="text-stone-400" /> Member</span>
            </div>
        </div>

      </div>
    </div>
  );
};
