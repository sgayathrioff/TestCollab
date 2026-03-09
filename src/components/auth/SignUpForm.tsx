"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, Check, CheckCircle2, Github } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Password Strength Logic
  const getStrength = (pass: string) => {
    let strength = 0;
    if (pass.length > 5) strength += 1;
    if (pass.length > 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9!@#$%^&*]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getStrength(password);
  
  const getStrengthColor = () => {
    if (strength === 0) return "bg-stone-200";
    if (strength <= 1) return "bg-red-400";
    if (strength <= 2) return "bg-orange-400";
    if (strength <= 3) return "bg-yellow-400";
    return "bg-green-500";
  };
  
  const getStrengthText = () => {
    if (strength === 0) return "";
    if (strength <= 1) return "Weak";
    if (strength <= 2) return "Fair";
    if (strength <= 3) return "Good";
    return "Strong";
  };

  const handleSocialSignUp = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(`Failed to sign up with ${provider}.`);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting signup with:", {
        email: email.trim(),
        name: name.trim(),
        passwordLength: password.length
      });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          // This data is passed to the SQL Trigger 'handle_new_user'
          data: {
            full_name: name.trim(),
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
          },
        },
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Supabase signup error:", error);
        throw error;
      }

      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        setSuccess(true);
      } else if (data.user) {
        // User is immediately confirmed, redirect to dashboard
        router.push('/auth/callback');
      }

    } catch (err: any) {
      console.error("Signup error details:", err);
      
      // Handle specific error cases
      if (err.message?.includes("email rate limit exceeded") || err.message?.includes("rate limit") || err.message?.includes("Too Many Requests")) {
        setIsRateLimited(true);
        setError("Too many signup attempts. Please wait 5-10 minutes before trying again, or try logging in if you already have an account.");
        
        // Auto-clear rate limit state after 5 minutes
        setTimeout(() => {
          setIsRateLimited(false);
          setError("");
        }, 5 * 60 * 1000);
      } else if (err.message?.includes("User already registered")) {
        setError("This email is already registered. Try logging in instead.");
      } else if (err.message?.includes("Invalid email")) {
        setError("Please enter a valid email address.");
      } else if (err.message?.includes("Password")) {
        setError("Password must be at least 6 characters with a mix of letters and numbers.");
      } else if (err.message?.includes("Signup is disabled")) {
        setError("Account creation is temporarily disabled. Please try again later.");
      } else {
        setError(err.message || "Failed to create account. Please check your information and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-10 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">Create Account</h2>
      <p className="text-center text-stone-500 mb-6">Start organizing your creative flow.</p>

      {error && (
        <div className="text-red-500 text-center mb-4 text-sm font-medium bg-red-50 p-3 rounded-xl">
          {error}
          
          {/* Rate limit specific help */}
          {error.includes("rate limit") && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-600 mb-2">While you wait, you can:</p>
              <div className="flex gap-2 justify-center">
                <Link href="/login" className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-full text-xs font-medium transition-colors">
                  Try Login Instead
                </Link>
                <button 
                  onClick={() => {setError(""); setEmail(""); setPassword(""); setName("");}} 
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-full text-xs font-medium transition-colors"
                >
                  Clear Form
                </button>
              </div>
            </div>
          )}

          {/* Already registered help */}
          {error.includes("already registered") && (
            <div className="mt-2">
              <Link href="/login" className="text-xs underline hover:no-underline">
                Go to Login →
              </Link>
            </div>
          )}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-900 mb-1">Account created! 🎉</p>
              <p className="text-xs text-green-700">Check your email to confirm your account. After confirming, you can log in.</p>
            </div>
          </div>
          <Link
            href="/login"
            className="mt-3 block w-full py-2 text-center bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      )}

      {!success && (
        <>
      <form onSubmit={handleSignUp} className="space-y-4">
        
        {/* Full Name */}
        <div className="space-y-1">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-stone-900 focus:outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400"
              required
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <div className="relative group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-stone-900 focus:outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400 peer valid:border-green-500/50 valid:bg-green-50/30"
              required
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
            {email.includes("@") && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="relative group">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Create Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-stone-900 focus:outline-none transition-all font-medium text-stone-900 placeholder:text-stone-400"
              required
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900">
               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Strength Bar */}
          <div className="h-1 w-full bg-stone-100 rounded-full mt-2 overflow-hidden flex">
            <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(strength / 4) * 100}%` }}></div>
          </div>
          <p className={`text-[10px] font-bold uppercase text-right mt-1 ${getStrengthColor().replace('bg-', 'text-')}`}>
            {getStrengthText()}
          </p>
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group mt-2">
          <div className="relative flex items-center">
            <input type="checkbox" className="peer sr-only" required />
            <div className="w-5 h-5 border-2 border-stone-300 rounded-md peer-checked:bg-[#1c1917] peer-checked:border-[#1c1917] transition-all flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-sm text-stone-500 leading-tight group-hover:text-stone-700 transition-colors">
            I agree to the <a href="#" className="font-bold underline text-stone-900">Terms</a> and <a href="#" className="font-bold underline text-stone-900">Privacy Policy</a>.
          </span>
        </label>

        <button 
          type="submit" 
          disabled={loading || isRateLimited}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 mt-2 transition-all shadow-xl shadow-stone-900/10 ${
            isRateLimited 
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
              : loading 
                ? 'bg-stone-600 text-white' 
                : 'bg-[#1c1917] text-white hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98]'
          } disabled:opacity-70`}
        >
          {isRateLimited 
            ? "Rate Limited - Try Again Later" 
            : loading 
              ? "Creating..." 
              : "Create Account"}
        </button>
      </form>

      <div className="relative flex items-center py-6">
        <div className="grow border-t border-stone-200"></div>
        <span className="shrink-0 mx-4 text-stone-400 text-xs font-bold uppercase">Or continue with</span>
        <div className="grow border-t border-stone-200"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          type="button"
          onClick={() => handleSocialSignUp('google')}
          className="flex items-center justify-center gap-2 py-3 border-2 border-stone-100 rounded-xl hover:bg-white hover:border-stone-200 transition-all font-medium text-stone-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
          Google
        </button>
        <button 
          type="button"
          onClick={() => handleSocialSignUp('github')}
          className="flex items-center justify-center gap-2 py-3 border-2 border-stone-100 rounded-xl hover:bg-white hover:border-stone-200 transition-all font-medium text-stone-600"
        >
          <Github className="w-5 h-5" />
          GitHub
        </button>
      </div>

      <p className="text-center text-stone-500 font-medium">
        Already have an account?{" "}
        <Link href="/login" className="text-stone-900 font-bold hover:underline">
          Login
        </Link>
      </p>
      </>
      )}
    </div>
  );
}