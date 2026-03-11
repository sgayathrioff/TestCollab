"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, MessageCircle, Users, RefreshCw, WifiOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface Message {
  message_id: string;
  sender_profile_id: string;
  message_content: string;
  message_created_at: string;
  sender?: {
    display_name: string;
    profile_avatar_url: string;
  };
}

interface Member {
  profile_id: string;
  display_name: string;
  profile_avatar_url: string;
  member_role: string;
}

type RealtimeStatus = "connecting" | "connected" | "disconnected";

interface WorkspaceChatProps {
  workspaceId: string;
  currentUserId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceChat({
  workspaceId,
  currentUserId,
  isOpen,
  onClose,
}: WorkspaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "members">("chat");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");

  // Profile cache — avoids re-fetching the same sender on every incoming message
  const profileCache = useRef<Map<string, { display_name: string; profile_avatar_url: string }>>(new Map());
  // Seen message IDs — prevents duplicates from optimistic updates + realtime events
  const seenMessageIds = useRef<Set<string>>(new Set());

  const resolveProfile = useCallback(async (profileId: string) => {
    if (profileCache.current.has(profileId)) return profileCache.current.get(profileId)!;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, profile_avatar_url")
      .eq("profile_id", profileId)
      .single();
    if (data) {
      const profile = { display_name: data.display_name || "Unknown", profile_avatar_url: data.profile_avatar_url || "" };
      profileCache.current.set(profileId, profile);
      return profile;
    }
    return undefined;
  }, []);

  // Check if user is a member of this workspace
  const checkMembership = useCallback(async () => {
    if (!currentUserId || !workspaceId) {
      setIsMember(false);
      return;
    }

    // Check if user is owner
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("workspace_owner_id")
      .eq("workspace_id", workspaceId)
      .single();

    if (workspace?.workspace_owner_id === currentUserId) {
      setIsMember(true);
      return;
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", currentUserId)
      .maybeSingle();

    setIsMember(!!membership);
  }, [currentUserId, workspaceId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("message_created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      if (messagesData && messagesData.length > 0) {
        // Fetch sender profiles
        const senderIds = [...new Set(messagesData.map((m) => m.sender_profile_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("profile_id, display_name, profile_avatar_url")
          .in("profile_id", senderIds);

        // Populate profile cache from the batch fetch
        profiles?.forEach((p) =>
          profileCache.current.set(p.profile_id, {
            display_name: p.display_name || "Unknown",
            profile_avatar_url: p.profile_avatar_url || "",
          })
        );

        const messagesWithSenders = messagesData.map((msg) => ({
          ...msg,
          sender: profileCache.current.get(msg.sender_profile_id),
        }));

        // Reset seen IDs from the fresh fetch to avoid ghost duplicates on re-open
        seenMessageIds.current = new Set(messagesWithSenders.map((m) => m.message_id));
        setMessages(messagesWithSenders);
      } else {
        seenMessageIds.current = new Set();
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;

    try {
      // Get owner
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("workspace_owner_id")
        .eq("workspace_id", workspaceId)
        .single();

      // Get members
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("profile_id, member_role")
        .eq("workspace_id", workspaceId);

      // Get all profile IDs (owner + members)
      const profileIds = [
        workspace?.workspace_owner_id,
        ...(membersData?.map((m) => m.profile_id) || []),
      ].filter(Boolean);

      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("profile_id, display_name, profile_avatar_url")
          .in("profile_id", profileIds);

        const memberRoleMap = new Map(
          membersData?.map((m) => [m.profile_id, m.member_role]) || []
        );

        const membersWithProfiles: Member[] =
          profiles?.map((p) => ({
            profile_id: p.profile_id,
            display_name: p.display_name || "Unknown User",
            profile_avatar_url: p.profile_avatar_url || "",
            member_role:
              p.profile_id === workspace?.workspace_owner_id
                ? "owner"
                : memberRoleMap.get(p.profile_id) || "member",
          })) || [];

        // Sort: owner first, then by name
        membersWithProfiles.sort((a, b) => {
          if (a.member_role === "owner") return -1;
          if (b.member_role === "owner") return 1;
          return a.display_name.localeCompare(b.display_name);
        });

        setMembers(membersWithProfiles);
      }
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, [workspaceId]);

  // Send message
  const handleSendMessage = async (content: string) => {
    setSendError(null);
    
    if (!currentUserId) {
      setSendError("Please sign in to send messages");
      return;
    }
    if (!workspaceId) {
      setSendError("Workspace not found");
      return;
    }
    if (!isMember) {
      setSendError("Only workspace members can send messages");
      return;
    }

    setSending(true);
    
    try {
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert({
          workspace_id: workspaceId,
          sender_profile_id: currentUserId,
          message_content: content,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error sending message:", error);
        // Common error: table doesn't exist or RLS policy blocks
        if (error.code === "42P01") {
          setSendError("Chat is not configured. Please contact the administrator.");
        } else if (error.code === "42501") {
          setSendError("Permission denied. You may not have access to send messages.");
        } else {
          setSendError(error.message || "Failed to send message");
        }
        return;
      }

      // Optimistically add message — mark as seen so realtime doesn't duplicate it
      if (newMessage) {
        seenMessageIds.current.add(newMessage.message_id);
        const sender = await resolveProfile(currentUserId);
        setMessages((prev) => [...prev, { ...newMessage, sender }]);
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setSendError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isOpen && workspaceId) {
      checkMembership();
      fetchMessages();
      fetchMembers();
    }
  }, [isOpen, workspaceId, checkMembership, fetchMessages, fetchMembers]);

  // Real-time subscription with status tracking and deduplication
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`workspace-chat-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Skip if already in state (covers own optimistic updates)
          if (seenMessageIds.current.has(newMessage.message_id)) return;
          seenMessageIds.current.add(newMessage.message_id);

          // Show immediately with cached profile (may be undefined, will update below)
          const cachedProfile = profileCache.current.get(newMessage.sender_profile_id);
          setMessages((prev) => [...prev, { ...newMessage, sender: cachedProfile }]);

          // Enrich with sender profile if not cached
          if (!cachedProfile) {
            const profile = await resolveProfile(newMessage.sender_profile_id);
            if (profile) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.message_id === newMessage.message_id ? { ...msg, sender: profile } : msg
                )
              );
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("disconnected");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, workspaceId, resolveProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-[#1c1917] text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "bg-[#1c1917] text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({members.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Realtime status indicator */}
          {activeTab === "chat" && (
            <div className="flex items-center gap-1.5">
              {realtimeStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs text-lime-600 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                  </span>
                  Live
                </span>
              )}
              {realtimeStatus === "connecting" && (
                <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Connecting
                </span>
              )}
              {realtimeStatus === "disconnected" && (
                <button
                  onClick={fetchMessages}
                  className="flex items-center gap-1 text-xs text-red-500 font-medium hover:text-red-700"
                  title="Click to reload messages"
                >
                  <WifiOff className="w-3 h-3" />
                  Reconnect
                </button>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "chat" ? (
        <>
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            loading={loading}
          />
          {/* Error Display */}
          {sendError && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600 text-center">{sendError}</p>
              <button 
                onClick={() => setSendError(null)}
                className="text-xs text-red-400 hover:text-red-600 underline block mx-auto mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
          <MessageInput
            onSend={handleSendMessage}
            disabled={!isMember || !currentUserId || sending}
            placeholder={
              sending
                ? "Sending..."
                : !currentUserId
                ? "Sign in to chat..."
                : !isMember
                ? "Only members can chat..."
                : "Type a message..."
            }
          />
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.profile_id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-stone-50 transition-colors"
              >
                <img
                  src={
                    member.profile_avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.profile_id}`
                  }
                  alt={member.display_name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium text-stone-900">
                    {member.display_name}
                    {member.profile_id === currentUserId && (
                      <span className="text-stone-400 font-normal"> (you)</span>
                    )}
                  </p>
                  <p className="text-xs text-stone-400 capitalize">
                    {member.member_role}
                  </p>
                </div>
                {member.member_role === "owner" && (
                  <span className="px-2 py-1 text-xs font-bold bg-lime-100 text-lime-700 rounded-full">
                    Owner
                  </span>
                )}
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-8 text-stone-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No members yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
