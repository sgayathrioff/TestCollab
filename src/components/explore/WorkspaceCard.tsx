"use client";

import { Heart, Bookmark } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface WorkspaceCardProps {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  categoryEmoji?: string;
  likes: number;
  isLiked?: boolean;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
  updatedAt?: string;
  showAuthor?: boolean;
  onBookmark?: () => void;
  onAuthorClick?: () => void;
}

export function WorkspaceCard({
  id,
  title,
  description,
  coverImage,
  category,
  categoryEmoji = "📁",
  likes,
  isLiked = false,
  author,
  updatedAt,
  showAuthor = true,
  onBookmark,
  onAuthorClick,
}: WorkspaceCardProps) {
  const formattedLikes = likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes.toString();

  return (
    <Link href={`/workspace/${id}`}>
      <div className="bg-white p-3 pb-5 rounded-[40px] hover-lift border border-stone-100 group cursor-pointer">
        {/* Cover Image */}
        <div className="aspect-16/10 rounded-4xl overflow-hidden relative mb-4 bg-stone-100">
          <Image
            src={coverImage}
            alt={title}
            fill
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Category Badge */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-stone-900">
            {categoryEmoji} {category}
          </div>
          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmark?.();
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/50 backdrop-blur rounded-full flex items-center justify-center text-stone-900 hover:bg-white transition-colors group/btn"
          >
            <Bookmark className="w-5 h-5 group-hover/btn:fill-stone-900" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4">
          <h3 className="text-xl font-bold text-stone-900 mb-1">{title}</h3>
          <p className="text-stone-500 text-sm mb-4 line-clamp-1">{description}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            {showAuthor && author ? (
              <div
                className="flex items-center gap-2 cursor-pointer group/author"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAuthorClick?.();
                }}
              >
                <Image
                  src={author.avatar}
                  alt={author.name}
                  width={32}
                  height={32}
                  loading="lazy"
                  className="w-8 h-8 rounded-full border border-stone-200 group-hover/author:ring-2 ring-lime-400 transition-all"
                />
                <p className="text-sm font-bold text-stone-900 leading-none group-hover/author:text-lime-700 transition-colors">
                  {author.name}
                </p>
              </div>
            ) : (
              <span className="text-xs font-bold text-stone-400">{updatedAt}</span>
            )}

            
            </div>
          </div>
        </div>
     
    </Link>
  );
}
