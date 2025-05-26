'use client';

import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Admin from "../../components/layout/Admin";
import dynamic from 'next/dynamic';

// Dynamically import Bar chart for SSR compatibility
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

function Portfolio() {
    const [transactions, setTransactions] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const supabase = createClientComponentClient();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                // Fetch all proposals (id and title)
                const { data: proposalsData, error: proposalsError } = await supabase
                    .from('proposals')
                    .select('id, title');
                if (proposalsError) throw proposalsError;
                setProposals(proposalsData || []);

                // Fetch transactions for the user
                const { data: transactionsData, error: transactionsError } = await supabase
                    .from('transactions')
                    .select('id, amount, status, created_at, metadata')
                    .eq('metadata->>investor_id', user.id)
                    .order('created_at', { ascending: false });
                if (transactionsError) throw transactionsError;
                setTransactions(transactionsData || []);
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    // Register ChartJS components on client-side only
    useEffect(() => {
        import('chart.js').then(mod => {
            const { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } = mod;
            Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
        });
    }, []);

    // Helper to get proposal title from proposals list
    const getProposalTitle = (proposalId) => {
        const proposal = proposals.find(p => p.id === proposalId);
        return proposal ? proposal.title : 'Unknown Proposal';
    };

    // Sorting logic
    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (key) => {
        if (sortKey !== key) return '↕️';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        let aValue, bValue;
        if (sortKey === 'proposal') {
            aValue = getProposalTitle(a.metadata?.proposal_id).toLowerCase();
            bValue = getProposalTitle(b.metadata?.proposal_id).toLowerCase();
        } else if (sortKey === 'amount') {
            aValue = a.amount;
            bValue = b.amount;
        } else if (sortKey === 'status') {
            aValue = a.status;
            bValue = b.status;
        } else if (sortKey === 'created_at') {
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
        } else {
            aValue = a[sortKey];
            bValue = b[sortKey];
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination logic (now uses sortedTransactions)
    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
    const paginatedTransactions = sortedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate total amount by proposal
    const amountByProposal = proposals.map(proposal => {
        const total = transactions
            .filter(tx => tx.metadata?.proposal_id === proposal.id)
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        return { title: proposal.title, total };
    }).filter(item => item.total > 0);

    const chartData = {
        labels: amountByProposal.map(item => item.title),
        datasets: [
            {
                label: 'Total Amount',
                data: amountByProposal.map(item => item.total),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `$${context.raw.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) { return `$${value.toLocaleString()}`; }
                }
            }
        }
    };

    if (error) {
        return (
            <Admin>
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600">{error}</p>
                    </div>
                </div>
            </Admin>
        );
    }

    return (
        <Admin>
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">My Transactions</h1>
                {/* Chart Section */}
                <div className="mb-8 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Total Amount by Investment</h2>
                    {amountByProposal.length === 0 ? (
                        <div className="text-gray-400 text-center">No data to display.</div>
                    ) : (
                        <div className="flex justify-center items-center h-72">
                            <div className="w-full max-w-xl mx-auto">
                                <Bar data={chartData} options={chartOptions} />
                            </div>
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">Loading transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No transactions found.</p>
                    </div>
                ) : (
                    <>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {/* Header Row for Sorting */}
                        <div className="hidden md:flex px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex-1 cursor-pointer select-none" onClick={() => handleSort('proposal')}>
                                Investment <span className="ml-1">{getSortIcon('proposal')}</span>
                            </div>
                            <div className="w-32 cursor-pointer select-none" onClick={() => handleSort('amount')}>
                                Amount <span className="ml-1">{getSortIcon('amount')}</span>
                            </div>
                            <div className="w-32 cursor-pointer select-none" onClick={() => handleSort('status')}>
                                Status <span className="ml-1">{getSortIcon('status')}</span>
                            </div>
                            <div className="w-32 cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                                Date <span className="ml-1">{getSortIcon('created_at')}</span>
                            </div>
                        </div>
                        {/* Mobile Header Row */}
                        <div className="flex md:hidden px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex-1">Investment</div>
                            <div className="w-24">Amount</div>
                        </div>
                        {/* Transaction Rows */}
                        <div>
                            {paginatedTransactions.map((transaction) => {
                                const proposalId = transaction.metadata?.proposal_id;
                                return (
                                    <div
                                        key={transaction.id}
                                        className="group flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0 px-4 md:px-6 py-5 mb-3 md:mb-0 bg-gradient-to-br from-blue-50/60 to-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:bg-blue-50/40 transition-all duration-200 cursor-pointer"
                                        onClick={() => { setSelectedTransaction(transaction); setIsModalOpen(true); }}
                                    >
                                        {/* Investment Title & Icon */}
                                        <div className="flex-1 flex items-center gap-3 mb-2 md:mb-0">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 0h-1v4h-1m-4 0h-1v-4h-1m4 0h-1v4h-1" /></svg>
                                            </span>
                                            <div className="text-base font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{getProposalTitle(proposalId)}</div>
                                        </div>
                                        {/* Amount & Icon */}
                                        <div className="w-24 md:w-32 flex items-center gap-2 mb-2 md:mb-0">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                                            </span>
                                            <div className="text-sm font-bold text-green-700">${transaction.amount.toLocaleString()}</div>
                                        </div>
                                        {/* Status & Icon */}
                                        <div className="w-24 md:w-32 flex items-center gap-2 mb-2 md:mb-0">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                                                transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                                    {transaction.status === 'completed' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4-4" />}
                                                    {transaction.status === 'pending' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />}
                                                </svg>
                                            </span>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors duration-200
                                                ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'}`}>{transaction.status}</span>
                                        </div>
                                        {/* Date & Icon */}
                                        <div className="w-24 md:w-32 flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </span>
                                            <div className="text-sm text-gray-500">{new Date(transaction.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded bg-gray-100 text-gray-700 border border-gray-300 mr-2 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded bg-gray-100 text-gray-700 border border-gray-300 ml-2 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                        >
                            Next
                        </button>
                    </div>
                    </>
                )}
            </div>
            {/* Transaction Details Modal */}
            {isModalOpen && selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative animate-fadeIn">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                            onClick={() => setIsModalOpen(false)}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
                            <span className="inline-block w-2 h-6 bg-blue-500 rounded-full"></span>
                            Investment Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Investment</span>
                                <span className="font-semibold text-gray-800">{getProposalTitle(selectedTransaction.metadata?.proposal_id)}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Amount</span>
                                <span className="font-semibold text-green-700">${selectedTransaction.amount.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Status</span>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold
                                    ${selectedTransaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    selectedTransaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'}`}>{selectedTransaction.status}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Date</span>
                                <span className="font-semibold text-gray-700">{new Date(selectedTransaction.created_at).toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Transaction ID</span>
                                <span className="font-mono text-xs text-gray-500 break-all">{selectedTransaction.id}</span>
                            </div>
                            {selectedTransaction.metadata && (
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">Metadata</span>
                                    <pre className="bg-gray-50 rounded p-2 text-xs text-gray-600 overflow-x-auto max-h-32">{JSON.stringify(selectedTransaction.metadata, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Admin>
    );
}

export default Portfolio;