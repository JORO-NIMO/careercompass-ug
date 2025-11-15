import React, { useState } from 'react';

const FeedbackModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  const submit = async () => {
    // simple client-side submit to /api/feedback
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, rating }),
    }).catch(() => null);
    setOpen(false);
    setMessage('');
    setRating(null);
  };

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-1 rounded bg-primary text-white">
        Send feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-medium mb-2">Send feedback</h3>
            <label className="block text-sm">Rating (1-5)</label>
            <input type="number" min={1} max={5} value={rating ?? ''} onChange={(e) => setRating(Number(e.target.value) || null)} className="w-24 p-2 border rounded mt-1 mb-3" />
            <label className="block text-sm">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-2 border rounded mt-1 mb-3" rows={5} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Cancel</button>
              <button onClick={submit} className="px-3 py-1 rounded bg-primary text-white">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackModal;
