"use client";

import { ArrowRight, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null); setMessage(null); setIsSubmitting(true);
    try {
      if (mode === "signup") {
        if (displayName.trim().length < 2) throw new Error("Please enter the name you would like Orbit to use.");
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("Account created. Check your inbox to confirm your email, then sign in.");
      } else {
        const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not complete that request.");
    } finally { setIsSubmitting(false); }
  }

  return <main className="grid min-h-screen place-items-center bg-[#050505] px-5 py-10 text-[#fffaf7]"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0e0d0c] p-6 shadow-2xl shadow-black/40 sm:p-8"><div className="grid size-12 place-items-center rounded-2xl bg-[#ff8a2a] text-black shadow-lg shadow-[#ff8a2a]/20"><Sparkles size={21} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#ffc18c]">Orbit account</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-white">{mode === "login" ? "Welcome back." : "Start your orbit."}</h1><p className="mt-3 text-sm leading-6 text-[#b7a99f]">Your plans, focus sessions, and momentum stay private to your account.</p>{!isSupabaseConfigured ? <div className="mt-7 rounded-2xl border border-[#ff9f43]/30 bg-[#ff9f43]/10 p-4 text-sm leading-6 text-[#ffd1a8]"><p className="font-semibold text-white">Connect Supabase first</p><p className="mt-1">Add your project URL and publishable/anon key to <code className="text-[#ffc18c]">frontend/.env.local</code>, then restart Next.js.</p></div> : <><div className="mt-7 grid grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1"><button type="button" onClick={() => { setMode("login"); setError(null); setMessage(null); }} className={mode === "login" ? "rounded-lg bg-[#ff9f43] px-3 py-2 text-sm font-bold text-black" : "rounded-lg px-3 py-2 text-sm text-[#b7a99f]"}>Log in</button><button type="button" onClick={() => { setMode("signup"); setError(null); setMessage(null); }} className={mode === "signup" ? "rounded-lg bg-[#ff9f43] px-3 py-2 text-sm font-bold text-black" : "rounded-lg px-3 py-2 text-sm text-[#b7a99f]"}>Sign up</button></div><form onSubmit={submit} className="mt-6 space-y-4">{mode === "signup" && <label className="block text-sm text-[#ffd1a8]">Your name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={100} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-[#715d51] focus:border-[#ff9f43]" placeholder="What should Orbit call you?" /></label>}<label className="block text-sm text-[#ffd1a8]">Email<input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-[#715d51] focus:border-[#ff9f43]" placeholder="you@example.com" /></label><label className="block text-sm text-[#ffd1a8]">Password<input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "signup" ? 8 : undefined} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-[#715d51] focus:border-[#ff9f43]" placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} /></label>{error && <p role="alert" className="rounded-xl border border-[#ff5151]/30 bg-[#ff5151]/10 p-3 text-sm text-[#ffb0b0]">{error}</p>}{message && <p role="status" className="rounded-xl border border-[#ff9f43]/30 bg-[#ff9f43]/10 p-3 text-sm text-[#ffd1a8]">{message}</p>}<button disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff9f43] px-4 py-3 font-bold text-black transition hover:bg-[#ffc078] disabled:opacity-60">{isSubmitting ? "Please wait..." : mode === "login" ? "Enter Orbit" : "Create my account"}<ArrowRight size={17} /></button></form></>}<div className="mt-7 flex items-center gap-2 text-xs text-[#8d7a70]"><LockKeyhole size={14} /><span>Email/password authentication is handled securely by Supabase.</span></div><div className="mt-4 flex items-center gap-2 text-xs text-[#8d7a70]"><UserRound size={14} /><span>One account, one private Orbit.</span></div></section></main>;
}
