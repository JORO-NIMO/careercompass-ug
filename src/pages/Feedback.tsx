import React from 'react';
import FeedbackModal from '@/components/common/FeedbackModal';

const FeedbackPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Feedback</h1>
      <p className="mb-4">Use the form below to submit feedback, report issues or suggest improvements.</p>
      <FeedbackModal />
    </div>
  );
};

export default FeedbackPage;
