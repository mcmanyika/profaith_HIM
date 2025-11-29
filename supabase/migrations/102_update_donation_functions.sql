-- ============================================
-- PROFAITH CHURCH MANAGEMENT SYSTEM
-- Update functions for donation confirmation
-- ============================================

-- Drop old payment confirmation function
DROP FUNCTION IF EXISTS public.handle_payment_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text);

-- Create new donation confirmation function
CREATE OR REPLACE FUNCTION handle_donation_confirmation(
    p_payment_intent_id TEXT,
    p_project_id UUID,
    p_member_id UUID,
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
            'project_id', p_project_id,
            'member_id', p_member_id
        ),
        p_customer_name,
        p_customer_email,
        p_phone_number,
        p_category_name
    )
    RETURNING id INTO v_transaction_id;

    -- Insert into contributions table
    INSERT INTO contributions (
        amount,
        payment_id,
        proposal_id,
        member_id,
        status
    ) VALUES (
        p_amount,
        p_payment_intent_id,
        p_project_id,
        p_member_id,
        'COMPLETED'
    );

    -- Update project funds_raised and donor_count
    UPDATE projects
    SET 
        funds_raised = COALESCE(funds_raised, 0) + p_amount,
        donor_count = donor_count + 1
    WHERE id = p_project_id;

    RETURN v_transaction_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_donation_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_donation_confirmation(text, uuid, uuid, numeric, uuid, text, text, text, text) TO service_role;

-- Create function to get member giving summary
CREATE OR REPLACE FUNCTION get_member_giving_summary(p_member_id UUID)
RETURNS TABLE (
    total_contributions NUMERIC,
    number_of_projects BIGINT,
    first_contribution_date TIMESTAMPTZ,
    last_contribution_date TIMESTAMPTZ,
    favorite_category TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.amount), 0) as total_contributions,
        COUNT(DISTINCT c.proposal_id) as number_of_projects,
        MIN(t.created_at) as first_contribution_date,
        MAX(t.created_at) as last_contribution_date,
        (
            SELECT p.category 
            FROM contributions c2
            JOIN projects p ON c2.proposal_id = p.id
            WHERE c2.member_id = p_member_id
            GROUP BY p.category
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as favorite_category
    FROM contributions c
    LEFT JOIN transactions t ON t.metadata->>'project_id' = c.proposal_id::text
    WHERE c.member_id = p_member_id AND c.status = 'COMPLETED';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_member_giving_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_giving_summary(uuid) TO service_role;

-- Create function to get project donation statistics
CREATE OR REPLACE FUNCTION get_project_statistics(p_project_id UUID)
RETURNS TABLE (
    total_raised NUMERIC,
    donor_count BIGINT,
    average_donation NUMERIC,
    largest_donation NUMERIC,
    recent_donations_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.amount), 0) as total_raised,
        COUNT(DISTINCT c.member_id) as donor_count,
        COALESCE(AVG(c.amount), 0) as average_donation,
        COALESCE(MAX(c.amount), 0) as largest_donation,
        COUNT(CASE WHEN t.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_donations_count
    FROM contributions c
    LEFT JOIN transactions t ON t.metadata->>'project_id' = c.proposal_id::text
    WHERE c.proposal_id = p_project_id AND c.status = 'COMPLETED';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_project_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_statistics(uuid) TO service_role;

-- Add comments
COMMENT ON FUNCTION handle_donation_confirmation IS 'Processes donation confirmation and updates project and member records';
COMMENT ON FUNCTION get_member_giving_summary IS 'Returns giving summary statistics for a specific member';
COMMENT ON FUNCTION get_project_statistics IS 'Returns donation statistics for a specific project';

