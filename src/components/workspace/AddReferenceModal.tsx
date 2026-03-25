"use client";

import { useState, useRef, useEffect } from "react";
import { X, Link as LinkIcon, Upload, Loader2, FileAudio, FileVideo, FileText, Image, Tag, FolderOpen } from "lucide-react";
import type { WorkspaceFolder } from "@/types";
import { supabase } from "@/lib/supabase";
import { getFileTypeFromUrl, getFileTypeFromMime, ReferenceType } from "@/lib/fileType";
import { detectPlatform } from "@/lib/platformDetect";

const STORAGE_BUCKET = "Link-UpWorkpace";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const TYPE_FALLBACK_THUMBNAILS: Record<ReferenceType, string> = {
  image: "/window.svg",
  video: "/next.svg",
  audio: "/vercel.svg",
  document: "/file.svg",
  link: "/file.svg",
};

interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  folders?: WorkspaceFolder[];
  onReferenceAdded?: (reference: any) => void;
}

interface WorkspaceTag {
  tag_id: string;
  tag_name: string;
  tag_color: string;
}

const TYPE_ICONS: Record<ReferenceType, React.ReactNode> = {
  audio: <FileAudio className="w-6 h-6" />,
  video: <FileVideo className="w-6 h-6" />,
  document: <FileText className="w-6 h-6" />,
  image: <Image className="w-6 h-6" />,
  link: <LinkIcon className="w-6 h-6" />,
};

const TYPE_COLORS: Record<ReferenceType, string> = {
  audio: "text-purple-500 bg-purple-50",
  video: "text-rose-500 bg-rose-50",
  document: "text-amber-500 bg-amber-50",
  image: "text-sky-500 bg-sky-50",
  link: "text-stone-500 bg-stone-100",
};

