-- ============================================
-- PROFAITH CHURCH MANAGEMENT SYSTEM MIGRATION
-- Transform investment platform to church management
-- ============================================

-- Step 1: Rename core tables
-- ============================================

-- Rename proposals to projects
ALTER TABLE IF EXISTS proposals RENAME TO projects;

-- Rename columns in projects table
ALTER TABLE projects 
  RENAME COLUMN investor_count TO donor_count;

ALTER TABLE projects 
  RENAME COLUMN amount_raised TO funds_raised;

-- Update indexes
DROP INDEX IF EXISTS idx_proposals_status;
DROP INDEX IF EXISTS idx_proposals_category;
DROP INDEX IF EXISTS idx_proposals_user_id;

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Rename investments to contributions
ALTER TABLE IF EXISTS investments RENAME TO contributions;

-- Rename columns in contributions table
ALTER TABLE contributions 
  RENAME COLUMN investor_id TO member_id;

-- Update indexes for contributions
DROP INDEX IF EXISTS idx_investments_investor_id;
DROP INDEX IF EXISTS idx_investments_proposal_id;

CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_proposal_id ON contributions(proposal_id);

-- Step 2: Update profiles table for church context
-- ============================================

-- Add church-specific columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS member_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS membership_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS baptism_date date,
  ADD COLUMN IF NOT EXISTS ministry_involvement text[];

-- Create index for member_status
CREATE INDEX IF NOT EXISTS idx_profiles_member_status ON profiles(member_status);

-- Step 3: Update storage bucket names
-- ============================================

-- Update storage bucket for projects (was proposals)
-- Note: This requires manual data migration if there's existing data
UPDATE storage.buckets 
SET name = 'projects' 
WHERE name = 'proposals';

-- Step 4: Update RLS policies
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own proposals" ON projects;
DROP POLICY IF EXISTS "Users can insert their own proposals" ON projects;
DROP POLICY IF EXISTS "Users can update their own proposals" ON projects;

-- Create new policies for projects
CREATE POLICY "Users can view their own projects"
    ON projects
    FOR SELECT
    USING (auth.uid() = user_id OR status = 'active');

CREATE POLICY "Users can insert their own projects"
    ON projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS on contributions if not already enabled
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Create policies for contributions
CREATE POLICY "Users can view their own contributions"
    ON contributions
    FOR SELECT
    USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own contributions"
    ON contributions
    FOR INSERT
    WITH CHECK (auth.uid() = member_id);

-- Step 5: Update transactions metadata references
-- ============================================

-- Note: JSONB updates for metadata would need to be done programmatically
-- as SQL doesn't easily support nested key renaming in JSONB
COMMENT ON TABLE transactions IS 'Updated to use project_id and member_id in metadata instead of proposal_id and investor_id';

-- Step 6: Add comments for documentation
-- ============================================

COMMENT ON TABLE projects IS 'Church projects and fundraising campaigns (formerly proposals)';
COMMENT ON TABLE contributions IS 'Member contributions and donations (formerly investments)';
COMMENT ON COLUMN projects.donor_count IS 'Number of unique donors (formerly investor_count)';
COMMENT ON COLUMN projects.funds_raised IS 'Total funds raised (formerly amount_raised)';
COMMENT ON COLUMN contributions.member_id IS 'Member who made the contribution (formerly investor_id)';

