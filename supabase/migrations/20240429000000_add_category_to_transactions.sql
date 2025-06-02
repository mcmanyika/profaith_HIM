-- Add investmentCategory column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS investmentCategory VARCHAR(50) DEFAULT 'real estate';

-- Set default value for existing records
UPDATE transactions
SET investmentCategory = 'real estate'
WHERE investmentCategory IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE transactions
ALTER COLUMN investmentCategory SET NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN transactions.investmentCategory IS 'Category of the investment (e.g., real estate, stocks, bonds, etc.)';

-- Create an index on the investmentCategory column for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_investment_category ON transactions(investmentCategory);

-- Drop the old version of the function
DROP FUNCTION IF EXISTS handle_payment_confirmation(text, uuid, uuid, numeric);

-- Update the handle_payment_confirmation function to include investmentCategory
CREATE OR REPLACE FUNCTION handle_payment_confirmation(
    p_payment_intent_id TEXT,
    p_proposal_id UUID,
    p_investor_id UUID,
    p_amount DECIMAL(10,2),
    p_investment_category VARCHAR(50) DEFAULT 'real estate'
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Insert into transactions table
    INSERT INTO transactions (
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        investmentCategory,
        metadata
    ) VALUES (
        p_payment_intent_id,
        p_amount,
        'usd',
        'succeeded',
        p_investment_category,
        jsonb_build_object(
            'proposal_id', p_proposal_id,
            'investor_id', p_investor_id
        )
    ) RETURNING id INTO v_transaction_id;

    -- Insert into investments table with reference to transaction
    INSERT INTO investments (
        amount,
        proposal_id,
        investor_id,
        payment_id,
        status
    ) VALUES (
        p_amount,
        p_proposal_id,
        p_investor_id,
        p_payment_intent_id,
        'COMPLETED'
    );

    -- Update proposal's raised amount
    PERFORM increment_proposal_investment(p_proposal_id, p_amount);

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql; 