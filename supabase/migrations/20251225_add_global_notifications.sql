-- Add global notifications support and read tracking

BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS target_role text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.notifications
SET message = COALESCE(message, body)
WHERE message IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_reads_unique
  ON public.notification_reads (notification_id, user_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Replace notification policies to allow global broadcasts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Users can read notifications"
  ON public.notifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = created_by
    OR (
      user_id IS NULL
      AND (
        target_role IS NULL
        OR target_role = 'all'
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = target_role
        )
      )
    )
  );

CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notifications"
  ON public.notifications
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies for notification_reads
CREATE POLICY "Users can view notification reads"
  ON public.notification_reads
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert notification reads"
  ON public.notification_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update notification reads"
  ON public.notification_reads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete notification reads"
  ON public.notification_reads
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;
