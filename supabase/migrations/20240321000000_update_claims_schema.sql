-- Add new columns to claims table
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS claimant_name TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reason TEXT;

-- Update claims status enum
ALTER TABLE claims 
    DROP CONSTRAINT IF EXISTS claims_status_check;

ALTER TABLE claims
    ADD CONSTRAINT claims_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add validation history table
CREATE TABLE IF NOT EXISTS validation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id),
    is_valid BOOLEAN NOT NULL,
    errors JSONB,
    warnings JSONB,
    validated_by UUID NOT NULL REFERENCES auth.users(id),
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for validation history
CREATE INDEX IF NOT EXISTS idx_validation_history_claim_id 
    ON validation_history(claim_id);

-- Add RLS for validation history
ALTER TABLE validation_history ENABLE ROW LEVEL SECURITY;

-- Create policy for validation history
CREATE POLICY "Enable read access for authenticated users" ON validation_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM claims
            WHERE claims.id = validation_history.claim_id
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

-- Add functions for claim processing
CREATE OR REPLACE FUNCTION process_claim(
    p_claim_id UUID,
    p_status TEXT,
    p_reason TEXT,
    p_processor_id UUID
)
RETURNS void AS $$
BEGIN
    -- Validate status
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be either approved or rejected';
    END IF;

    -- Update claim
    UPDATE claims
    SET status = p_status,
        processed_by = p_processor_id,
        processed_at = CURRENT_TIMESTAMP,
        reason = p_reason
    WHERE id = p_claim_id;

    -- Add audit trail entry
    INSERT INTO audit_trail (
        claim_id,
        action,
        actor_id,
        changes
    ) VALUES (
        p_claim_id,
        'CLAIM_PROCESSED',
        p_processor_id,
        jsonb_build_object(
            'status', p_status,
            'reason', p_reason,
            'processed_at', CURRENT_TIMESTAMP
        )
    );
END;
$$ LANGUAGE plpgsql;