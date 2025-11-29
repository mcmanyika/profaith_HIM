-- Create navigation_links table for sidebar navigation
CREATE TABLE IF NOT EXISTS public.navigation_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    href text NOT NULL,
    icon_name text NOT NULL,
    display_order integer DEFAULT 0,
    min_user_level integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default navigation links
INSERT INTO public.navigation_links (name, href, icon_name, display_order, min_user_level) VALUES
    ('Dashboard', '/account', 'HomeIcon', 1, 1),
    ('Members', '/members', 'UsersIcon', 2, 1),
    ('Ministries', '/ministries', 'BuildingLibraryIcon', 3, 1),
    ('Small Groups', '/groups', 'UserGroupIcon', 4, 1),
    ('Giving', '/payments', 'BriefcaseIcon', 5, 1),
    ('Announcements', '/announcements', 'MegaphoneIcon', 6, 1),
    ('My Profile', '/profile', 'UserIcon', 7, 1),
    ('Documents', '/documents', 'DocumentTextIcon', 8, 1),
    ('Media', '/youtube', 'VideoCameraIcon', 9, 1),
    ('Upload Projects', '/proposals/upload', 'DocumentPlusIcon', 10, 5)
ON CONFLICT DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_navigation_links_display_order ON navigation_links(display_order);
CREATE INDEX IF NOT EXISTS idx_navigation_links_is_active ON navigation_links(is_active);
CREATE INDEX IF NOT EXISTS idx_navigation_links_min_user_level ON navigation_links(min_user_level);

-- Enable RLS
ALTER TABLE navigation_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for navigation_links
CREATE POLICY "Anyone can view active navigation links"
    ON navigation_links FOR SELECT
    USING (is_active = true);

-- Add comment
COMMENT ON TABLE navigation_links IS 'Sidebar navigation links for the application';

