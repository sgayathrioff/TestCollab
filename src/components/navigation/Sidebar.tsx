"use client";

import Link from "next/link"
import { LayoutGrid, Compass, Settings } from "lucide-react" // Icons
import { useAuth } from "@/hooks/useAuth"; // Import the useAuth hook

export function Sidebar() {
  const { user, loading } = useAuth(); // Get the authenticated user and loading state

  if (loading) {
    return <div>Loading...</div>; // Show a loading indicator while user data is being fetched
  }

  return (
    <aside className="w-64 border-r bg-gray-50 h-screen p-4">
      <nav className="space-y-2">
        <Link 
          href={user ? `/dashboard/${user.id}` : "/"} 
          className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded"
        >
           <LayoutGrid size={20} /> Dashboard
        </Link>
        <Link href="/explore" className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded">
           <Compass size={20} /> Explore
        </Link>
        <Link href="/profile/setup" className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded">
           <Settings size={20} /> Profile Settings
        </Link>
      </nav>
    </aside>
  );
}