"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      const nameParts = (user.displayName || "").split(" ");
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Send to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: user.email, 
          firstName, 
          lastName 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Google sign-in failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred with Google Sign-In");
    }
  };

  return (
    <div className="flex w-full flex-grow bg-background">
      
      {/* LEFT SIDE: Masonry / Stats Grid */}
      <div className="hidden lg:flex w-1/2 bg-muted p-8 xl:p-12 items-center justify-center relative overflow-hidden">
        {/* We use a CSS grid to recreate the masonry look from the screenshot */}
        <div className="grid grid-cols-2 gap-4 h-full w-full max-h-[800px] max-w-[700px]">
          
          {/* Top Left: Image */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-full min-h-[200px] relative">
            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop" alt="Typing on laptop" className="object-cover w-full h-full" />
          </div>

          {/* Top Right: Orange Stat */}
          <div className="rounded-2xl bg-[#f97316] text-white shadow-lg p-6 flex flex-col justify-center items-center text-center h-full min-h-[200px]">
            <h3 className="text-5xl md:text-6xl font-bold mb-2">41%</h3>
            <p className="text-sm opacity-90 leading-tight px-4">of recruiters say entry-level positions are the hardest to fill.</p>
          </div>

          {/* Middle Left: Image */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-full min-h-[200px] relative">
             <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop" alt="Lab environment" className="object-cover w-full h-full" />
          </div>

          {/* Middle Right: Image */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-full min-h-[200px] relative">
            <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop" alt="Server room" className="object-cover w-full h-full" />
          </div>

          {/* Bottom Left: Green Stat */}
          <div className="rounded-2xl bg-[#22c55e] text-white shadow-lg p-6 flex flex-col justify-center items-center text-center h-full min-h-[200px]">
            <h3 className="text-5xl md:text-6xl font-bold mb-2">76%</h3>
            <p className="text-sm opacity-90 leading-tight px-2">of hiring managers admit attracting the right job candidates is their greatest challenge.</p>
          </div>

          {/* Bottom Right: Image */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-full min-h-[200px] relative">
            <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop" alt="Coding desk" className="object-cover w-full h-full" />
          </div>

        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 sm:p-12 relative bg-background text-foreground">
        
        {/* Absolute Theme Toggle & Sign up link */}
        <div className="absolute top-6 right-8 flex items-center gap-6">
          <span className="text-sm text-muted-foreground hidden sm:inline-block">
            Don't have an account? <Link href="/register" className="text-blue-600 hover:underline font-medium">Sign up</Link>
          </span>
          <div className="relative w-8 h-8">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Sign up link */}
        <span className="text-sm text-muted-foreground sm:hidden absolute top-6 left-6">
           <Link href="/register" className="text-blue-600 hover:underline font-medium">Sign up instead</Link>
        </span>

        <div className="w-full max-w-[420px] space-y-8 mt-12 lg:mt-0">
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Sign in to <span className="text-blue-500">CareerTrack</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Welcome to CareerTrack, please enter your login details below to using the app.
            </p>
          </div>

          {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com" className="h-12 bg-background border-input" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 bg-background border-input pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Eye className="h-5 w-5" />
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link href="#" className="text-sm text-blue-600 hover:underline font-medium">
                  Forgot the password?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg rounded-md shadow-sm transition-all hover:shadow-md">
              {loading ? "Logging In..." : "Login"}
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm uppercase">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <Button type="button" onClick={handleGoogleSignIn} variant="outline" className="w-full h-12 bg-background border-input text-foreground font-medium rounded-md shadow-sm hover:bg-accent transition-all">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Login with Google
            </Button>
          </form>

        </div>
      </div>

    </div>
  );
}
