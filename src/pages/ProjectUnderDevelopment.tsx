import React from 'react';

export default function ProjectUnderDevelopment() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b' }}>Project Under Development</h1>
      <p style={{ fontSize: '1.25rem', marginTop: '1rem', color: '#334155' }}>
        For inquiries, contact <a href="mailto:admin@placementbridge.org" style={{ color: '#2563eb', textDecoration: 'underline' }}>admin@placementbridge.org</a>
      </p>
    </div>
  );
}
