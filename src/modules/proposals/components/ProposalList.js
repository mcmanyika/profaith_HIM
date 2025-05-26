import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/config';
import ProposalCard from './ProposalCard';
import ProposalStatusBadge from './ProposalStatusBadge';
import ProposalDetailModal from './ProposalDetailModal';
import StatusButton from './StatusButton';
import LinearProgress from '@mui/material/LinearProgress';
import InvestmentModal from './InvestmentModal';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../../lib/stripe/stripeClient';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

// Loading skeleton component
const ProposalCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-2 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-md border border-gray-100">
    <div className="mb-4">
      {/* Agriculture icon */}
      <svg className="w-14 h-14 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V3m0 0C7.03 3 3 7.03 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      No active projects in <span className="text-green-600">AGRICULTURE</span> category
    </h3>
    <p className="text-gray-500 mb-4 text-center max-w-xs">
      Check back soon for new opportunities, or explore other categories to find projects that interest you.
    </p>
    <button
      onClick={() => window.location.href = '/proposals'}
      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
    >
      Explore Other Categories
    </button>
  </div>
);

export default function ProposalList({ showInvestButton = true, category = null, showOnlyInvested = false, userId = null }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768; // Define mobile breakpoint
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedInvestmentProposal, setSelectedInvestmentProposal] = useState(null);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMembershipPayment, setHasMembershipPayment] = useState(false);
  const [hasAnyPayments, setHasAnyPayments] = useState(false);
  const proposalsPerPage = 5;
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Format currency based on user's locale
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it with default desc direction
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProposals = [...proposals]
    .filter(proposal => proposal.status === 'active')
    .sort((a, b) => {
      let compareA = a[sortField];
      let compareB = b[sortField];

      // Handle special cases for date and number fields
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

  // Calculate pagination
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = sortedProposals.slice(indexOfFirstProposal, indexOfLastProposal);
  const totalPages = Math.ceil(sortedProposals.length / proposalsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        // 1. Fetch proposals
        let query = supabase
          .from('proposals')
          .select('*')
          .eq('status', 'active');

        if (category) {
          query = query.eq('category', category);
        }

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
            .eq('status', 'succeeded')
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
            amount_raised: totalRaised,
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
  }, [supabase, category, showOnlyInvested, userId, sortField, sortDirection]);

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
      if (user) {
        // Check if user has any payments (transactions)
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id')
          .eq('metadata->>investor_id', user.id)
          .eq('status', 'succeeded')
          .limit(1);
        setHasAnyPayments(transactions && transactions.length > 0);
        // Check if user has already paid for membership (transactions for membership proposals)
        const { data: membershipProposals } = await supabase
          .from('proposals')
          .select('id')
          .eq('category', 'MEMBERSHIP');
        const membershipProposalIds = (membershipProposals || []).map(p => p.id);
        const { data: membershipTxs } = await supabase
          .from('transactions')
          .select('id, metadata')
          .eq('status', 'succeeded')
          .eq('metadata->>investor_id', user.id)
          .in('metadata->>proposal_id', membershipProposalIds);
        setHasMembershipPayment(membershipTxs && membershipTxs.length > 0);
      }
    };
    getUser();
  }, [supabase, proposals]);

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

      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: investmentData.amount,
          proposalId: selectedInvestmentProposal.id,
          investmentId: investmentData.id,
          investorName: investmentData.investorName,
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

      // Update investment with payment intent ID
      const { error: updateError } = await supabase
        .from('investments')
        .update({ 
          stripe_payment_intent_id: clientSecret,
          updated_at: new Date().toISOString()
        })
        .eq('id', investmentData.id);

      if (updateError) {
        console.error('Error updating investment:', updateError);
        throw new Error(`Failed to update investment record: ${updateError.message}`);
      }

      setShowInvestmentModal(false);
      setSelectedInvestmentProposal(null);
      
      // Show detailed success message
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
      
      // Show more detailed error message to user
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(`Investment failed: ${errorMessage}`);
      
      // If there's a specific error about the payment intent, show a more helpful message
      if (errorMessage.includes('payment intent')) {
        toast.error('Please try again or contact support if the problem persists');
      }
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, index) => (
        <ProposalCardSkeleton key={index} />
      ))}
    </div>
  );
  if (error) return (
    <div className="text-red-600 p-6 rounded-lg bg-red-50 border border-red-100">
      <div className="flex items-center">
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium">Unable to load proposals</span>
      </div>
      <p className="mt-2 text-sm">Please try again later.</p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 p-4 bg-red-100 rounded text-xs overflow-auto">{error.toString()}</pre>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {/* Header Row for Sorting */}
      <div className="hidden md:flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div 
          className={`text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors duration-200 ${
            sortField === 'title' ? 'text-gray-900' : 'hover:text-gray-700'
          }`} 
          onClick={() => handleSort('title')}
        >
          Title {sortField === 'title' && (
            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
        <div 
          className={`text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors duration-200 ${
            sortField === 'budget' ? 'text-gray-900' : 'hover:text-gray-700'
          }`} 
          onClick={() => handleSort('budget')}
        >
          Target Amount {sortField === 'budget' && (
            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
        <div 
          className={`text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors duration-200 ${
            sortField === 'amount_raised' ? 'text-gray-900' : 'hover:text-gray-700'
          }`} 
          onClick={() => handleSort('amount_raised')}
        >
          Raised Amount {sortField === 'amount_raised' && (
            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      </div>

      {/* Proposal Cards Grid */}
      <div className={`grid grid-cols-1 ${currentProposals.length === 1 ? 'w-full' : 'md:grid-cols-2 lg:grid-cols-2'} gap-6 mb-12`}>
        {currentProposals.length === 0 ? (
          <EmptyState />
        ) : (
          currentProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-white cursor-pointer rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
              onClick={() => setSelectedProposal(proposal)}
            >
              <div className="p-6">
                {/* Title */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                    {proposal.title.charAt(0).toUpperCase() + proposal.title.slice(1).toLowerCase()}
                  </h3>
                </div>

                {/* View My Payments Button */}
                {showInvestButton && proposal.status === 'active' && (
                  <div className="mb-6 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/payments');
                      }}
                      className="px-3 py-2 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-lg transition-colors duration-200 font-medium text-xs shadow-sm hover:opacity-90 hover:shadow-md"
                    >
                      View My Payments
                    </button>
                  </div>
                )}

                {/* Budget and Raised Amount */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Target Amount</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(proposal.budget || 0, proposal.currency || 'USD')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Raised</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(proposal.amount_raised || 0, proposal.currency || 'USD')}
                      </span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((proposal.amount_raised / proposal.budget) * 100 || 0, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#00D48A',
                          transition: 'transform 0.4s ease'
                        },
                        backgroundColor: '#f3f4f6'
                      }}
                    />
                    <div className="text-sm text-gray-500 text-right">
                      {Math.round((proposal.amount_raised / proposal.budget) * 100) || 0}% Funded
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center space-x-4 pt-16 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'
          }`}
        >
          Previous
        </button>
        <div className="flex items-center space-x-2">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index + 1)}
              className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                currentPage === index + 1
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'
          }`}
        >
          Next
        </button>
      </div>

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