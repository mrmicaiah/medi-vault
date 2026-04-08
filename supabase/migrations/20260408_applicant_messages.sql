-- Applicant messages table
-- Messages from managers to specific applicants, shown on their dashboard

CREATE TABLE IF NOT EXISTS applicant_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES profiles(id),
  posted_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by application
CREATE INDEX IF NOT EXISTS idx_applicant_messages_application_id ON applicant_messages(application_id);

-- RLS policies
ALTER TABLE applicant_messages ENABLE ROW LEVEL SECURITY;

-- Staff (manager, admin, superadmin) can create/read/update/delete messages
CREATE POLICY "Staff can manage applicant messages" ON applicant_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin', 'superadmin')
    )
  );

-- Applicants can only read messages for their own application
CREATE POLICY "Applicants can read their own messages" ON applicant_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = applicant_messages.application_id
      AND applications.user_id = auth.uid()
    )
  );
