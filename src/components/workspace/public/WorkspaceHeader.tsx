"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, Heart, Share2, Copy, UserPlus, Tag, Settings } from "lucide-react";

interface WorkspaceHeaderProps {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  categoryEmoji?: string;
  views: number;
  likes: number;
  isLiked?: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  onLike?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  isOwner?: boolean;
  onInvite?: () => void;
  onSettings?: () => void;
  onManageTags?: () => void;
}

export function WorkspaceHeader({
  id,
  title,
  description,
  coverImage,
  category,
  categoryEmoji = "📁",
  views,
  likes,
  isLiked = false,
  author,
  onLike,
  onShare,
  onDuplicate,
  onFollow,
  isFollowing = false,
  isOwner = false,
  onInvite,
  onSettings,
  onManageTags,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  // Use prop if provided, otherwise local state (though usually controlled)
  // Check if we are in controlled mode effectively by seeing if we have a valid isFollowing prop
  
  const handleLike = () => {
    setLiked(!liked);
    onLike?.();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <>
      {/* Back Button */}
      <Link
        href={isOwner ? "/dashboard" : "/explore"}
        className="inline-flex items-center gap-2 text-stone-500 font-bold hover:text-stone-900 transition-colors mb-6 ml-2 float-in"
      >
        <ArrowLeft className="w-4 h-4" /> {isOwner ? "Back to Dashboard" : "Back to Explore"}
      </Link>

      {/* Header */}
      <header className="mb-10 float-in delay-1 relative">
        {/* Cover Image */}
        <div className="w-full h-62.5 md:h-87.5 rounded-[48px] overflow-hidden relative bg-stone-200">
          <Image
            src={coverImage}
            alt={title}
            fill
            priority
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
        </div>

        {/* Info Card */}
        <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10">
          <div className="bg-white rounded-[40px] p-8 shadow-xl border border-stone-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Left Side - Info */}
            <div className="flex-1">
              {/* Category and Views */}
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-lime-100 text-lime-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  {categoryEmoji} {category}
                </span>
                <span className="text-stone-400 text-sm font-medium flex items-center gap-1">
                  <Eye className="w-4 h-4" /> {formatNumber(views)} Views
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
                {title}
              </h1>

              {/* Description */}
              <p className="text-lg text-stone-500 leading-relaxed mb-6 max-w-2xl">
                {description}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <Image
                  src={author.avatar}
                  alt={author.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="w-12 h-12 rounded-full border-2 border-stone-100 cursor-pointer hover:ring-2 ring-lime-400 transition-all"
                  onClick={() => router.push(`/profile/${author.id}`)}
                />
                <div>
                  <p className="text-sm text-stone-400 font-medium">Curated by</p>
                  <p
                    className="text-base font-bold text-stone-900 cursor-pointer hover:text-lime-600 transition-colors"
                    onClick={() => router.push(`/profile/${author.id}`)}
                  >
                    {author.name}
                  </p>
                </div>
                {!isOwner && (
                  <button
                    onClick={onFollow}
                    className={`ml-4 px-4 py-1.5 rounded-full border-2 text-sm font-bold transition-colors ${
                      isFollowing
                        ? "bg-stone-900 text-white border-stone-900"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {isOwner ? (
                <>
                  {/* Owner: Manage Tags Button */}
                  {onManageTags && (
                    <button
                      onClick={onManageTags}
                      className="w-full sm:w-14 h-14 rounded-full border-2 border-lime-200 flex items-center justify-center text-lime-600 hover:bg-lime-50 transition-colors"
                      title="Manage tags"
                    >
                      <Tag className="w-5 h-5" />
                    </button>
                  )}

                  {/* Owner: Settings Button */}
                  {onSettings && (
                    <button
                      onClick={onSettings}
                      className="w-full sm:w-14 h-14 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                      title="Workspace settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}

                  {/* Owner: Invite Button */}
                  <button
                    onClick={onInvite}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#1c1917] text-white text-lg font-bold hover:bg-stone-800 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <UserPlus className="w-5 h-5" /> Invite
                  </button>
                </>
              ) : (
                <>
                  {/* Visitor: Like Button */}
                  <button
                    onClick={handleLike}
                    className={`w-full sm:w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors group ${
                      liked
                        ? "bg-red-50 border-red-200 text-red-500"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${
                        liked ? "fill-red-500" : "group-hover:text-red-500"
                      }`}
                    />
                  </button>

                  {/* Visitor: Share Button */}
                  <button
                    onClick={onShare}
                    className="w-full sm:w-14 h-14 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>

                  {/* Visitor: Duplicate Button */}
                  <button
                    onClick={onDuplicate}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#1c1917] text-[#d9f99d] text-lg font-bold hover:bg-stone-800 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Copy className="w-5 h-5" /> Duplicate Space
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
