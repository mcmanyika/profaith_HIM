'use client'
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Admin from "../../components/layout/Admin";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { withAuth } from '../../utils/withAuth'
import ProposalList from "../../modules/proposals/components/ProposalList";
import ProposalDetailModal from '../../modules/proposals/components/ProposalDetailModal';
import YouTubeVideo from "./utils/youtube";
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MembershipList from "../../modules/proposals/components/MembershipList";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthLayout from '../../components/layout/AuthLayout'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CATEGORIES = [
  { name: "REAL ESTATE", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { name: "AGRICULTURE", icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" },
  { name: "TOURISM", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "ENERGY", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { name: "MANUFACTURING", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { name: "MEMBERSHIP", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

// Example MembershipModal component
const MembershipModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Membership</h2>
      <p>Membership details and actions go here.</p>
      <button
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  </div>
);

// Show totals by month: sum amount for all transactions in each month (not cumulative)
function getMonthlyTotals(transactions) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTotals = Array(12).fill(0);
  transactions.forEach(tx => {
    if (!tx.created_at) return;
    const date = new Date(tx.created_at);
    if (isNaN(date)) return;
    const month = date.getMonth();
    monthlyTotals[month] += Number(tx.amount || 0);
  });
  return months.map((month, idx) => ({ month, value: monthlyTotals[idx] }));
}

const Dashboard = () => {
  // 1. All useState, useMemo, useCallback, useEffect, etc. go here, at the top of the component

  // State declarations
  const [selectedTab, setSelectedTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedTab") || "REAL ESTATE";
    }
    return "REAL ESTATE";
  });
  const [user, setUser] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [showOnlyInvested, setShowOnlyInvested] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userStats, setUserStats] = useState({
    totalInvestment: 0,
    numberOfProjects: 0,
    currentProjectInvestment: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [hasMembershipPayment, setHasMembershipPayment] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const supabase = createClientComponentClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);
  const [userInvestedProjects, setUserInvestedProjects] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [showAllMyInvestments, setShowAllMyInvestments] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [cachedData, setCachedData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Memoized values and callbacks
  const ownershipPieData = useMemo(() => {
    const userShare = userStats.currentProjectInvestment || 0;
    const total = proposalData?.amount_raised || 0;
    const rest = Math.max(total - userShare, 0);
    return [
      { name: 'Your Share', value: userShare },
      { name: 'Others', value: rest },
    ];
  }, [userStats.currentProjectInvestment, proposalData?.amount_raised]);

  const pieColors = ['#22c55e', '#e5e7eb'];

  const updateUserStats = useCallback(async (transactions, selectedId) => {
    if (!user || !selectedId) {
      setUserStats({
        totalInvestment: 0,
        numberOfProjects: 0,
        currentProjectInvestment: 0
      });
      return;
    }
    const stats = {
      totalInvestment: 0,
      numberOfProjects: 0,
      currentProjectInvestment: 0
    };
    if (transactions) {
      stats.totalInvestment = transactions
        .filter(tx => tx.metadata?.investor_id === user.id)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const uniqueProjects = new Set(
        transactions
          .filter(tx => tx.metadata?.investor_id === user.id)
          .map(tx => tx.metadata?.proposal_id)
      );
      stats.numberOfProjects = uniqueProjects.size;
      stats.currentProjectInvestment = transactions
        .filter(tx =>
          tx.metadata?.proposal_id === selectedId &&
          tx.metadata?.investor_id === user.id
        )
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    }
    setUserStats(stats);
  }, [user]);

  // All useEffect hooks at the top
  useEffect(() => {
    let subscription;
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setAuthLoading(false);
    };
    getSession();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    subscription = data?.subscription;
    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  useEffect(() => {
    if (selectedTab) {
      localStorage.setItem("selectedTab", selectedTab);
    }
  }, [selectedTab]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchAllData = async () => {
      if (cachedData && Date.now() - cachedData.timestamp < 30000) {
        setUserTransactions(cachedData.userTransactions);
        setAllTransactions(cachedData.allTransactions);
        setUserInvestedProjects(cachedData.userProjects);
        setCategoryCounts(cachedData.categoryCounts);
        setHasMembershipPayment(cachedData.hasMembership);
        updateUserStats(cachedData.userTransactions, selectedProjectId);
        setIsInitialLoading(false);
        return;
      }
      try {
        setIsDataLoading(true);
        const [transactionsResponse, proposalsResponse] = await Promise.all([
          supabase
            .from('transactions')
            .select('amount, metadata, created_at')
            .eq('status', 'completed'),
          supabase
            .from('proposals')
            .select('id, title, category, budget, amount_raised, status')
            .eq('status', 'active')
        ]);
        if (transactionsResponse.error) throw transactionsResponse.error;
        if (proposalsResponse.error) throw proposalsResponse.error;
        const allTransactions = transactionsResponse.data || [];
        const allProposals = proposalsResponse.data || [];
        const userTxs = allTransactions.filter(
          tx => tx.metadata?.investor_id === user.id
        );
        const uniqueProposalIds = [
          ...new Set(userTxs.map(tx => tx.metadata?.proposal_id).filter(Boolean))
        ];
        const userProjects = allProposals.filter(p => 
          uniqueProposalIds.includes(p.id)
        );
        const counts = {};
        allProposals.forEach(p => {
          counts[p.category] = (counts[p.category] || 0) + 1;
        });
        const membershipProposals = allProposals.filter(p => p.category === 'MEMBERSHIP');
        const hasMembership = userTxs.some(
          tx => membershipProposals.some(p => p.id === tx.metadata?.proposal_id)
        );
        const processedData = {
          userTransactions: userTxs,
          allTransactions,
          userProjects,
          categoryCounts: counts,
          hasMembership,
          timestamp: Date.now()
        };
        setCachedData(processedData);
        setUserTransactions(userTxs);
        setAllTransactions(allTransactions);
        setUserInvestedProjects(userProjects);
        setCategoryCounts(counts);
        setHasMembershipPayment(hasMembership);
        updateUserStats(userTxs, selectedProjectId);
      } catch (error) {
        setError(error.message);
        toast.error('Failed to fetch data: ' + error.message);
      } finally {
        setIsDataLoading(false);
        setIsInitialLoading(false);
      }
    };
    fetchAllData();
  }, [authLoading, user, supabase, selectedProjectId, updateUserStats, cachedData]);

  useEffect(() => {
    const projectsInCategory = userInvestedProjects.filter(proj => proj && proj.category === selectedTab);
    if (projectsInCategory.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsInCategory[0].id);
    }
  }, [userInvestedProjects, selectedTab, selectedProjectId]);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchProposalData = async () => {
      try {
        setIsLoading(true);
        if (selectedTab === "MEMBERSHIP") {
          const { data: membershipProposals, error: proposalError } = await supabase
            .from('proposals')
            .select('id, budget, title, amount_raised, category')
            .eq('category', 'MEMBERSHIP');
          if (proposalError) throw proposalError;
          if (!membershipProposals || membershipProposals.length === 0) {
            setProposalData(null);
            return;
          }
          const proposalIds = membershipProposals.map(p => p.id);
          const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, metadata')
            .eq('status', 'completed');
          if (transactionsError) throw transactionsError;
          const filtered = transactions.filter(
            tx => proposalIds.includes(tx.metadata?.proposal_id)
          );
          const uniqueInvestors = new Set(filtered.map(tx => tx.metadata?.investor_id)).size;
          const totalRaised = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
          const totalBudget = membershipProposals.reduce((sum, p) => sum + (p.budget || 0), 0);
          setProposalData({
            ...membershipProposals[0],
            budget: totalBudget,
            amount_raised: totalRaised,
            investor_count: uniqueInvestors
          });
          return;
        }
        let query = supabase
          .from('proposals')
          .select('id, title, budget, amount_raised, category, investor_count')
          .eq('status', 'active');
        if (selectedProjectId) {
          query = query.eq('id', selectedProjectId);
        } else {
          query = query
            .eq('category', selectedTab)
            .order('created_at', { ascending: false })
            .limit(1);
        }
        const { data: proposal, error: proposalError } = await query;
        if (proposalError) {
          throw proposalError;
        }
        if (!proposal || proposal.length === 0) {
          setProposalData(null);
          return;
        }
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount, metadata')
          .eq('status', 'completed');
        if (transactionsError) {
          throw transactionsError;
        }
        const filtered = transactions.filter(
          tx => tx.metadata?.proposal_id === proposal[0].id
        );
        const capitalRaised = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const uniqueInvestors = new Set(filtered.map(tx => tx.metadata?.investor_id)).size;
        setProposalData({
          ...proposal[0],
          amount_raised: capitalRaised,
          investor_count: uniqueInvestors
        });
      } catch (error) {
        setError(error.message);
        setProposalData(null);
        toast.error('Failed to fetch proposal data: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProposalData();
  }, [authLoading, supabase, selectedTab, user, selectedProjectId]);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        setError(error.message);
        setDocuments([]);
        toast.error('Failed to fetch documents: ' + error.message);
      }
    };
    fetchDocuments();
  }, [authLoading, user, supabase]);

  const ownershipShare = useMemo(() => {
    try {
      if (!proposalData?.amount_raised || !userStats.currentProjectInvestment) return 0;
      const share = (userStats.currentProjectInvestment / proposalData.amount_raised) * 100;
      return isNaN(share) ? 0 : share.toFixed(1);
    } catch (error) {
      return 0;
    }
  }, [proposalData?.amount_raised, userStats.currentProjectInvestment]);

  const handleTabSelect = (tab) => {
    setIsCategoryLoading(true);
    setSelectedTab(tab);
    setSelectedProjectId(null);
    setProposalData(null);
    setIsCategoryLoading(false);
  };

  const handleProjectSelect = (project) => {
    setSelectedProjectId(project.id);
    setSelectedTab(project.category);
  };

  // Compute chart data based on the toggle
  const chartData = showAllMyInvestments
    ? getMonthlyTotals(userTransactions)
    : getMonthlyTotals(userTransactions.filter(tx => tx.metadata?.proposal_id === selectedProjectId));

  // 3. The rest of your render logic goes here
  // ... existing code ...

  return (
    <Admin>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        
        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-lg"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <strong className="font-semibold">Error: </strong>
              <span className="ml-2">{error}</span>
            </div>
            <button 
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
              onClick={() => setError(null)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        <div className="">
          <div className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-sm bg-opacity-90">
            {/* Category Tabs */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:items-center mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6  gap-3">
                {CATEGORIES.map((tab) => (
                  <motion.button
                    key={tab.name}
                    onClick={() => handleTabSelect(tab.name)}
                    disabled={isCategoryLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                      selectedTab === tab.name
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg"
                    } ${isCategoryLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ overflow: 'visible' }}
                  >
                    {isCategoryLoading && selectedTab === tab.name ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="hidden md:block h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                    )}
                    <span>{tab.name}</span>
                    {!!categoryCounts[tab.name] && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold rounded-full shadow-lg flex items-center justify-center" style={{ minWidth: 24, height: 24, fontSize: 13, padding: '0 7px', border: '2px solid #e0e7ef' }}>
                        {categoryCounts[tab.name]}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Project Overview */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 shadow-inner">
              {/* User Summary */}
              <div className="grid grid-cols-1 gap-6 w-full mb-8">
                <div className="flex flex-col justify-center h-full">
                  <div className="flex flex-col md:flex-row gap-6">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex w-full md:w-1/4 bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex flex-col gap-6 w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-thin text-gray-600 text-sm uppercase">{user?.user_metadata?.full_name  || 'User'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-thin text-gray-600 text-sm uppercase">Total Invested: <b className="pl-7">${userStats.totalInvestment.toLocaleString()}</b></span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2M7 7h10" />
                            </svg>
                            <span className="font-thin text-gray-600 text-sm uppercase">My Investments: <b className="pl-4">{userStats.numberOfProjects}</b></span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex"
                    >
                      {userInvestedProjects.filter(project => project.category === selectedTab).length > 0 ? (
                        <div className="w-full">
                          <select
                            value={selectedProjectId || ''}
                            onChange={(e) => {
                              const project = userInvestedProjects.find(p => p.id === e.target.value);
                              if (project) handleProjectSelect(project);
                            }}
                            className="w-full p-4 rounded-xl text-sm font-medium bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">Your Projects</option>
                            {userInvestedProjects
                              .filter(project => project.category === selectedTab)
                              .map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : null}
                    </motion.div>
                  </div>
                </div>
              </div>
              {/* Payments Overview */}
              <div className="grid grid-cols-1 gap-6 w-full mb-8">
                <div className="flex flex-col justify-center h-full">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-[3] bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-[400px]">
                        <div className="w-full pl-4">
                          {userStats.totalInvestment > 0 && proposalData && (
                            <div className="text-xl text-gray-500 mt-1 mb-2 capitalize"><span className="font-semibold">{proposalData.title}</span></div>
                          )}
                        </div>
                      <div className="mb-4 font-semibold text-right text-gray-700 flex flex-col md:flex-row md:items-center md:justify-end gap-4 w-full">
                        <div className="flex items-center gap-2">
                          <button
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${!showAllMyInvestments ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            onClick={() => setShowAllMyInvestments(false)}
                          >
                            This Investment Only
                          </button>
                          <button
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${showAllMyInvestments ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            onClick={() => setShowAllMyInvestments(true)}
                          >
                            All My Investments
                          </button>
                        </div>
                      </div>
                      {/* Payments Area Chart (Totals by Month) */}
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={userStats.totalInvestment ? chartData : [{month: 'No data', value: 0}]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                          <Area type="monotone" dataKey="value" stroke="#22c55e" fillOpacity={1} fill="#22c55e" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    
                    {/* New card to the right of the chart */}
                    <div className=" bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-[400px] flex flex-col items-center justify-center">
                      <div className="mb-4 font-semibold text-gray-700 uppercase text-sm">Summary</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                        {/* Investors */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-center shadow hover:shadow-lg transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <div className="text-xs text-white font-semibold tracking-wider">INVESTORS</div>
                          <div className="text-base font-bold text-white mt-1">{proposalData?.investor_count || 0}</div>
                        </div>
                        {/* Capital Raised */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-center shadow hover:shadow-lg transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-white font-semibold tracking-wider">CAPITAL RAISED</div>
                          <div className="text-base font-bold text-white mt-1">
                            ${proposalData?.amount_raised?.toLocaleString() || '0'}
                          </div>
                        </div>
                        {/* Remaining */}
                        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 text-center shadow hover:shadow-lg transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <div className="text-xs text-white font-semibold tracking-wider">REMAINING</div>
                          <div className="text-base font-bold text-white mt-1">
                            ${((proposalData?.budget || 0) - (proposalData?.amount_raised || 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership & Progress */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {proposalData && userStats.currentProjectInvestment > 0 ? (
                <>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 bg-white rounded-xl p-8 text-center flex flex-col items-center justify-center h-[400px] shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="text-xs text-gray-500 mb-3">GOAL ${proposalData?.budget?.toLocaleString() || '0'}</div>
                  <div className="flex items-center justify-center mb-4">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-20 md:w-10 md:h-40 mx-0.5 rounded-lg transition-all duration-300 ${
                          i < Math.floor((proposalData?.amount_raised || 0) / (proposalData?.budget || 1) * 10) 
                            ? "bg-gradient-to-b from-blue-600 to-blue-700" 
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">AMOUNT YOU INVESTED</div>
                  <div className="text-xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-32 mx-auto rounded-lg"></div>
                    ) : (
                      `$${userStats.currentProjectInvestment.toLocaleString()}`
                    )}
                  </div>
                </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 rounded-xl p-8 text-center flex flex-col justify-center items-center h-[400px] shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                     {/* Ownership Share Pie Chart */}
                     <div className="w-full flex flex-col items-center mt-8">
                        <ResponsiveContainer className={`${isMobile ? 'w-full' : 'w-full'}`} width="100%" height={isMobile ? 250 : 330}>
                          <PieChart>
                            <defs>
                              <linearGradient id="colorYourShare" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="colorOthers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.8}/>
                              </linearGradient>
                            </defs>
                            <Pie
                              data={ownershipPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 60 : 80}
                              outerRadius={isMobile ? 100 : 140}
                              paddingAngle={2}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              labelLine={false}
                              animationDuration={2000}
                              animationBegin={0}
                              isAnimationActive={true}
                              animationEasing="ease-out"
                            >
                              {ownershipPieData.map((entry, idx) => (
                                <Cell 
                                  key={`cell-${idx}`} 
                                  fill={pieColors[idx]}
                                  stroke="#fff"
                                  strokeWidth={2}
                                  style={{
                                    filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))'
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                padding: '12px'
                              }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value) => (
                                <span style={{ 
                                  color: '#4B5563', 
                                  fontSize: isMobile ? '12px' : '14px'
                                }}>{value}</span>
                              )}
                              wrapperStyle={{
                                paddingTop: '20px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                  </motion.div>
                </>
              ) : selectedTab === "MEMBERSHIP" && !hasMembershipPayment ? (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 bg-gradient-to-br from-lime-400 to-lime-500 rounded-xl p-8 text-center flex items-center justify-center h-[400px] shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center justify-center text-white">
                    <svg className="h-16 w-16 text-white mb-4" />
                    <div className="font-semibold mb-2 capitalize text-sm">
                      You are not a paid member yet.
                    </div>
                    <button
                      onClick={() => {
                        if (proposalData) {
                          setShowMembershipModal(true);
                        } else {
                          toast.error('Membership proposal not found');
                        }
                      }}
                      className="px-6 py-3 bg-white text-lime-600 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md capitalize text-sm"
                    >
                      Click here to make a payment
                    </button>
                  </div>
                </motion.div>
              ) : (
                <></>
              )}
            </div>

            {/* Existing Proposals List Section */}
            {proposalData && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={showOnlyInvested}
                        onChange={(e) => setShowOnlyInvested(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-xs font-medium text-gray-900">Show only my investments</span>
                    </label>
                  </div>
                </div>
                <ProposalList 
                  showInvestButton={true} 
                  category={selectedTab} 
                  showOnlyInvested={showOnlyInvested}
                  userId={user?.id}
                />
              </div>
            )}


            {/* Membership Modal */}
            {showMembershipModal && proposalData && (
              <ProposalDetailModal
                proposal={{
                  ...proposalData,
                  status: proposalData.status || 'active'
                }}
                onClose={() => setShowMembershipModal(false)}
              />
            )}
          </div>
        </div>
       
      </div>
    </Admin>
  );
};

// Add PropTypes validation
Dashboard.propTypes = {
  // Add any props if needed
};

export default withAuth(Dashboard); 