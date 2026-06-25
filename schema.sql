-- Create the photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    state TEXT,
    city TEXT,
    landmark TEXT,
    description TEXT,
    confidence TEXT CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
    reasoning JSONB,
    tags TEXT[] DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow select access: public can see non-deleted, authenticated can see all
CREATE POLICY "Allow select access" ON photos
    FOR SELECT USING (is_deleted = FALSE OR auth.role() = 'authenticated');

-- Allow authenticated/admin inserts
CREATE POLICY "Allow authenticated inserts" ON photos
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated/admin updates (including soft deletes)
CREATE POLICY "Allow authenticated updates" ON photos
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
