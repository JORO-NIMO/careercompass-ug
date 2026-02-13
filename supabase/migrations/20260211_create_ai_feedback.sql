-- Create ai_feedback table for storing chat feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    message_id text NOT NULL,
    rating text CHECK (rating IN ('up', 'down')) NOT NULL,
    timestamp timestamptz DEFAULT now(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message_id ON ai_feedback(message_id);
