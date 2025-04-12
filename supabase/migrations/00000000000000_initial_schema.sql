-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number TEXT NOT NULL UNIQUE,
    holder_id UUID NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    coverage_amount DECIMAL NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create claims table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id),
    claimant_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
    type TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id),
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_trail table
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id),
    action TEXT NOT NULL,
    actor_id UUID NOT NULL,
    changes JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_policies_holder_id ON policies(holder_id);
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_documents_claim_id ON documents(claim_id);
CREATE INDEX idx_audit_trail_claim_id ON audit_trail(claim_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
CREATE POLICY "Enable read access for authenticated users" ON policies
    FOR SELECT
    TO authenticated
    USING (auth.uid() = holder_id);

CREATE POLICY "Enable read access for authenticated users" ON claims
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policies
            WHERE policies.id = claims.policy_id
            AND policies.holder_id = auth.uid()
        )
        OR claimant_id = auth.uid()
    );

CREATE POLICY "Enable read access for authenticated users" ON documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM claims
            WHERE claims.id = documents.claim_id
            AND (
                EXISTS (
                    SELECT 1 FROM policies
                    WHERE policies.id = claims.policy_id
                    AND policies.holder_id = auth.uid()
                )
                OR claims.claimant_id = auth.uid()
            )
        )
    );