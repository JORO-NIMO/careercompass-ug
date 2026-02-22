// Modern responsive landing page for PlacementBridge prelaunch waitlist
// Sections: Hero, Explanation, Features, Student Waitlist Form, Recruiter Form

import React, { useState } from 'react';

export default function LandingPage() {
  // Student form state
  const [studentForm, setStudentForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    field_of_study: '',
    country: '',
  });
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSuccess, setStudentSuccess] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Recruiter form state
  const [recruiterForm, setRecruiterForm] = useState({
    company_name: '',
    email: '',
    roles_hiring: '',
  });
  const [recruiterLoading, setRecruiterLoading] = useState(false);
  const [recruiterSuccess, setRecruiterSuccess] = useState(false);
  const [recruiterError, setRecruiterError] = useState('');

  // Handle student form submit
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoading(true);
    setStudentError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
      });
      const data = await res.json();
      if (data.success) {
        setStudentSuccess(true);
      } else {
        setStudentError(data.error || 'Submission failed');
      }
    } catch (err) {
      setStudentError('Network error');
    }
    setStudentLoading(false);
  };

  // Handle recruiter form submit
  const handleRecruiterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecruiterLoading(true);
    setRecruiterError('');
    try {
      const res = await fetch('/api/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recruiterForm),
      });
      const data = await res.json();
      if (data.success) {
        setRecruiterSuccess(true);
      } else {
        setRecruiterError(data.error || 'Submission failed');
      }
    } catch (err) {
      setRecruiterError('Network error');
    }
    setRecruiterLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-[#1a2236] flex flex-col items-center justify-center text-[#1a2236]">
      {/* Hero Section */}
      <section className="w-full max-w-xl mx-auto py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-green-600">PlacementBridge is being upgraded</h1>
        <p className="text-lg md:text-xl mb-6">We’re refining our platform to deliver the best AI-powered job matching experience for students and recruiters.</p>
      </section>

      {/* Explanation Section */}
      <section className="w-full max-w-xl mx-auto py-6 text-center">
        <h2 className="text-2xl font-semibold mb-2">What’s coming soon?</h2>
        <p className="mb-4">Auto-Apply agent, AI job matching, opportunity alerts, and more. PlacementBridge will help you discover and apply to jobs faster, smarter, and globally.</p>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-xl mx-auto py-6 text-center">
        <h3 className="text-xl font-semibold mb-2">Upcoming Features</h3>
        <ul className="list-disc list-inside text-left mx-auto mb-4">
          <li>SMS alerts for new jobs</li>
          <li>Internships & remote jobs</li>
          <li>Global listings</li>
        </ul>
      </section>

      {/* Student Waitlist Form */}
      <section className="w-full max-w-xl mx-auto py-6">
        <h4 className="text-lg font-semibold mb-2 text-green-600">Student Early Access Waitlist</h4>
        <div className="bg-white rounded shadow p-4">
          <p className="mb-2">Sign up to be the first to access PlacementBridge!</p>
          {studentSuccess ? (
            <div className="text-green-700 font-semibold">You are on the early access list!</div>
          ) : (
            <form onSubmit={handleStudentSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="Full Name*"
                value={studentForm.full_name}
                onChange={e => setStudentForm(f => ({ ...f, full_name: e.target.value }))
                required
                className="w-full p-2 border rounded"
                disabled={studentLoading || studentSuccess}
              />
              <input
                type="email"
                placeholder="Email*"
                value={studentForm.email}
                onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))
                required
                className="w-full p-2 border rounded"
                disabled={studentLoading || studentSuccess}
              />
              <input
                type="text"
                placeholder="Phone"
                value={studentForm.phone}
                onChange={e => setStudentForm(f => ({ ...f, phone: e.target.value }))
                className="w-full p-2 border rounded"
                disabled={studentLoading || studentSuccess}
              />
              <input
                type="text"
                placeholder="Field of Study"
                value={studentForm.field_of_study}
                onChange={e => setStudentForm(f => ({ ...f, field_of_study: e.target.value }))
                className="w-full p-2 border rounded"
                disabled={studentLoading || studentSuccess}
              />
              <input
                type="text"
                placeholder="Country"
                value={studentForm.country}
                onChange={e => setStudentForm(f => ({ ...f, country: e.target.value }))
                className="w-full p-2 border rounded"
                disabled={studentLoading || studentSuccess}
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white font-semibold py-2 rounded disabled:opacity-50"
                disabled={studentLoading || studentSuccess}
              >
                {studentLoading ? 'Submitting...' : 'Join Waitlist'}
              </button>
              {studentError && <div className="text-red-600 text-sm">{studentError}</div>}
            </form>
          )}
        </div>
      </section>

      {/* Recruiter/Partner Form */}
      <section className="w-full max-w-xl mx-auto py-6">
        <h4 className="text-lg font-semibold mb-2 text-green-600">Recruiter / Partner Interest</h4>
        <div className="bg-white rounded shadow p-4">
          <p className="mb-2">Interested in hiring or partnering? Let us know!</p>
          {recruiterSuccess ? (
            <div className="text-green-700 font-semibold">Thank you for your interest!</div>
          ) : (
            <form onSubmit={handleRecruiterSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="Company Name*"
                value={recruiterForm.company_name}
                onChange={e => setRecruiterForm(f => ({ ...f, company_name: e.target.value }))
                required
                className="w-full p-2 border rounded"
                disabled={recruiterLoading || recruiterSuccess}
              />
              <input
                type="email"
                placeholder="Email*"
                value={recruiterForm.email}
                onChange={e => setRecruiterForm(f => ({ ...f, email: e.target.value }))
                required
                className="w-full p-2 border rounded"
                disabled={recruiterLoading || recruiterSuccess}
              />
              <input
                type="text"
                placeholder="Roles Hiring For"
                value={recruiterForm.roles_hiring}
                onChange={e => setRecruiterForm(f => ({ ...f, roles_hiring: e.target.value }))
                className="w-full p-2 border rounded"
                disabled={recruiterLoading || recruiterSuccess}
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white font-semibold py-2 rounded disabled:opacity-50"
                disabled={recruiterLoading || recruiterSuccess}
              >
                {recruiterLoading ? 'Submitting...' : 'Submit Interest'}
              </button>
              {recruiterError && <div className="text-red-600 text-sm">{recruiterError}</div>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
