-- ============================================
-- PROFAITH CHURCH MANAGEMENT SYSTEM
-- Create new church-specific tables
-- ============================================

-- Table: ministries
-- ============================================
CREATE TABLE IF NOT EXISTS public.ministries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ministries_leader_id ON ministries(leader_id);
CREATE INDEX IF NOT EXISTS idx_ministries_name ON ministries(name);

-- Enable RLS
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ministries
CREATE POLICY "Anyone can view ministries"
    ON ministries FOR SELECT
    USING (true);

CREATE POLICY "Leaders can update their ministries"
    ON ministries FOR UPDATE
    USING (auth.uid() = leader_id)
    WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Authenticated users can create ministries"
    ON ministries FOR INSERT
    WITH CHECK (auth.uid() = leader_id);

-- Table: small_groups
-- ============================================
CREATE TABLE IF NOT EXISTS public.small_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    meeting_day text,
    meeting_time time,
    location text,
    member_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_small_groups_leader_id ON small_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_small_groups_meeting_day ON small_groups(meeting_day);

-- Enable RLS
ALTER TABLE small_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for small_groups
CREATE POLICY "Anyone can view small groups"
    ON small_groups FOR SELECT
    USING (true);

CREATE POLICY "Leaders can update their groups"
    ON small_groups FOR UPDATE
    USING (auth.uid() = leader_id)
    WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Authenticated users can create groups"
    ON small_groups FOR INSERT
    WITH CHECK (auth.uid() = leader_id);

-- Table: ministry_members (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ministry_members (
    ministry_id uuid REFERENCES public.ministries(id) ON DELETE CASCADE,
    member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text,
    joined_date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (ministry_id, member_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ministry_members_ministry_id ON ministry_members(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_members_member_id ON ministry_members(member_id);

-- Enable RLS
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ministry_members
CREATE POLICY "Anyone can view ministry members"
    ON ministry_members FOR SELECT
    USING (true);

CREATE POLICY "Members can manage their ministry participation"
    ON ministry_members FOR ALL
    USING (auth.uid() = member_id);

-- Table: small_group_members (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.small_group_members (
    group_id uuid REFERENCES public.small_groups(id) ON DELETE CASCADE,
    member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (group_id, member_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_small_group_members_group_id ON small_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_small_group_members_member_id ON small_group_members(member_id);

-- Enable RLS
ALTER TABLE small_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for small_group_members
CREATE POLICY "Anyone can view group members"
    ON small_group_members FOR SELECT
    USING (true);

CREATE POLICY "Members can manage their group participation"
    ON small_group_members FOR ALL
    USING (auth.uid() = member_id);

-- Table: announcements
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_audience text CHECK (target_audience IN ('all', 'ministry', 'group', 'members')),
    target_id uuid, -- ministry_id or group_id
    priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Anyone can view active announcements"
    ON announcements FOR SELECT
    USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Authors can manage their announcements"
    ON announcements FOR ALL
    USING (auth.uid() = author_id);

-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_ministries_updated_at BEFORE UPDATE ON ministries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_small_groups_updated_at BEFORE UPDATE ON small_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers to update member counts
-- ============================================

-- Function to update ministry member count
CREATE OR REPLACE FUNCTION update_ministry_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ministries 
        SET member_count = member_count + 1 
        WHERE id = NEW.ministry_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ministries 
        SET member_count = GREATEST(member_count - 1, 0) 
        WHERE id = OLD.ministry_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ministry_member_count_trigger
    AFTER INSERT OR DELETE ON ministry_members
    FOR EACH ROW EXECUTE FUNCTION update_ministry_member_count();

-- Function to update small group member count
CREATE OR REPLACE FUNCTION update_small_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE small_groups 
        SET member_count = member_count + 1 
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE small_groups 
        SET member_count = GREATEST(member_count - 1, 0) 
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER small_group_member_count_trigger
    AFTER INSERT OR DELETE ON small_group_members
    FOR EACH ROW EXECUTE FUNCTION update_small_group_member_count();

-- Add comments
-- ============================================

COMMENT ON TABLE ministries IS 'Church ministries and departments';
COMMENT ON TABLE small_groups IS 'Small groups and cell groups for fellowship';
COMMENT ON TABLE ministry_members IS 'Junction table for ministry member relationships';
COMMENT ON TABLE small_group_members IS 'Junction table for small group member relationships';
COMMENT ON TABLE announcements IS 'Church-wide and targeted announcements';

