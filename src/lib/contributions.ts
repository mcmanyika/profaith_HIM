import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './database.types'

const supabase = createClientComponentClient<Database>()

type NewContribution = Database['public']['Tables']['contributions']['Insert'];

export async function createContribution({
    amount,
    projectId,
    memberId,
    stripePaymentIntentId,
}: {
    amount: number;
    projectId: string;
    memberId: string;
    stripePaymentIntentId: string;
}) {
    const { data, error } = await supabase
        .from('contributions')
        .insert({
            amount,
            proposal_id: projectId,
            member_id: memberId,
            payment_id: stripePaymentIntentId,
            status: 'COMPLETED'
        } as NewContribution)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getMemberContributions(memberId: string) {
    const { data, error } = await supabase
        .from('contributions')
        .select('*, projects(*)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getProjectContributions(projectId: string) {
    const { data, error } = await supabase
        .from('contributions')
        .select('*, profiles(*)')
        .eq('proposal_id', projectId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

