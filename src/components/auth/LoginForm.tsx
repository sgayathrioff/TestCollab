"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Github, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // SUPABASE LOGIN LOGIC
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), // Trim spaces!
        password,
      });

      if (error) throw error;

      // Success - redirect to user's specific dashboard
      if (data?.user) {
        router.push(`/dashboard/${data.user.id}`);
      } else {
        router.push("/dashboard");
      }

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Email not confirmed")) {
        setError("Please check your email and confirm your account before logging in.");
      } else if (err.message?.includes("Invalid")) {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      // SUPABASE OAUTH LOGIC
      // Note: You must enable Google/GitHub in your Supabase Dashboard -> Auth -> Providers
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(`Failed to sign in with ${provider}.`);
    }
  };

 return (
    <div className="px-10 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">Welcome back</h2>
      <p className="text-center text-stone-500 mb-8">Enter your details to access your flow.</p>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-xl text-center font-medium border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 ml-3">Email Address</label>
          <div className="relative group">
            <input 
              type="email" 
              placeholder="alex@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-stone-900 focus:outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400"
              required
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between ml-3">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Password</label>
            <a href="#" className="text-xs font-bold text-stone-900 hover:text-lime-600 transition-colors">Forgot?</a>
          </div>
          <div className="relative group">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-stone-900 focus:outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400"
              required
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-[#1c1917] text-white rounded-2xl font-bold text-lg hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-stone-900/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"} 
          {!loading && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>

      <div className="relative flex items-center py-8">
        <div className="grow border-t border-stone-200"></div>
        <span className="shrink-0 mx-4 text-stone-400 text-xs font-bold uppercase">Or continue with</span>
        <div className="grow border-t border-stone-200"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => handleSocialLogin('google')}
          className="flex items-center justify-center gap-2 py-3 border-2 border-stone-100 rounded-xl hover:bg-white hover:border-stone-200 transition-all font-medium text-stone-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
          Google
        </button>
        <button 
          onClick={() => handleSocialLogin('github')}
          className="flex items-center justify-center gap-2 py-3 border-2 border-stone-100 rounded-xl hover:bg-white hover:border-stone-200 transition-all font-medium text-stone-600"
        >
          <Github className="w-5 h-5" />
          GitHub
        </button>
      </div>

      <p className="text-center text-stone-500 font-medium">
        Don't have an account?{" "}
        <Link href="/signup" className="text-stone-900 font-bold hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}