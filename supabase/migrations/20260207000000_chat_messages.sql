-- Migration: Chat Messages for Conversation Memory
-- Stores chat history for AI conversation context
-- Created: 2026-02-07

BEGIN;

-- ============================================================================
-- CHAT MESSAGES TABLE
-- Stores conversation history between users and AI assistant
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert messages (for assistant responses)
CREATE POLICY "Service role can insert chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

-- Users can delete their own messages
CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RPC: Get Recent Chat History
-- Retrieves last N messages for a user or session
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chat_history(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NOT NULL THEN
    -- Get messages for specific session
    RETURN QUERY
    SELECT 
      cm.id,
      cm.role,
      cm.content,
      cm.created_at
    FROM chat_messages cm
    WHERE cm.user_id = p_user_id
      AND cm.session_id = p_session_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
  ELSE
    -- Get most recent messages across all sessions
    RETURN QUERY
    SELECT 
      cm.id,
      cm.role,
      cm.content,
      cm.created_at
    FROM chat_messages cm
    WHERE cm.user_id = p_user_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- ============================================================================
-- RPC: Save Chat Message
-- Saves a new message and returns the created record
-- ============================================================================

CREATE OR REPLACE FUNCTION save_chat_message(
  p_user_id UUID,
  p_session_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO chat_messages (user_id, session_id, role, content, metadata)
  VALUES (p_user_id, p_session_id, p_role, p_content, p_metadata)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- ============================================================================
-- RPC: Cleanup Old Chat Messages
-- Keeps only the last N messages per user
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_chat_messages(
  p_keep_count INT DEFAULT 100
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT := 0;
BEGIN
  -- Delete messages beyond the keep count for each user
  WITH ranked_messages AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM chat_messages
  ),
  to_delete AS (
    SELECT id
    FROM ranked_messages
    WHERE rn > p_keep_count
  )
  DELETE FROM chat_messages
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- RPC: Clear User Chat History
-- Allows users to clear their own chat history
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_chat_history(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT := 0;
BEGIN
  -- Verify the user is clearing their own history
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF p_session_id IS NOT NULL THEN
    DELETE FROM chat_messages
    WHERE user_id = p_user_id
      AND session_id = p_session_id;
  ELSE
    DELETE FROM chat_messages
    WHERE user_id = p_user_id;
  END IF;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

COMMIT;
