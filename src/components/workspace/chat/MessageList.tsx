"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
  loading?: boolean;
}

export function MessageList({ messages, currentUserId, loading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.message_created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 bg-stone-200 rounded-full mb-2"></div>
          <div className="h-3 w-24 bg-stone-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-stone-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          {/* Date Separator */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-stone-200"></div>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              {date}
            </span>
            <div className="flex-1 h-px bg-stone-200"></div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {dateMessages.map((message) => {
              const isOwnMessage = message.sender_profile_id === currentUserId;

              return (
                <div
                  key={message.message_id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  {!isOwnMessage && (
                    <Image
                      src={
                        message.sender?.profile_avatar_url ||
                        "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                      }
                      alt={message.sender?.display_name || "User"}
                      width={32}
                      height={32}
                      loading="lazy"
                      className="w-8 h-8 rounded-full shrink-0"
                    />
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] ${
                      isOwnMessage
                        ? "bg-[#1c1917] text-white rounded-3xl rounded-tr-lg"
                        : "bg-stone-100 text-stone-900 rounded-3xl rounded-tl-lg"
                    } px-4 py-3`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-bold text-lime-600 mb-1">
                        {message.sender?.display_name || "Unknown"}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed wrap-break-word">
                      {message.message_content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-stone-400" : "text-stone-400"
                      }`}
                    >
                      {formatTime(message.message_created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
