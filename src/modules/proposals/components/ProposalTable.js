import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import ProposalDetailModal from './ProposalDetailModal';
import LinearProgress from '@mui/material/LinearProgress';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../../lib/stripe/stripeClient';
import InvestmentModal from './InvestmentModal';

export default function ProposalTable({ showInvestButton = true, category = null, showOnlyInvested = false, userId = null }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedInvestmentProposal, setSelectedInvestmentProposal] = useState(null);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 10;
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
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProposals = [...proposals]
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

  // Calculate pagination
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = sortedProposals.slice(indexOfFirstProposal, indexOfLastProposal);
  const totalPages = Math.ceil(sortedProposals.length / proposalsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleProposalUpdate = (updatedProposal) => {
    setProposals(prevProposals => 
      prevProposals.map(p => 
        p.id === updatedProposal.id ? { ...p, ...updatedProposal } : p
      )
    );
  };

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('proposals')
          .select('*');

        if (category) {
          query = query.eq('category', category);
        }

        const { data: proposals, error: proposalsError } = await query;
        if (proposalsError) {
          console.error('Error fetching proposals:', proposalsError);
          return;
        }

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
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-6 rounded-lg bg-red-50 border border-red-100">
        <div className="flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Unable to load proposals</span>
        </div>
        <p className="mt-2 text-sm">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('title')}
              >
                Title {sortField === 'title' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('budget')}
              >
                Target Amount {sortField === 'budget' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('amount_raised')}
              >
                Raised Amount {sortField === 'amount_raised' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProposals.map((proposal) => (
              <tr 
                key={proposal.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedProposal(proposal)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {proposal.title.charAt(0).toUpperCase() + proposal.title.slice(1).toLowerCase()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(proposal.budget || 0, proposal.currency || 'USD')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(proposal.amount_raised || 0, proposal.currency || 'USD')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-full">
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
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {Math.round((proposal.amount_raised / proposal.budget) * 100) || 0}% Funded
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {showInvestButton && proposal.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/payments');
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Payments
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center space-x-4 pt-6 mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
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
              className={`w-8 h-8 rounded-lg font-medium transition-all duration-200 ${
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
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
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
          onUpdate={handleProposalUpdate}
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
          />
        </Elements>
      )}
    </div>
  );
} 