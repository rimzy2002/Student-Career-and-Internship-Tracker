"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRole: "student" | "admin";
}

/**
 * Client-Side Route and Role Guard
 * 
 * Enforces authentication and role-based access for protected client layouts (/student/*, /admin/*).
 * Prevents flashing protected DOM content by holding render until the active session and role
 * are verified against localStorage.
 */
export function AuthGuard({ children, allowedRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // Only execute on browser client
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // 1. Check if token or user profile is missing
    if (!token || !storedUser) {
      const redirectTarget = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectTarget);
      return;
    }

    // 2. Client-side check for JWT expiration if token has standard structure
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token is expired; clear stale session
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          const redirectTarget = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
          router.replace(redirectTarget);
          return;
        }
      }
    } catch {
      // If parsing fails, fall back to backend API validation
    }

    // 3. Parse and validate stored user object and role
    try {
      const user = JSON.parse(storedUser);
      const role = user?.role;

      if (!role || (role !== "student" && role !== "admin")) {
        // Corrupt or unrecognized role; reset session and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      // 4. Role mismatch handling
      if (role !== allowedRole) {
        if (role === "student") {
          // Student attempting to access admin route
          router.replace("/student/dashboard");
        } else if (role === "admin") {
          // Admin attempting to access student route
          router.replace("/admin/dashboard");
        } else {
          router.replace("/login");
        }
        return;
      }

      // 5. Authorized session - defer to next tick to avoid synchronous setState cascading render
      setTimeout(() => {
        setIsAuthorized(true);
        setChecking(false);
      }, 0);
    } catch {
      // Malformed JSON stored in localStorage

      console.error("Malformed session data encountered; clearing session.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [router, pathname, allowedRole]);

  // While verifying, render a minimal non-intrusive loading placeholder to prevent DOM content flash
  if (checking || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Verifying access permissions...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
