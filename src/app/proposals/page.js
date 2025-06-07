'use client';

import ProposalList from "../../modules/proposals/components/ProposalList";
import { useState, useEffect } from "react";
import Admin from "../../components/layout/Admin";
import ProposalForm from "../../modules/proposals/components/ProposalForm";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Header from "../../components/layout/Header";
import dynamic from 'next/dynamic'
import { withAuth } from '../../utils/withAuth';
// Dynamically import ChartJS components with ssr disabled
const Pie = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Pie),
  { ssr: false }
)

function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        investmentsByStatus: {
            active: 0,
            pending: 0,
            inactive: 0
        },
        investmentTotal: 0,
        activeProposals: 0,
        pendingProposals: 0,
        totalProposals: 0,
        recentUpdates: [],
        upcomingEvents: [],
        totalUsers: 0,
        usersByGender: {
            male: 0,
            female: 0
        }
    });

    const supabase = createClientComponentClient();

    useEffect(() => {
        // Register ChartJS components on client-side only
        import('chart.js').then(mod => {
            const { Chart, ArcElement, Tooltip, Legend } = mod
            Chart.register(ArcElement, Tooltip, Legend)
        })
    }, [])

    useEffect(() => {
        async function fetchDashboardData() {
            setIsLoading(true);
            setError(null);
            try {
                const [
                    { data: proposals },
                    { data: transactions },
                    { count: activeProposalCount },
                    { count: pendingProposalCount },
                    { count: totalProposalCount },
                    { data: updates },
                    { data: users }
                ] = await Promise.all([
                    supabase.from('proposals').select('budget, status, id'),
                    supabase.from('transactions').select('amount, metadata').eq('status', 'completed'),
                    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                    supabase.from('proposals').select('*', { count: 'exact', head: true }),
                    supabase.from('project_updates').select('*').order('created_at', { ascending: false }).limit(5),
                    supabase.from('profiles').select('*')
                ]);

                // Calculate investments by status (using proposal budgets as before)
                const investmentsByStatus = proposals?.reduce((acc, proposal) => {
                    const status = proposal.status?.toLowerCase() || 'inactive';
                    acc[status] = (acc[status] || 0) + (proposal.budget || 0);
                    return acc;
                }, { active: 0, pending: 0, inactive: 0 });

                // Calculate investmentTotal from transactions
                const investmentTotal = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

                // Count users by gender (only Male and Female)
                const genderCounts = {
                    male: users?.filter(user => user.gender?.toLowerCase() === 'male').length || 0,
                    female: users?.filter(user => user.gender?.toLowerCase() === 'female').length || 0
                };

                setDashboardData({
                    investmentsByStatus,
                    investmentTotal,
                    activeProposals: activeProposalCount || 0,
                    pendingProposals: pendingProposalCount || 0,
                    totalProposals: totalProposalCount || 0,
                    recentUpdates: updates || [],
                    upcomingEvents: [],
                    totalUsers: users?.length || 0,
                    usersByGender: genderCounts
                });
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    // Update investment chart data to project chart data
    const projectChartData = {
        labels: ['Active Projects', 'Pending Projects', 'Inactive'],
        datasets: [{
            data: [
                dashboardData.investmentsByStatus.active,
                dashboardData.investmentsByStatus.pending,
                dashboardData.investmentsByStatus.inactive
            ],
            backgroundColor: [
                'rgba(75, 192, 192, 0.8)',   // teal for active
                'rgba(255, 159, 64, 0.8)',    // orange for pending
                'rgba(201, 203, 207, 0.8)',   // gray for inactive
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(201, 203, 207, 1)',
            ],
            borderWidth: 1,
        }],
    };

    // Update pie chart data
    const proposalChartData = {
        labels: ['Active Proposals', 'Pending Proposals', 'Inactive'],
        datasets: [{
            data: [
                dashboardData.activeProposals,
                dashboardData.pendingProposals,
                dashboardData.totalProposals - (dashboardData.activeProposals + dashboardData.pendingProposals)
            ],
            backgroundColor: [
                'rgba(75, 192, 192, 0.8)',   // teal for active
                'rgba(255, 159, 64, 0.8)',    // orange for pending
                'rgba(201, 203, 207, 0.8)',   // gray for inactive
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(201, 203, 207, 1)',
            ],
            borderWidth: 1,
        }],
    };

    // Users pie chart data - simplified
    const usersChartData = {
        labels: ['Male', 'Female'],
        datasets: [{
            data: [
                dashboardData.usersByGender.male,
                dashboardData.usersByGender.female
            ],
            backgroundColor: [
                'rgba(54, 162, 235, 0.8)',   // blue for male
                'rgba(255, 99, 132, 0.8)',    // pink for female
            ],
            borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
    };

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">{error}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
      <Admin>
      <div className="p-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Project Summary Card */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Project Overview</h2>
            {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="h-48 mb-4">
                        <Pie data={projectChartData} options={chartOptions} />
                    </div>
                </>
            )}
          </div>
  
          {/* Updated Proposals Overview Card */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Proposals Overview</h2>
            {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="h-48 mb-4">
                        <Pie data={proposalChartData} options={chartOptions} />
                    </div>
                </>
            )}
          </div>
  
          {/* Simplified Users Card */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Users by Gender</h2>
            {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="h-48 mb-4">
                        <Pie data={usersChartData} options={chartOptions} />
                    </div>
                </>
            )}
          </div>
        </div>

        {/* Proposals List Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Current Proposals 
            <button 
              onClick={() => setIsModalOpen(true)}
              className="ml-2 hover:text-blue-600 transition-colors"
            >
              [+]
            </button>
          </h2>
          <ProposalList showInvestButton={true} />
        </div>

        {/* Sliding Modal */}
        <div 
          className={`fixed top-0 right-0 w-1/2 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isModalOpen ? 'translate-x-0' : 'translate-x-full'
          } z-50`}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Proposal</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {/* Add your proposal form here */}
            <div className="proposal-form">
              <ProposalForm />
            </div>
          </div>
        </div>

        {/* Overlay */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsModalOpen(false)}
          />
        )}
      </div>
      </Admin>
    )
  }
  export default withAuth(Dashboard);