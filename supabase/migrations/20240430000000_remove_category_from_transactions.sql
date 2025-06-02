-- Remove investment_category from transactions table
ALTER TABLE transactions DROP COLUMN IF EXISTS investment_category;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_transactions_investment_category;

-- Update the handle_payment_confirmation function to remove the category parameter
CREATE OR REPLACE FUNCTION handle_payment_confirmation(
  p_payment_intent_id TEXT,
  p_proposal_id UUID,
  p_investor_id UUID,
  p_amount NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Insert the transaction record
  INSERT INTO transactions (
    payment_intent_id,
    proposal_id,
    investor_id,
    amount,
    status
  ) VALUES (
    p_payment_intent_id,
    p_proposal_id,
    p_investor_id,
    p_amount,
    'succeeded'
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$; 