import { supabase } from './supabase/config';
import { Database } from './database.types';

type Investment = Database['public']['Tables']['investments']['Row'];
type NewInvestment = Database['public']['Tables']['investments']['Insert'];

export async function createInvestment({
    amount,
    proposalId,
    investorId,
    stripePaymentIntentId,
}: {
    amount: number;
    proposalId: string;
    investorId: string;
    stripePaymentIntentId: string;
}) {
    const { data, error } = await supabase
        .from('investments')
        .insert({
            amount,
            proposal_id: proposalId,
            investor_id: investorId,
            payment_id: stripePaymentIntentId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function completeInvestment(stripePaymentIntentId: string) {
    const { data: investment, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .eq('payment_id', stripePaymentIntentId)
        .single();

    if (fetchError) throw fetchError;

    // Update the proposal's raised amount and investor count
    const { error: proposalError } = await supabase.rpc(
        'increment_proposal_investment',
        {
            p_proposal_id: investment.proposal_id,
            p_amount: investment.amount
        }
    );

    if (proposalError) throw proposalError;

    return investment;
}

export async function getInvestmentsByProposal(proposalId: string) {
    const { data, error } = await supabase
        .from('investments')
        .select(`
      *,
      investor:profiles(id, full_name)
    `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getInvestmentsByUser(userId: string) {
    const { data, error } = await supabase
        .from('investments')
        .select(`
      *,
      proposal:proposals(
        id,
        title,
        status,
        amount_raised,
        budget
      )
    `)
        .eq('investor_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
} 