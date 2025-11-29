'use client'
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Admin from "../../components/layout/Admin";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { withAuth } from '../../utils/withAuth'
import ProposalList from "../../modules/proposals/components/ProposalList";
import ProposalDetailModal from '../../modules/proposals/components/ProposalDetailModal';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import GivingCard from '../../components/church/GivingCard';
import CommunityImpact from '../../components/church/CommunityImpact';
import GivingModal from '../../components/church/GivingModal';
import { useRouter } from 'next/navigation';

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
  // State declarations
  const [selectedTab, setSelectedTab] = useState(null);
  const [user, setUser] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [showOnlyInvested, setShowOnlyInvested] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userStats, setUserStats] = useState({
    totalContributions: 0,
    numberOfProjects: 0,
    currentProjectContribution: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMembershipPayment, setHasMembershipPayment] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [showGivingModal, setShowGivingModal] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);
  const [userInvestedProjects, setUserInvestedProjects] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [showAllMyInvestments, setShowAllMyInvestments] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [cachedData, setCachedData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Memoized values
  const ownershipPieData = useMemo(() => {
    const userShare = userStats.currentProjectContribution || 0;
    const total = proposalData?.amount_raised || 0;
    const rest = Math.max(total - userShare, 0);
    return [
      { name: 'Your Giving', value: userShare },
      { name: 'Others', value: rest },
    ];
  }, [userStats.currentProjectContribution, proposalData?.amount_raised]);

  const pieColors = ['#818cf8', '#4b5563']; // Indigo for user's giving, dark gray for others

  const updateUserStats = useCallback(async (transactions, selectedId) => {
    if (!user) {
      setUserStats({
        totalContributions: 0,
        numberOfProjects: 0,
        currentProjectContribution: 0
      });
      return;
    }
    const stats = {
      totalContributions: 0,
      numberOfProjects: 0,
      currentProjectContribution: 0
    };
    if (transactions) {
      // Filter by user_id column (for direct donations) OR metadata.investor_id (for legacy donations)
      const userTransactions = transactions.filter(
        tx => tx.user_id === user.id || tx.metadata?.investor_id === user.id
      );
      
      stats.totalContributions = userTransactions
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      
      // Count unique projects the user has contributed to
      const uniqueProjects = new Set(
        userTransactions
          .map(tx => tx.metadata?.proposal_id || tx.metadata?.project_id)
          .filter(Boolean)
      );
      
      // Count unique categories the user has contributed to (for direct donations)
      const uniqueCategories = new Set(
        userTransactions
          .filter(tx => {
            const projectId = tx.metadata?.proposal_id || tx.metadata?.project_id;
            return !projectId && tx.category_name; // Only direct donations with category
          })
          .map(tx => tx.category_name)
          .filter(Boolean)
      );
      
      // Total ministries supported = unique projects + unique categories
      stats.numberOfProjects = uniqueProjects.size + uniqueCategories.size;
      
      if (selectedId) {
        stats.currentProjectContribution = userTransactions
          .filter(tx =>
            (tx.metadata?.proposal_id === selectedId || tx.metadata?.project_id === selectedId)
          )
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      }
    }
    setUserStats(stats);
  }, [user]);

  // Helper functions using categories state
  const getDbName = useCallback((displayName) => {
    if (!categories || categories.length === 0) return displayName;
    const cat = categories.find(c => c.display_name === displayName);
    return cat ? cat.db_name : displayName;
  }, [categories]);

  const getDisplayName = useCallback((dbName) => {
    if (!categories || categories.length === 0) return dbName;
    const cat = categories.find(c => c.db_name === dbName);
    return cat ? cat.display_name : dbName;
  }, [categories]);

  // Default categories fallback
  const defaultCategories = [
    { display_name: "GIVING & STEWARDSHIP", db_name: "TITHES & OFFERINGS", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", display_order: 1, is_active: true },
    { display_name: "BUILDING FUND", db_name: "BUILDING FUND", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", display_order: 2, is_active: true },
    { display_name: "MISSIONS & OUTREACH", db_name: "MISSIONS", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", display_order: 3, is_active: true },
    { display_name: "CHURCH EVENTS", db_name: "EVENTS", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", display_order: 4, is_active: true },
    { display_name: "MEMBERSHIP", db_name: "MEMBERSHIP", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", display_order: 5, is_active: true },
  ];

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Supabase error fetching categories:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          // Use fallback categories if table doesn't exist or there's an error
          console.warn('Using default categories as fallback');
          setCategories(defaultCategories);
          
          // Initialize selectedTab with fallback
          if (!selectedTab && defaultCategories.length > 0) {
            if (typeof window !== "undefined") {
              const saved = localStorage.getItem("selectedTab");
              const savedCategory = defaultCategories.find(c => c.db_name === saved);
              const displayName = savedCategory ? savedCategory.display_name : defaultCategories[0].display_name;
              setSelectedTab(displayName);
            } else {
              setSelectedTab(defaultCategories[0].display_name);
            }
          }
          return;
        }
        
        const fetchedCategories = data || [];
        
        // If no categories found, use fallback
        if (fetchedCategories.length === 0) {
          console.warn('No categories found in database, using default categories');
          setCategories(defaultCategories);
        } else {
          setCategories(fetchedCategories);
        }
        
        // Initialize selectedTab if not set
        const categoriesToUse = fetchedCategories.length > 0 ? fetchedCategories : defaultCategories;
        if (!selectedTab && categoriesToUse.length > 0) {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem("selectedTab");
            const savedCategory = categoriesToUse.find(c => c.db_name === saved);
            const displayName = savedCategory ? savedCategory.display_name : categoriesToUse[0].display_name;
            setSelectedTab(displayName);
          } else {
            setSelectedTab(categoriesToUse[0].display_name);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', {
          error,
          message: error?.message,
          stack: error?.stack
        });
        // Use fallback categories on any error
        console.warn('Using default categories as fallback due to error');
        setCategories(defaultCategories);
        
        // Initialize selectedTab with fallback
        if (!selectedTab && defaultCategories.length > 0) {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem("selectedTab");
            const savedCategory = defaultCategories.find(c => c.db_name === saved);
            const displayName = savedCategory ? savedCategory.display_name : defaultCategories[0].display_name;
            setSelectedTab(displayName);
          } else {
            setSelectedTab(defaultCategories[0].display_name);
          }
        }
      }
    };
    fetchCategories();
  }, [supabase]);

  // Auth effect
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
    if (selectedTab && categories.length > 0) {
      localStorage.setItem("selectedTab", getDbName(selectedTab));
    }
  }, [selectedTab, categories, getDbName]);

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
        setAllProjects(cachedData.allProjects || []);
        setUserInvestedProjects(cachedData.userProjects);
        setCategoryCounts(cachedData.categoryCounts);
        setHasMembershipPayment(cachedData.hasMembership);
        updateUserStats(cachedData.userTransactions, selectedProjectId);
        setIsInitialLoading(false);
        return;
      }
      try {
        setIsDataLoading(true);
        const [transactionsResponse, projectsResponse] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, amount, metadata, created_at, user_id, category_name, type')
            .eq('status', 'completed'),
          supabase
            .from('projects')
            .select('id, title, category, budget, funds_raised, status')
            .eq('status', 'active')
        ]);
        if (transactionsResponse.error) throw transactionsResponse.error;
        if (projectsResponse.error) throw projectsResponse.error;
        const allTransactions = transactionsResponse.data || [];
        const allProjects = projectsResponse.data || [];
        // Filter by user_id column (for direct donations) OR metadata.investor_id (for legacy donations)
        const userTxs = allTransactions.filter(
          tx => tx.user_id === user.id || tx.metadata?.investor_id === user.id
        );
        const uniqueProjectIds = [
          ...new Set(userTxs.map(tx => tx.metadata?.proposal_id).filter(Boolean))
        ];
        const userProjects = allProjects.filter(p => 
          uniqueProjectIds.includes(p.id)
        );
        const counts = {};
        allProjects.forEach(p => {
          counts[p.category] = (counts[p.category] || 0) + 1;
        });
        const membershipProjects = allProjects.filter(p => p.category === 'MEMBERSHIP');
        const hasMembership = userTxs.some(
          tx => membershipProjects.some(p => p.id === tx.metadata?.proposal_id)
        );
        const processedData = {
          userTransactions: userTxs,
          allTransactions,
          allProjects,
          userProjects,
          categoryCounts: counts,
          hasMembership,
          timestamp: Date.now()
        };
        setCachedData(processedData);
        setUserTransactions(userTxs);
        setAllTransactions(allTransactions);
        setAllProjects(allProjects);
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

  // Listen for refresh events from payment modals
  useEffect(() => {
    const handleRefresh = () => {
      // Clear cache to force fresh fetch on next render
      setCachedData(null);
      // Small delay to ensure the transaction is committed to database
      setTimeout(() => {
        // Force re-fetch by clearing cache timestamp
        setCachedData(prev => prev ? { ...prev, timestamp: 0 } : null);
      }, 1000);
    };
    window.addEventListener('refreshDashboard', handleRefresh);
    return () => {
      window.removeEventListener('refreshDashboard', handleRefresh);
    };
  }, []);

  useEffect(() => {
    const dbTabName = getDbName(selectedTab);
    const projectsInCategory = userInvestedProjects.filter(proj => proj && proj.category === dbTabName);
    if (projectsInCategory.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsInCategory[0].id);
    }
  }, [userInvestedProjects, selectedTab, selectedProjectId]);

  const handleGive = () => {
    if (!user) {
      toast.error('Please sign in to make a donation');
      return;
    }
    setShowGivingModal(true);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchProposalData = async () => {
      try {
        setIsLoading(true);
        const dbTabName = getDbName(selectedTab);
        if (dbTabName === "MEMBERSHIP") {
          const { data: membershipProjects, error: projectError } = await supabase
            .from('projects')
            .select('id, budget, title, funds_raised, category')
            .eq('category', 'MEMBERSHIP');
          if (projectError) throw projectError;
          if (!membershipProjects || membershipProjects.length === 0) {
            setProposalData(null);
            return;
          }
          const projectIds = membershipProjects.map(p => p.id);
          const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, metadata')
            .eq('status', 'completed');
          if (transactionsError) throw transactionsError;
          const filtered = transactions.filter(
            tx => projectIds.includes(tx.metadata?.proposal_id)
          );
          const uniqueDonors = new Set(filtered.map(tx => tx.metadata?.investor_id)).size;
          const totalRaised = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
          const totalBudget = membershipProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
          setProposalData({
            ...membershipProjects[0],
            budget: totalBudget,
            amount_raised: totalRaised,
            investor_count: uniqueDonors
          });
          return;
        }
        let query = supabase
          .from('projects')
          .select('id, title, budget, funds_raised, category, donor_count')
          .eq('status', 'active');
        if (selectedProjectId) {
          query = query.eq('id', selectedProjectId);
        } else {
          query = query
            .eq('category', dbTabName)
            .order('created_at', { ascending: false })
            .limit(1);
        }
        const { data: project, error: projectError } = await query;
        if (projectError) {
          throw projectError;
        }
        if (!project || project.length === 0) {
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
          tx => tx.metadata?.proposal_id === project[0].id
        );
        const fundsRaised = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const uniqueDonors = new Set(filtered.map(tx => tx.metadata?.investor_id)).size;
        setProposalData({
          ...project[0],
          amount_raised: fundsRaised,
          investor_count: uniqueDonors
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

  const handleTabSelect = (tab) => {
    setIsCategoryLoading(true);
    setSelectedTab(tab);
    setSelectedProjectId(null);
    setProposalData(null);
    // Reset filter buttons when category changes
    setShowAllMyInvestments(false);
    setIsCategoryLoading(false);
  };

  const handleProjectSelect = (project) => {
    setSelectedProjectId(project.id);
    setSelectedTab(getDisplayName(project.category) || selectedTab);
  };

  // Get the current category name for filtering direct donations
  const currentCategoryName = selectedTab ? getDbName(selectedTab) : null;
  
  // Get project IDs in the current category for filtering
  const categoryProjectIds = useMemo(() => {
    if (!currentCategoryName || !categories.length) return [];
    
    // Get all possible category names (db_name and display_name) for the current category
    const currentCategory = categories.find(c => c.db_name === currentCategoryName || c.display_name === currentCategoryName);
    if (!currentCategory) return [];
    
    const targetDbName = currentCategory.db_name.trim().toUpperCase();
    const targetDisplayName = currentCategory.display_name.trim().toUpperCase();
    
    const projectIds = allProjects
      .filter(project => {
        if (!project.category) return false;
        // Case-insensitive comparison - match against both db_name and display_name
        const projectCategory = project.category.trim().toUpperCase();
        return projectCategory === targetDbName || projectCategory === targetDisplayName;
      })
      .map(project => project.id);
    return projectIds;
  }, [allProjects, currentCategoryName, categories]);
  
  const chartData = useMemo(() => {
    // Safety check
    if (!currentCategoryName) {
      return getMonthlyTotals([]);
    }

    if (showAllMyInvestments) {
      // Show all user transactions across all categories
      return getMonthlyTotals(userTransactions);
    } else {
      // Default: Show user transactions for selected project OR all projects in category OR direct donations to category
      return getMonthlyTotals(userTransactions.filter(tx => {
        const projectId = tx.metadata?.project_id || 
                         tx.metadata?.projectId || 
                         tx.metadata?.proposal_id || 
                         tx.metadata?.proposalId;
        
        // Filter by project ID (for selected project donations)
        const isSelectedProject = selectedProjectId && 
                                  (projectId === selectedProjectId || 
                                   String(projectId) === String(selectedProjectId));
        
        // Filter by projects in the selected category (if no specific project selected)
        const isProjectInCategory = !selectedProjectId && 
                                    projectId && 
                                    categoryProjectIds.includes(projectId);
        
        // Filter by direct donations to the selected category
        const isDirectDonation = tx.category_name && 
                                 tx.category_name.trim().toUpperCase() === currentCategoryName.trim().toUpperCase() && 
                                 !projectId;
        
        return isSelectedProject || isProjectInCategory || isDirectDonation;
      }));
    }
  }, [showAllMyInvestments, userTransactions, categoryProjectIds, currentCategoryName, selectedProjectId]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';
  const dbTabName = getDbName(selectedTab);

  // Don't render until categories are loaded
  if (categories.length === 0) {
    return (
      <Admin>
        <div className="min-h-screen bg-gray-50 dark:bg-black py-6 px-3 sm:px-4 lg:px-6 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 dark:text-gray-400">Loading categories...</p>
          </div>
        </div>
      </Admin>
    );
  }

  return (
    <Admin>
      <div className="min-h-screen bg-gray-50 dark:bg-black py-6 px-3 sm:px-4 lg:px-6">
        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-100 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center">
              <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <strong className="font-semibold text-sm">Error: </strong>
              <span className="ml-2 text-sm">{error}</span>
            </div>
            <button 
              className="absolute top-1 right-1 text-red-300 hover:text-red-100 transition-colors"
              onClick={() => setError(null)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-800">
            {/* Category Tabs - Church Themed */}
            <div className="flex flex-col space-y-3 md:space-y-0 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {categories.map((category) => (
                  <motion.button
                    key={category.display_name}
                    onClick={() => handleTabSelect(category.display_name)}
                    disabled={isCategoryLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative px-4 py-3 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                      selectedTab === category.display_name
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm border border-gray-300 dark:border-gray-700"
                    } ${isCategoryLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCategoryLoading && selectedTab === category.display_name ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={category.icon} />
                      </svg>
                    )}
                    <span className="text-center leading-tight">{category.display_name}</span>
                    {!!categoryCounts[category.db_name] && (
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white font-bold rounded-full shadow-md flex items-center justify-center min-w-[24px] h-6 text-xs px-2 border-2 border-white dark:border-gray-900">
                        {categoryCounts[category.db_name]}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stewardship Overview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
              {/* Personal Giving Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border-l-4 border-indigo-500"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Stewardship</h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{userName}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Giving This Year</span>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">${userStats.totalContributions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ministries Supported</span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{userStats.numberOfProjects}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Give Button */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleGive();
                    }}
                    disabled={!user}
                    className="w-full px-6 py-3 bg-indigo-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-700 active:bg-indigo-800 transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                    style={{ pointerEvents: user ? 'auto' : 'none' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Give to {selectedTab}</span>
                  </button>
                </div>

                {/* Community Impact */}
                <CommunityImpact 
                  impactStats={{
                    livesTouched: proposalData?.investor_count || 0,
                    ministriesSupported: userStats.numberOfProjects,
                    outreachImpact: categoryCounts[dbTabName] || 0
                  }}
                />
              </div>

              {/* Giving Summary Cards */}
              {proposalData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <GivingCard
                    title="Giving Partners"
                    amount={proposalData?.investor_count || 0}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                    color="indigo"
                  />
                  <GivingCard
                    title="Blessings Received"
                    amount={`$${proposalData?.amount_raised?.toLocaleString() || '0'}`}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    color="purple"
                  />
                  <GivingCard
                    title="Still Needed"
                    amount={`$${((proposalData?.budget || 0) - (proposalData?.amount_raised || 0)).toLocaleString()}`}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    color="gold"
                  />
                </div>
              )}
            </div>

            {/* Giving Timeline Chart */}
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Your Giving Journey</h3>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        showAllMyInvestments 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => { 
                        if (showAllMyInvestments) {
                          setShowAllMyInvestments(false);
                        } else {
                          setShowAllMyInvestments(true);
                        }
                      }}
                    >
                      All My Giving
                    </button>
                  </div>
                </div>
                {proposalData && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">"{proposalData.title}"</p>
                )}
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={userStats.totalContributions ? chartData : [{month: 'No data', value: 0}]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip 
                      formatter={(v) => [`$${v.toLocaleString()}`, 'Giving']}
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                        color: '#f3f4f6'
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Progress & Contribution */}
            {proposalData && userStats.currentProjectContribution > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-3 space-y-6">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-indigo-600 dark:bg-gray-800 rounded-lg p-6 text-white shadow-md border border-indigo-700 dark:border-gray-700"
                  >
                    <div className="text-center mb-4">
                      <p className="text-sm opacity-90 mb-1">Ministry Goal</p>
                      <p className="text-2xl font-bold">${proposalData?.budget?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-4">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-16 rounded-full transition-all duration-300 ${
                            i < Math.floor((proposalData?.amount_raised || 0) / (proposalData?.budget || 1) * 10) 
                              ? "bg-white" 
                              : "bg-white/30"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-sm opacity-90 mb-1">Your Faithful Giving</p>
                      <p className="text-3xl font-bold">
                        ${userStats.currentProjectContribution.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-800 rounded-lg p-6 shadow-md border border-gray-700"
                  >
                    <h4 className="text-center text-sm font-semibold text-gray-300 mb-4">Community Giving</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={ownershipPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                        >
                          {ownershipPieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={pieColors[idx]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `$${value.toLocaleString()}`}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f3f4f6'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => (
                            <span style={{ fontSize: '12px', color: '#d1d5db' }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Ministry List */}
            {proposalData && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ministry Opportunities</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showOnlyInvested}
                      onChange={(e) => setShowOnlyInvested(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Show only my ministries</span>
                  </label>
                </div>
                <ProposalList
                  showDonateButton={true} 
                  category={dbTabName} 
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

            {/* Giving Modal */}
            <GivingModal
              isOpen={showGivingModal}
              onClose={() => setShowGivingModal(false)}
              categoryName={selectedTab}
            />
          </div>
        </div>
      </div>
    </Admin>
  );
};

export default withAuth(Dashboard);
