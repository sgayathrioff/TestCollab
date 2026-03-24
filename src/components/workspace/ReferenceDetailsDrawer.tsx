"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Trash2, X, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ReferenceData, WorkspaceMember } from "@/types";

type CommentsTable = "reference_comments" | "comments";

interface ReferenceComment {
  id: string;
  referenceId: string;
  profileId: string;
  content: string;
  createdAt: string;
  author?: {
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
  };
}

interface ReferenceDetailsDrawerProps {
  reference: ReferenceData | null;
  workspaceId: string;
  currentUserId?: string;
  workspaceMembers?: WorkspaceMember[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: (url: string) => void;
  onEdit?: (reference: ReferenceData) => void;
  onDelete?: (referenceId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ReferenceDetailsDrawer({
  reference,
  workspaceId,
  currentUserId,
  workspaceMembers = [],
  isOpen,
  onClose,
  onOpen,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: ReferenceDetailsDrawerProps) {
  const [comments, setComments] = useState<ReferenceComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isCommentsAvailable, setIsCommentsAvailable] = useState(true);
  const [commentsTable, setCommentsTable] = useState<CommentsTable | null>(null);

  const memberMentionData = useMemo(() => {
    return workspaceMembers
      .filter((member) => !!member.profile)
      .map((member) => {
        const displayName = member.profile?.display_name || "User";
        const handle = displayName.toLowerCase().replace(/\s+/g, "");
        return {
          profileId: member.profile_id,
          displayName,
          avatar: member.profile?.profile_avatar_url || "",
          handle,
        };
      });
  }, [workspaceMembers]);

  const mentionSearch = (() => {
    const match = commentText.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    if (!match) return null;
    return match[1].toLowerCase();
  })();

  const mentionSuggestions = useMemo(() => {
    if (mentionSearch === null) return [];
    return memberMentionData
      .filter((member) => member.handle.includes(mentionSearch))
      .slice(0, 6);
  }, [memberMentionData, mentionSearch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const parseMentionIds = (text: string) => {
    const matches = Array.from(text.matchAll(/@([a-zA-Z0-9._-]+)/g)).map((match) => match[1].toLowerCase());
    if (matches.length === 0) return [];

    const uniqueMentionIds = new Set<string>();
    for (const token of matches) {
      const matchedMember = memberMentionData.find((member) => member.handle === token);
      if (matchedMember && matchedMember.profileId !== currentUserId) {
        uniqueMentionIds.add(matchedMember.profileId);
      }
    }
    return Array.from(uniqueMentionIds);
  };

  const isMissingTableError = (error: any) => {
    const code = error?.code;
    const msg = (error?.message || "").toLowerCase();
    return code === "42P01" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("column");
  };

  const detectCommentsTable = async (): Promise<CommentsTable | null> => {
    const referenceProbe = await supabase.from("reference_comments").select("comment_id").limit(1);
    if (!referenceProbe.error) return "reference_comments";

    const commentsProbe = await supabase.from("comments").select("comment_id").limit(1);
    if (!commentsProbe.error) return "comments";

    return null;
  };

  const normalizeComments = (rows: any[], source: CommentsTable): ReferenceComment[] => {
    if (source === "reference_comments") {
      return rows.map((row) => ({
        id: row.comment_id,
        referenceId: row.reference_id,
        profileId: row.profile_id,
        content: row.content,
        createdAt: row.created_at,
      }));
    }

    return rows.map((row) => ({
      id: row.comment_id,
      referenceId: row.reference_id,
      profileId: row.commenter_profile_id,
      content: row.comment_content,
      createdAt: row.comment_created_at,
    }));
  };

  const loadComments = async () => {
    if (!reference) return;
    setCommentsError(null);

    try {
      const source = commentsTable || (await detectCommentsTable());
      if (!source) {
        setIsCommentsAvailable(false);
        setComments([]);
        return;
      }
      if (commentsTable !== source) setCommentsTable(source);

      const selectColumns =
        source === "reference_comments"
          ? "comment_id, reference_id, profile_id, content, created_at"
          : "comment_id, reference_id, commenter_profile_id, comment_content, comment_created_at";

      const orderColumn = source === "reference_comments" ? "created_at" : "comment_created_at";

      const { data: commentRows, error: commentsLoadError } = await supabase
        .from(source)
        .select(selectColumns)
        .eq("reference_id", reference.reference_id)
        .order(orderColumn, { ascending: true });

      if (commentsLoadError) {
        if (isMissingTableError(commentsLoadError)) {
          setIsCommentsAvailable(false);
          setComments([]);
          return;
        }
        throw commentsLoadError;
      }

      const commentsData = normalizeComments(commentRows || [], source);
      if (commentsData.length === 0) {
        setComments([]);
        return;
      }

      const authorIds = Array.from(new Set(commentsData.map((comment) => comment.profileId)));
      const { data: authors } = await supabase
        .from("profiles")
        .select("profile_id, display_name, profile_avatar_url")
        .in("profile_id", authorIds);

      const authorMap = new Map((authors || []).map((author) => [author.profile_id, author]));

      setComments(
        commentsData.map((comment) => ({
          ...comment,
          author: authorMap.get(comment.profileId)
            ? {
                profile_id: comment.profileId,
                display_name: authorMap.get(comment.profileId)?.display_name || "Unknown user",
                profile_avatar_url: authorMap.get(comment.profileId)?.profile_avatar_url || "",
              }
            : undefined,
        }))
      );
    } catch (err: any) {
      setCommentsError(err.message || "Failed to load comments");
    }
  };

  const handleMentionPick = (handle: string) => {
    setCommentText((prev) => prev.replace(/(?:^|\s)@[a-zA-Z0-9._-]*$/, ` @${handle} `).trimStart());
  };

  const handleAddComment = async () => {
    if (!reference || !currentUserId || !commentText.trim()) return;

    setSubmittingComment(true);
    setCommentsError(null);

    try {
      const mentionIds = parseMentionIds(commentText);

      const source = commentsTable || (await detectCommentsTable());
      if (!source) {
        setIsCommentsAvailable(false);
        setCommentsError("Comments table not found. Create `reference_comments` or use `comments`.");
        return;
      }
      if (commentsTable !== source) setCommentsTable(source);

      const insertPayload =
        source === "reference_comments"
          ? {
              reference_id: reference.reference_id,
              profile_id: currentUserId,
              content: commentText.trim(),
            }
          : {
              reference_id: reference.reference_id,
              commenter_profile_id: currentUserId,
              comment_content: commentText.trim(),
            };

      const selectColumns =
        source === "reference_comments"
          ? "comment_id, reference_id, profile_id, content, created_at"
          : "comment_id, reference_id, commenter_profile_id, comment_content, comment_created_at";

      const { data: insertedComment, error: insertError } = await supabase
        .from(source)
        .insert(insertPayload)
        .select(selectColumns)
        .single();

      if (insertError) {
        if (isMissingTableError(insertError)) {
          setIsCommentsAvailable(false);
          return;
        }
        throw insertError;
      }

      const authorInfo = memberMentionData.find((member) => member.profileId === currentUserId);
      const authorName = authorInfo?.displayName || "A collaborator";

      setComments((prev) => [
        ...prev,
        {
          ...normalizeComments([insertedComment], source)[0],
          author: {
            profile_id: currentUserId,
            display_name: authorName,
            profile_avatar_url: authorInfo?.avatar || "",
          },
        },
      ]);

      if (mentionIds.length > 0) {
        const mentionNotifications = mentionIds.map((profileId) => ({
          recipient_profile_id: profileId,
          notification_type: "reference_added",
          notification_message: `${authorName} mentioned you in a comment on "${reference.reference_title || "Untitled"}"`,
          notification_link: `/workspace/${workspaceId}`,
        }));
        await supabase.from("notifications").insert(mentionNotifications);
      }

      setCommentText("");
    } catch (err: any) {
      setCommentsError(err.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !reference) return;
    setIsCommentsAvailable(true);
    loadComments();
  }, [isOpen, reference?.reference_id]);

  useEffect(() => {
    if (!isOpen || !reference || !isCommentsAvailable) return;

    const commentsChannel = supabase
      .channel(`reference-comments-${reference.reference_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: commentsTable || "reference_comments",
          filter: `reference_id=eq.${reference.reference_id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [isOpen, reference?.reference_id, isCommentsAvailable, commentsTable]);

  if (!isOpen || !reference) return null;

  return (
    <div className="fixed inset-0 z-60 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-white border-l border-stone-200 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Reference Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-stone-100 bg-stone-50 aspect-4/3">
            <img
              src={reference.reference_metadata?.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"}
              alt={reference.reference_title || "Untitled"}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Title</p>
            <h3 className="text-2xl font-bold text-stone-900 wrap-break-word">
              {reference.reference_title || "Untitled"}
            </h3>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Type</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-stone-100 text-stone-700 uppercase">
              {reference.reference_type || "document"}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">URL</p>
            <p className="text-sm text-stone-600 break-all leading-relaxed">{reference.reference_url}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {(reference.tags || []).length > 0 ? (
                reference.tags?.map((tag) => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold"
                  >
                    #{tag.tag_name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-stone-400">No tags</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpen(reference.reference_url)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1917] text-white text-sm font-bold hover:bg-stone-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open
            </button>
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(reference)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(reference.reference_id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Comments</p>

            {!isCommentsAvailable ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Comments are not available yet. Run the project SQL migration for `reference_comments` to enable this feature.
              </div>
            ) : (
              <>
                {commentsError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                    {commentsError}
                  </div>
                )}

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-sm text-stone-400">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="rounded-xl border border-stone-100 p-3 bg-stone-50">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={comment.author?.profile_avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=80"}
                            alt={comment.author?.display_name || "User"}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-sm font-bold text-stone-800">{comment.author?.display_name || "Unknown user"}</span>
                          <span className="text-xs text-stone-400">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-stone-700 whitespace-pre-wrap wrap-break-word">
                          {comment.content.split(/(\s+@[a-zA-Z0-9._-]+)/g).map((part, index) => {
                            if (part.trim().startsWith("@")) {
                              return (
                                <span key={index} className="text-lime-700 font-semibold">
                                  {part}
                                </span>
                              );
                            }
                            return <span key={index}>{part}</span>;
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    rows={3}
                    placeholder="Add a comment... Use @username to mention"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                  />

                  {mentionSuggestions.length > 0 && (
                    <div className="rounded-xl border border-stone-200 bg-white p-2 max-h-36 overflow-y-auto">
                      {mentionSuggestions.map((member) => (
                        <button
                          key={member.profileId}
                          type="button"
                          onClick={() => handleMentionPick(member.handle)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 text-left"
                        >
                          <img
                            src={member.avatar || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=80"}
                            alt={member.displayName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-sm text-stone-700 font-medium">{member.displayName}</span>
                          <span className="text-xs text-stone-400 ml-auto">@{member.handle}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submittingComment || !commentText.trim()}
                    onClick={handleAddComment}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
