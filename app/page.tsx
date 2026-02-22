// Modern responsive landing page for PlacementBridge prelaunch waitlist
// Sections: Hero, Explanation, Features, Student Waitlist Form, Recruiter Form

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function LandingPage() {

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Register with email/password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess(false);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthSuccess(true);
      }
    } catch (err) {
      setAuthError('Registration failed.');
    }
    setAuthLoading(false);
  };

  // Register with Google
  const handleGoogle = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
        },
      });
      if (error) setAuthError(error.message);
    } catch (err) {
      setAuthError('Google sign-in failed.');
    }
    setAuthLoading(false);
  };

  // Magic link
  const handleMagicLink = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      setAuthError('Failed to send magic link.');
    }
    setAuthLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center text-[#1a2236] px-2">
      {/* Hero Section */}
      <section className="w-full max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-green-700 drop-shadow">PlacementBridge v1 & v2 Early Access</h1>
        <p className="text-xl mb-6 text-green-900">Register now to get early access to our next-generation AI-powered job and internship platform.</p>
      </section>

      {/* Registration Section */}
      <section className="w-full max-w-md mx-auto py-8">
        <div className="bg-white/90 rounded-xl shadow-lg p-8 border border-green-100">
          <h2 className="text-2xl font-bold mb-4 text-green-700">Register for Early Access</h2>
          <p className="mb-4 text-green-900">Sign up with email or Google to access PlacementBridge v1 and v2 as soon as they launch.</p>
          {authSuccess && (
            <div className="text-green-700 font-semibold mb-4">Registration successful! Check your email to verify and access the platform.</div>
          )}
          {magicLinkSent && (
            <div className="text-green-700 font-semibold mb-4">Magic link sent! Check your email to access PlacementBridge.</div>
          )}
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full p-2 border border-green-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={authLoading}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              className="w-full p-2 border border-green-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={authLoading}
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-semibold py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
              disabled={authLoading}
            >
              {authLoading ? 'Registering...' : 'Register with Email'}
            </button>
          </form>
          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-green-200" />
            <span className="text-green-700 text-sm">or</span>
            <div className="flex-1 h-px bg-green-200" />
          </div>
          <button
            onClick={handleGoogle}
            className="w-full bg-white border border-green-300 text-green-700 font-semibold py-2 rounded hover:bg-green-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={authLoading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" className="inline-block mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.7 30.18 0 24 0 14.82 0 6.71 5.82 2.69 14.29l7.99 6.2C12.13 14.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.04l7.18 5.59C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.68 28.49a14.5 14.5 0 0 1 0-9.01l-7.99-6.2A23.94 23.94 0 0 0 0 24c0 3.93.94 7.65 2.69 10.91l7.99-6.42z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.14-5.59l-7.18-5.59c-2.01 1.35-4.59 2.16-7.96 2.16-6.43 0-11.87-4.63-13.32-10.8l-7.99 6.42C6.71 42.18 14.82 48 24 48z"/></g></svg>
            Continue with Google
          </button>
          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-green-200" />
            <span className="text-green-700 text-sm">or</span>
            <div className="flex-1 h-px bg-green-200" />
          </div>
          <button
            onClick={handleMagicLink}
            className="w-full bg-green-100 text-green-800 font-semibold py-2 rounded hover:bg-green-200 transition disabled:opacity-50"
            disabled={authLoading || !email}
          >
            {authLoading ? 'Sending...' : 'Send Magic Link to Email'}
          </button>
          {authError && <div className="text-red-600 text-sm mt-2">{authError}</div>}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-xl mx-auto py-6 text-center">
        <h3 className="text-xl font-semibold mb-2 text-green-700">Why PlacementBridge?</h3>
        <ul className="list-disc list-inside text-left mx-auto mb-4 text-green-900">
          <li>AI-powered job and internship matching</li>
          <li>Auto-Apply agent for one-click applications</li>
          <li>SMS/email alerts for new opportunities</li>
          <li>Global listings and remote jobs</li>
          <li>Exclusive early access to v1 and v2</li>
        </ul>
      </section>

      {/* Optionally, add more info or testimonials here */}
    </main>
  );
}
