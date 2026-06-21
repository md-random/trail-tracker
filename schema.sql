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

-- Allow public read access to all non-deleted photos
CREATE POLICY "Allow public read access" ON photos
    FOR SELECT USING (is_deleted = FALSE);

-- Allow authenticated/admin inserts
CREATE POLICY "Allow authenticated inserts" ON photos
    FOR INSERT WITH CHECK (true);

-- Allow authenticated/admin updates
CREATE POLICY "Allow authenticated updates" ON photos
    FOR UPDATE USING (true);
