
DROP FUNCTION IF EXISTS public.handle_payment_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION handle_payment_confirmation(
    p_payment_intent_id TEXT,
    p_proposal_id UUID,
    p_investor_id UUID,
    p_amount NUMERIC,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_phone_number TEXT,
    p_category_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Insert into transactions table
    INSERT INTO transactions (
        user_id,
        amount,
        type,
        status,
        payment_method,
        metadata,
        customer_name,
        customer_email,
        phone_number,
        category_name
    ) VALUES (
        p_user_id,
        p_amount,
        'credit',
        'completed',
        'stripe',
        jsonb_build_object(
            'payment_intent_id', p_payment_intent_id,
            'proposal_id', p_proposal_id,
            'investor_id', p_investor_id
        ),
        p_customer_name,
        p_customer_email,
        p_phone_number,
        p_category_name
    )
    RETURNING id INTO v_transaction_id;

    -- Insert into investments table
    INSERT INTO investments (
        amount,
        payment_id,
        proposal_id,
        investor_id,
        status
    ) VALUES (
        p_amount,
        p_payment_intent_id,
        p_proposal_id,
        p_investor_id,
        'COMPLETED'
    );

    -- Update proposal amount_raised and investor_count
    UPDATE proposals
    SET 
        amount_raised = amount_raised + p_amount,
        investor_count = investor_count + 1
    WHERE id = p_proposal_id;

    RETURN v_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_payment_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_payment_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text) TO service_role; 