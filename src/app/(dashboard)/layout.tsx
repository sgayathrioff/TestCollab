"use client";

import { useState } from "react";
import Image from "next/image";
import { Infinity, Search, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Determine active tab based on current path
  const isExplorePage = pathname === "/explore" || pathname?.startsWith("/profile/");
  const isDashboardPage = !isExplorePage;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDropdownOpen(false);
    if (user?.id) {
      router.push(`/profile/${user.id}`);
    }
  };

  // Show loading state while checking auth or profile completion
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F0]">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (middleware handles redirects)
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F0] antialiased overflow-x-hidden pb-12">
      {/* Floating Glass Navbar */}
      <div className="fixed top-8 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
        <nav className="pointer-events-auto bg-white/70 backdrop-blur-xl border border-white/50 rounded-full pl-6 pr-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex items-center justify-between gap-12 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#1c1917] rounded-full flex items-center justify-center text-[#d9f99d] group-hover:rotate-180 transition-transform duration-700">
              <Infinity className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">Collabio</span>
          </Link>

          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center bg-[#1c1917]/5 rounded-full px-1 py-1">
            <Link 
              href={user ? `/dashboard/${user.id}` : "/dashboard"} 
              className={`px-5 py-2 rounded-full text-sm transition-all ${
                isDashboardPage 
                  ? "bg-white shadow-sm font-bold text-stone-900" 
                  : "font-medium text-stone-500 hover:text-stone-900"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/explore" 
              className={`px-5 py-2 rounded-full text-sm transition-all ${
                isExplorePage 
                  ? "bg-white shadow-sm font-bold text-stone-900" 
                  : "font-medium text-stone-500 hover:text-stone-900"
              }`}
            >
              Explore
            </Link>
          </div>

          {/* Search & Avatar */}
          <div className="flex items-center gap-2">
            <Link href="/search" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-colors">
              <Search className="w-5 h-5" />
            </Link>

            <NotificationBell />
            
            {/* Profile Dropdown */}
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white ring-2 ring-stone-100 cursor-pointer hover:ring-lime-300 transition-all"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Image
                  src={user?.avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=100"} 
                  width={40}
                  height={40}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  alt="User"
                />
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Content */}
                  <div 
                    className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-sm font-semibold text-stone-900">{user?.display_name || "User"}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button 
                        type="button"
                        onClick={handleProfileClick}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors w-full text-left"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-stone-100 pt-2">
                      <button 
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          await signOut();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-350 mx-auto px-6 pt-40">
        {children}
      </main>
    </div>
  );
}