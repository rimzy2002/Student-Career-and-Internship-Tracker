"use client"

import { Home, Sparkles, FileText, CheckCircle } from 'lucide-react'
import { NavBar as TubelightNavBar } from "@/components/ui/tubelight-navbar"

export function Navbar() {
  const navItems = [
    { name: 'Home', url: '#', icon: Home },
    { name: 'Features', url: '#features', icon: Sparkles },
    { name: 'Resume AI', url: '#', icon: FileText },
    { name: 'Tracker', url: '#', icon: CheckCircle }
  ]

  return <TubelightNavBar items={navItems} />
}