export function AddReferenceModal({ isOpen, onClose, workspaceId, folders = [], onReferenceAdded }: AddReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('upload');
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState(""); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(""); 
  const [fileType, setFileType] = useState<ReferenceType>("image");
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tags state
  const [availableTags, setAvailableTags] = useState<WorkspaceTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFileState = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setFileType("image");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Fetch workspace tags when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchWorkspaceTags();
    }
  }, [isOpen, workspaceId]);

  const fetchWorkspaceTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("tag_id, tag_name, tag_color")
        .eq("workspace_id", workspaceId)
        .order("tag_name");

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!isOpen) return null;

  // Sanitize filename for storage - remove special characters
  const sanitizeFilename = (filename: string): string => {
    // Get file extension
    const lastDot = filename.lastIndexOf('.');
    const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.substring(lastDot) : '';
    
    // Remove emojis, special chars, keep only alphanumeric, dash, underscore
    const sanitized = name
      .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, dash
      .replace(/\s+/g, '_')      // Replace spaces with underscore
      .replace(/_+/g, '_')       // Remove duplicate underscores
      .replace(/^_+|_+$/g, '')   // Remove leading/trailing underscores
      .substring(0, 100);        // Limit length
    
    // If nothing remains after sanitization, use a default name
    const finalName = sanitized || `file_${Date.now()}`;
    
    return finalName + ext;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size limit
      if (file.size > MAX_FILE_SIZE) {
        setError(`File is too large. Maximum size is 10MB. Your file is ${formatFileSize(file.size)}.`);
        resetFileState();
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      
      // Detect file type from MIME
      const detectedType = getFileTypeFromMime(file);
      setFileType(detectedType);
      
      // Create a local preview for images
      if (detectedType === "image") {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        setPreviewUrl("");
      }
      
      if (!title) {
        setTitle(file.name);
      }
    }
  };

  const handleModalClose = () => {
    setError(null);
    resetFileState();
    onClose();
  };

  const handleSubmit = async () => {
    if (activeTab === 'upload' && !selectedFile) return;
    if (activeTab === 'link' && !linkUrl) return;

    if (!workspaceId) {
      setError("Workspace ID is missing");
      return;
    }

    if (activeTab === 'link') {
      const referenceUrl = linkUrl.trim();
      setError(null);

      // 1. Validate URL and current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const currentUserId = authUser?.id ?? null;
      const wsId = workspaceId;

      if (!referenceUrl || !currentUserId) {
        setError("Please enter a valid URL and make sure you're logged in.");
        return;
      }

      // 2. Start importing state
      setIsImporting(true);

      // 3. Detect platform and file type
      const info = detectPlatform(referenceUrl);
      let type = getFileTypeFromUrl(referenceUrl);
      if (!type) type = "link";

      // 4. Insert placeholder row first
      const placeholderTitle = (() => {
        try {
          return new URL(referenceUrl).hostname;
        } catch {
          return "Importing…";
        }
      })();

      const placeholderBase = {
        workspace_id: wsId,
        uploaded_by_profile_id: currentUserId,
        reference_title: placeholderTitle,
        reference_type: type,
        reference_url: referenceUrl,
        reference_metadata: {
          source_url: referenceUrl,
          platform: info.platform,
        },
        ...(selectedFolderId ? { folder_id: selectedFolderId } : {}),
      };

      let statusColumnSupported = true;
      let placeholderRef: any = null;
      let placeholderError: any = null;

      {
        const attempt = await supabase
          .from("references")
          .insert({
            ...placeholderBase,
            reference_status: "processing",
          })
          .select()
          .single();

        placeholderRef = attempt.data;
        placeholderError = attempt.error;
      }

      if (placeholderError?.message?.toLowerCase().includes("reference_status")) {
        statusColumnSupported = false;
        const fallbackAttempt = await supabase
          .from("references")
          .insert(placeholderBase)
          .select()
          .single();
        placeholderRef = fallbackAttempt.data;
        placeholderError = fallbackAttempt.error;
      }

      // 5. Handle placeholder insert errors
      if (placeholderError || !placeholderRef) {
        setError(placeholderError?.message || "Failed to start import.");
        setIsImporting(false);
        return;
      }

      // 6. Show card immediately in UI
      onReferenceAdded?.(placeholderRef);

      // 7. Free user immediately and close modal
      setTitle("");
      setLinkUrl("");
      resetFileState();
      setSelectedTags([]);
      setSelectedFolderId("");
      setIsImporting(false);
      onClose();

      // 8. Background work (not awaited)
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch('/api/import-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ url: referenceUrl, type, platform: info.platform }),
          });

          if (!response.ok) {
            let errorMessage = `Import failed (${response.status})`;
            try {
              const errorData = await response.json();
              if (errorData?.error) errorMessage = errorData.error;
            } catch {
              // no-op
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          if (data.error) throw new Error(data.error);

          const finalType = data.actualType ?? data.type ?? type;
          if (finalType !== 'link' && !data.publicUrl) throw new Error('No storage URL returned from import');
          const finalUrl = data.mode === 'platform'
            ? ((finalType === 'image' || finalType === 'video') && data.publicUrl ? data.publicUrl : (data.sourceUrl || referenceUrl))
            : (data.publicUrl || referenceUrl);

          const readyUpdate: Record<string, any> = {
            reference_url: finalUrl,
            reference_title: data.fileName || data.title || placeholderTitle,
            reference_type: finalType,
            reference_metadata: {
              source_url: referenceUrl,
              ...(data.metadata || {}),
              thumbnailStoredUrl: data.publicUrl || null,
            },
          };

          if (statusColumnSupported) {
            readyUpdate.reference_status = 'ready';
          }

          await supabase.from('references').update(readyUpdate).eq('reference_id', placeholderRef.reference_id);
        } catch (err) {
          const failedUpdate: Record<string, any> = {
            reference_url: referenceUrl,
            reference_type: 'link',
            reference_title: (() => { try { return new URL(referenceUrl).hostname; } catch { return 'Import failed'; } })(),
          };

          if (statusColumnSupported) {
            failedUpdate.reference_status = 'failed';
          }

          await supabase.from('references').update(failedUpdate).eq('reference_id', placeholderRef.reference_id);
          console.error('Background import failed:', err);
        }
      })();

      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to add references");
      }

      let finalUrl = linkUrl;
      let finalType: ReferenceType = "document";
      let metadata: Record<string, any> = {};
      let resolvedTitle = title.trim();

      // Handle file upload
      if (activeTab === 'upload' && selectedFile) {
        finalType = fileType;
        
        // Sanitize filename to remove special characters
        const sanitizedFilename = sanitizeFilename(selectedFile.name);
        
        // Build storage path: workspaceId/type/timestamp_filename
        const storagePath = `${workspaceId}/${finalType}/${Date.now()}_${sanitizedFilename}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, selectedFile, {
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        finalUrl = urlData.publicUrl;
        metadata = {
          size: formatFileSize(selectedFile.size),
          original_name: selectedFile.name, // Store original filename with special chars
          source: selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE',
          thumbnail: finalType === "image" ? finalUrl : TYPE_FALLBACK_THUMBNAILS[finalType],
        };

        if (!resolvedTitle) {
          resolvedTitle = selectedFile.name.replace(/\.[^.]+$/, "");
        }
      }
      if (!resolvedTitle) {
        resolvedTitle = "Untitled Reference";
      }

      // Insert reference into database
      const { data: refData, error: insertError } = await supabase
        .from("references")
        .insert({
          workspace_id: workspaceId,
          uploaded_by_profile_id: user.id,
          reference_title: resolvedTitle,
          reference_type: finalType,
          reference_url: finalUrl,
          reference_metadata: metadata,
          ...(selectedFolderId ? { folder_id: selectedFolderId } : {}),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save reference: ${insertError.message}`);
      }

      // Insert selected tags into reference_tags junction table
      if (selectedTags.length > 0 && refData) {
        const tagInserts = selectedTags.map(tagId => ({
          reference_id: refData.reference_id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from("reference_tags")
          .insert(tagInserts);

        if (tagError) {
          console.error("Error adding tags to reference:", tagError);
        }
      }

      // Notify all other workspace members + owner about the new reference
      const [{ data: wsMembers }, { data: wsData }, { data: actorProfile }] = await Promise.all([
        supabase.from('workspace_members').select('profile_id').eq('workspace_id', workspaceId),
        supabase.from('workspaces').select('workspace_title, workspace_owner_id').eq('workspace_id', workspaceId).single(),
        supabase.from('profiles').select('display_name').eq('profile_id', user.id).maybeSingle(),
      ]);

      // Build recipient set: all non-uploader members + owner (if not the uploader)
      const recipientIds = new Set<string>();
      (wsMembers || []).forEach(m => {
        if (m.profile_id !== user.id) recipientIds.add(m.profile_id);
      });
      if (wsData?.workspace_owner_id && wsData.workspace_owner_id !== user.id) {
        recipientIds.add(wsData.workspace_owner_id);
      }

      if (recipientIds.size > 0 && wsData) {
        const actorName = actorProfile?.display_name || 'A workspace member';
        const notifications = Array.from(recipientIds).map(profileId => ({
          recipient_profile_id: profileId,
          notification_type: 'reference_added',
          notification_message: `${actorName} added "${resolvedTitle}" to ${wsData.workspace_title}`,
          notification_link: `/workspace/${workspaceId}`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // Notify parent component
      if (onReferenceAdded && refData) {
        onReferenceAdded(refData);
      }

      // Reset and Close
      setTitle("");
      setLinkUrl("");
      resetFileState();
      setSelectedTags([]);
      setSelectedFolderId("");
      onClose();

    } catch (err: any) {
      console.error("Error adding reference:", err);
      const errorMessage = err.message || err.error || err.toString() || "Failed to add reference";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={handleModalClose}></div>
      <div className="bg-white w-full max-w-lg rounded-4xl p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Add New Reference</h2>
          <button onClick={handleModalClose} className="text-stone-400 hover:text-stone-900"><X className="w-6 h-6" /></button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-stone-100 mb-6">
          <button 
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'upload' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400'}`}
          >
            Upload
          </button>
          <button 
            onClick={() => { setActiveTab('link'); setError(null); }}
            className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'link' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400'}`}
          >
            Import URL
          </button>
        </div>

        <div className="space-y-5">
          {activeTab === 'upload' ? (
            <>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors h-48 overflow-hidden relative"
              >
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  className="hidden" 
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md" 
                  onClick={(e) => {
                    e.currentTarget.value = "";
                  }}
                  onChange={handleFileChange} 
                />
                
                {selectedFile ? (
                  previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${TYPE_COLORS[fileType]}`}>
                        {TYPE_ICONS[fileType]}
                      </div>
                      <p className="font-bold text-stone-700 truncate max-w-50">{selectedFile.name}</p>
                      <p className="text-xs text-stone-400 mt-1">{formatFileSize(selectedFile.size)}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${TYPE_COLORS[fileType]}`}>
                        {fileType}
                      </span>
                    </div>
                  )
                ) : (
                  <>
                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-stone-600">Click to upload file</p>
                    <p className="text-xs text-stone-400 mt-1">Images, videos, audio, documents (max 10MB)</p>
                  </>
                )}
              </div>
              
              {/* File type indicator when file is selected */}
              {selectedFile && previewUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${TYPE_COLORS[fileType]}`}>
                    {TYPE_ICONS[fileType]}
                    <span className="uppercase font-bold text-xs">{fileType}</span>
                  </span>
                  <span className="text-stone-400">{formatFileSize(selectedFile.size)}</span>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">URL</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setError(null); }}
                  placeholder="https://example.com/file.pdf" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-medium text-stone-900" 
                />
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Paste a URL to an image, video, audio, or document file
              </p>
              
              {/* Show detected type when URL is entered */}
              {linkUrl && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-stone-500">Detected type:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${TYPE_COLORS[getFileTypeFromUrl(linkUrl)]}`}>
                    {TYPE_ICONS[getFileTypeFromUrl(linkUrl)]}
                    <span className="uppercase font-bold text-xs">{getFileTypeFromUrl(linkUrl)}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Title</label>
             <input 
               type="text" 
               value={title} 
               onChange={(e) => setTitle(e.target.value)}
               placeholder="e.g. Design System V1"
               className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-bold text-stone-900" 
             />
          </div>

          {/* Folder Selector */}
          {folders.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-2">
                <FolderOpen className="w-3 h-3" />
                Add to Folder (Optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-medium text-stone-900"
              >
                <option value="">None</option>
                {folders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    {f.folder_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags Selector */}
          {availableTags.length > 0 ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.tag_id}
                    type="button"
                    onClick={() => toggleTag(tag.tag_id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedTags.includes(tag.tag_id)
                        ? "ring-2 ring-offset-1 ring-stone-900 scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ 
                      backgroundColor: tag.tag_color,
                      color: '#fff'
                    }}
                  >
                    {tag.tag_name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-500 flex items-center gap-2">
              <Tag className="w-3 h-3" />
              <span>No tags yet. Click the tag icon in the workspace header to create tags.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button disabled={loading || isImporting} onClick={handleModalClose} className="flex-1 py-3.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors">Cancel</button>
            <button 
              disabled={loading || isImporting || (activeTab === 'upload' && !selectedFile) || (activeTab === 'link' && !linkUrl)} 
              onClick={handleSubmit} 
              className="flex-1 py-3.5 rounded-xl bg-[#1c1917] text-white font-bold hover:bg-stone-800 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {activeTab === 'link' ? 'Importing...' : 'Uploading...'}
                </>
              ) : (
                activeTab === 'link' ? 'Import' : 'Add Reference'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}