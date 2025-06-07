import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { formatCurrency } from '@/lib/utils';

export default function ProposalInvestors({ proposalId }) {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabaseClient();

  useEffect(() => {
    async function loadInvestors() {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select(`
            *,
            investor:profiles(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('proposal_id', proposalId)
          .eq('status', 'COMPLETED')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvestors(data);
      } catch (error) {
        console.error('Error loading investors:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInvestors();
  }, [proposalId, supabase]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900">Investors ({investors.length})</h3>
      
      {investors.length === 0 ? (
        <p className="mt-2 text-gray-500">No investors yet. Be the first to invest!</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200">
          {investors.map((investment) => (
            <li key={investment.id} className="py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-xs capitalize">
                      {(investment.investor.full_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {investment.investor.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Invested {formatCurrency(investment.amount)} on {new Date(investment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 