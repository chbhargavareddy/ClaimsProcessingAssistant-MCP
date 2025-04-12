-- Enhance documents table with additional fields and constraints
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'verified', 'rejected')),
    ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS hash TEXT,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS verification_result JSONB;

-- Create document categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    required_for_claims BOOLEAN DEFAULT false,
    allowed_mime_types TEXT[] NOT NULL,
    max_file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add category reference to documents
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id);

-- Create document verification history
CREATE TABLE IF NOT EXISTS document_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id),
    verified_by UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL,
    notes TEXT,
    verification_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_document_id 
    ON document_verifications(document_id);

-- Enable RLS on new tables
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all authenticated users" ON document_categories
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for document verifications" ON document_verifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN claims c ON d.claim_id = c.id
            WHERE d.id = document_verifications.document_id
            AND (
                EXISTS (
                    SELECT 1 FROM policies p
                    WHERE p.id = c.policy_id
                    AND p.holder_id = auth.uid()
                )
                OR c.claimant_id = auth.uid()
            )
        )
    );

-- Create function to verify document
CREATE OR REPLACE FUNCTION verify_document(
    p_document_id UUID,
    p_status TEXT,
    p_notes TEXT,
    p_verification_data JSONB,
    p_verifier_id UUID
)
RETURNS void AS $$
BEGIN
    -- Validate status
    IF p_status NOT IN ('verified', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be either verified or rejected';
    END IF;

    -- Update document
    UPDATE documents
    SET status = p_status,
        verified_by = p_verifier_id,
        verified_at = CURRENT_TIMESTAMP,
        verification_result = p_verification_data
    WHERE id = p_document_id;

    -- Create verification history entry
    INSERT INTO document_verifications (
        document_id,
        verified_by,
        status,
        notes,
        verification_data
    ) VALUES (
        p_document_id,
        p_verifier_id,
        p_status,
        p_notes,
        p_verification_data
    );
END;
$$ LANGUAGE plpgsql;

-- Insert initial document categories
INSERT INTO document_categories (name, description, required_for_claims, allowed_mime_types, max_file_size_bytes)
VALUES 
    ('Medical Report', 'Official medical documentation', true, 
     ARRAY['application/pdf', 'image/jpeg', 'image/png'], 10485760),
    ('Invoice', 'Payment or service invoice', true, 
     ARRAY['application/pdf', 'image/jpeg', 'image/png'], 5242880),
    ('ID Proof', 'Government issued identification', true, 
     ARRAY['application/pdf', 'image/jpeg', 'image/png'], 5242880),
    ('Supporting Document', 'Additional supporting documentation', false, 
     ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 
     20971520)
ON CONFLICT (name) DO NOTHING;