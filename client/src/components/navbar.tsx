"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, LogOut, Settings, User } from 'lucide-react'

// Using standard HTML/Tailwind for the mock dropdown to avoid Radix UI dependency issues right now.
// You can easily swap this out for standard shadcn <DropdownMenu> later.

interface NavbarProps {
  isAuthPage?: boolean;
}

export function Navbar({ isAuthPage = false }: NavbarProps) {
  // MOCK STATE - will be replaced with real auth context (JWT/Role verification) later
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Logo (replaces "Home" as the click-to-home target) */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <GraduationCap className="h-7 w-7 text-blue-500" />
          <span className="font-bold text-xl text-white tracking-tight">CareerTrack</span>
        </Link>

        {/* Auth Page Minimal Navbar */}
        {isAuthPage ? (
          <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Back to Home
          </Link>
        ) : (
          <>
            {/* Center: Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              {!isLoggedIn ? (
                // Logged-Out Marketing Links
                <>
                  <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Features</Link>
                  <Link href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">How It Works</Link>
                </>
              ) : (
                // Logged-In Role-Aware Links
                <>
                  {userRole === 'student' ? (
                    <>
                      <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Dashboard</Link>
                      <Link href="/applications" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Applications</Link>
                      <Link href="/skills" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Skills</Link>
                      <Link href="/portfolio" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Portfolio</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/admin/analytics" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Analytics</Link>
                      <Link href="/admin/cohorts" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Cohorts</Link>
                      <Link href="/admin/reports" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Reports</Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: Auth Buttons or Avatar */}
            <div className="flex items-center gap-4 relative">
              {!isLoggedIn ? (
                <>

                  {/* Auth Buttons Split Pattern */}
                  <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-md hover:bg-white/5">
                    Log In
                  </Link>
                  <Link href="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 transition-transform hover:scale-105 shadow-md shadow-blue-500/20">
                    Sign Up &rarr;
                  </Link>
                </>
              ) : (
                <>
                  {/* Avatar Dropdown Mock */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-900 border border-blue-700 hover:ring-2 ring-blue-500 transition-all focus:outline-none"
                    >
                      <span className="text-sm font-medium text-blue-100">
                        {userRole === 'student' ? 'ST' : 'AD'}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-md border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl py-1 z-50">
                        <div className="px-4 py-2 border-b border-white/10">
                          <p className="text-sm font-medium text-white">Demo User</p>
                          <p className="text-xs text-gray-400">{userRole === 'student' ? 'student@example.com' : 'admin@example.com'}</p>
                        </div>
                        <div className="py-1">
                          <button className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">
                            <User className="mr-2 h-4 w-4" /> Profile
                          </button>
                          <button className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">
                            <Settings className="mr-2 h-4 w-4" /> Settings
                          </button>
                        </div>
                        <div className="py-1 border-t border-white/10">
                          <button 
                            onClick={() => setIsLoggedIn(false)}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <LogOut className="mr-2 h-4 w-4" /> Log out
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
      </div>
    </nav>
  )
}
