import { useEffect, useState } from 'react';
import ProposalDetailModal from './ProposalDetailModal';
import InvestmentModal from './InvestmentModal';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../../lib/stripe/stripeClient';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter } from 'next/navigation';

export default function MembershipList({ showInvestButton = true, showOnlyInvested = false, userId = null }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedInvestmentProposal, setSelectedInvestmentProposal] = useState(null);
  const [user, setUser] = useState(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProposals = [...proposals]
    .filter(proposal => proposal.status === 'active')
    .sort((a, b) => {
      let compareA = a[sortField];
      let compareB = b[sortField];

      if (sortField === 'deadline') {
        compareA = new Date(compareA);
        compareB = new Date(compareB);
      } else if (sortField === 'budget') {
        compareA = Number(compareA);
        compareB = Number(compareB);
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        // 1. Fetch membership proposals
        let query = supabase
          .from('proposals')
          .select('*')
          .eq('status', 'active')
          .ilike('title', '%membership%');

        const { data: proposals, error: proposalsError } = await query;
        if (proposalsError) {
          console.error('Error fetching proposals:', proposalsError);
          return;
        }

        // 2. Fetch all successful transactions for these proposals
        const proposalIds = proposals.map(p => p.id);
        let transactions = [];
        if (proposalIds.length > 0) {
          const { data: txs, error: txError } = await supabase
            .from('transactions')
            .select('amount, metadata')
            .eq('status', 'completed')
            .in('metadata->>proposal_id', proposalIds);
          if (txError) {
            console.error('Error fetching transactions:', txError);
          } else {
            transactions = txs;
          }
        }

        // 3. Aggregate transactions by proposal
        const proposalStats = proposals.map(proposal => {
          const txsForProposal = transactions.filter(
            tx => tx.metadata?.proposal_id === proposal.id
          );
          const totalRaised = txsForProposal.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
          const investorCount = new Set(txsForProposal.map(tx => tx.metadata?.investor_id)).size;
          return {
            ...proposal,
            total_raised: totalRaised,
            investor_count: investorCount
          };
        });

        let filteredProposals = proposalStats;

        // 4. Filter for user's investments if requested
        if (showOnlyInvested && userId) {
          filteredProposals = proposalStats.filter(proposal =>
            transactions.some(
              tx => tx.metadata?.proposal_id === proposal.id && tx.metadata?.investor_id === userId && Number(tx.amount) > 0
            )
          );
        }

        setProposals(filteredProposals);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [supabase, showOnlyInvested, userId, sortField, sortDirection]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleInvestClick = async (proposal, e) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to invest');
      return;
    }

    if (proposal.status !== 'active') {
      toast.error('This proposal is not currently accepting investments');
      return;
    }

    router.push(`/checkout/${proposal.id}`);
  };

  const handleInvestmentSubmit = async (investmentData) => {
    try {
      if (!user) {
        toast.error('Please sign in to invest');
        return;
      }

      toast.info('Processing your investment...');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      toast.info('Creating payment intent...');

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: investmentData.amount,
          proposalId: selectedInvestmentProposal.id,
          investorName: profile?.full_name || 'Anonymous Investor',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment intent creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to initialize payment: ${errorData.message || response.statusText}`);
      }

      const { clientSecret } = await response.json();

      toast.info('Updating investment record...');

      const { error: updateError } = await supabase
        .from('investments')
        .update({ 
          stripe_payment_intent_id: clientSecret,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedInvestmentProposal.id);

      if (updateError) {
        console.error('Error updating investment:', updateError);
        throw new Error(`Failed to update investment record: ${updateError.message}`);
      }

      setShowInvestmentModal(false);
      setSelectedInvestmentProposal(null);
      
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(investmentData.amount);
      
      toast.success(
        `Investment of ${formattedAmount} in "${selectedInvestmentProposal.title}" initiated successfully! Processing your payment...`
      );
      
    } catch (err) {
      console.error('Error submitting investment:', {
        message: err.message,
        stack: err.stack,
        error: err
      });
      
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(`Investment failed: ${errorMessage}`);
      
      if (errorMessage.includes('payment intent')) {
        toast.error('Please try again or contact support if the problem persists');
      }
    }
  };

  
  return (
    <div>
        {sortedProposals.map((proposal) => (
          <div
            key={proposal.id}
            onClick={() => setSelectedProposal(proposal)}
          >
              {showInvestButton && proposal.status === 'active' && (
                <button
                  onClick={(e) => handleInvestClick(proposal, e)}
                  className="rounded-md p-2 m-2  bg-gray-800 text-white hover:bg-gray-500 transition-colors flex items-center gap-2"
                >
                  <PersonIcon fontSize="small" />
                  Membership Payment
                </button>
              )}
          </div>
        ))}

      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
        />
      )}

      {showInvestmentModal && selectedInvestmentProposal && (
        <Elements stripe={stripePromise}>
          <InvestmentModal
            proposal={selectedInvestmentProposal}
            onClose={() => {
              setShowInvestmentModal(false);
              setSelectedInvestmentProposal(null);
            }}
            onSubmit={handleInvestmentSubmit}
          />
        </Elements>
      )}
    </div>
  );
} 