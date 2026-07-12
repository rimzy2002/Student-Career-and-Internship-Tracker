"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { GraduationCap, LogOut, Settings, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'

interface NavbarProps {
  isAuthPage?: boolean;
  defaultIsLoggedIn?: boolean;
  defaultUserRole?: 'student' | 'admin';
}

export function Navbar({ isAuthPage = false, defaultIsLoggedIn = false, defaultUserRole = 'student' }: NavbarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(defaultIsLoggedIn);
  const [userRole, setUserRole] = useState<'student' | 'admin'>(defaultUserRole);
  const [userData, setUserData] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check local storage on mount
  useEffect(() => {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (user && token) {
      const parsed = JSON.parse(user);
      setIsLoggedIn(true);
      setUserRole(parsed.role);
      setUserData(parsed);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    router.push("/");
  };

  const loggedOutLinks = [
    { name: 'Features', url: '#features' },
    { name: 'How It Works', url: '#how-it-works' },
  ];

  const studentLinks = [
    { name: 'Dashboard', url: '/student/dashboard' },
    { name: 'Applications', url: '/student/applications' },
    { name: 'Skills', url: '/student/skills' },
    { name: 'Profile', url: '/student/profile' },
  ];

  const adminLinks = [
    { name: 'Analytics', url: '/admin/analytics' },
    { name: 'Cohorts', url: '/admin/cohorts' },
    { name: 'Reports', url: '/admin/reports' },
  ];

  const currentLinks = !isLoggedIn ? loggedOutLinks : (userRole === 'student' ? studentLinks : adminLinks);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
      <nav className="flex items-center justify-between bg-black/60 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full shadow-2xl">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity pl-2">
          <GraduationCap className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg text-white tracking-tight hidden sm:block">CareerTrack</span>
        </Link>

        {/* Auth Page Minimal Navbar */}
        {isAuthPage ? (
          <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors pr-4">
            Back to Home
          </Link>
        ) : (
          <>
            {/* Center: Navigation Links with Tubelight Effect */}
            <div className="hidden md:flex items-center gap-2">
              {currentLinks.map((item) => {
                const isActive = pathname?.startsWith(item.url);
                return (
                  <Link
                    key={item.name}
                    href={item.url}
                    className={cn(
                      "relative cursor-pointer text-sm font-medium px-5 py-2 rounded-full transition-colors",
                      "text-white/70 hover:text-white",
                      isActive && "text-white"
                    )}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="lamp"
                        className="absolute inset-0 w-full bg-white/5 rounded-full -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-t-full">
                          <div className="absolute w-12 h-6 bg-white/20 rounded-full blur-md -top-2 -left-2" />
                          <div className="absolute w-8 h-6 bg-white/20 rounded-full blur-md -top-1" />
                          <div className="absolute w-4 h-4 bg-white/20 rounded-full blur-sm top-0 left-2" />
                        </div>
                      </motion.div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right: Auth Buttons or Avatar */}
            <div className="flex items-center gap-3 relative pr-1">
              {!isLoggedIn ? (
                <>
                  <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5">
                    Log In
                  </Link>
                  <Link href="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 transition-transform hover:scale-105 shadow-md shadow-blue-500/20">
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  {/* Avatar Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-900 border border-blue-700 hover:ring-2 ring-blue-500 transition-all focus:outline-none"
                    >
                      <span className="text-sm font-medium text-blue-100 uppercase">
                        {userData?.profile_image_url ? (
                          <img src={userData.profile_image_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          userData?.email ? userData.email.substring(0, 2) : (userRole === 'student' ? 'ST' : 'AD')
                        )}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-56 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl py-1 z-50">
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white">
                            {userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : 'User'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {userData?.email || (userRole === 'student' ? 'student@example.com' : 'admin@example.com')}
                          </p>
                        </div>
                        <div className="py-2">
                          <button className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                            <User className="mr-3 h-4 w-4" /> Profile
                          </button>
                          <button className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                            <Settings className="mr-3 h-4 w-4" /> Settings
                          </button>
                        </div>
                        <div className="py-2 border-t border-white/10">
                          <button 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleLogout();
                            }}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                          >
                            <LogOut className="mr-3 h-4 w-4" /> Log out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </nav>
    </div>
  )
}
