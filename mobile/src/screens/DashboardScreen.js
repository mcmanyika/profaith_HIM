import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../config/supabase';
import GivingScreen from './GivingScreen';
import ScreenTemplate from '../components/ScreenTemplate';
import BarChart from '../components/BarChart';

export default function DashboardScreen({ onLogout, onNavigate, openGivingModal = false, onGivingModalClose }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGivingModal, setShowGivingModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate totals
  const totalThisYear = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return transactions
      .filter(tx => new Date(tx.created_at) >= startOfYear)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [transactions]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(tx => new Date(tx.created_at) >= startOfMonth)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [transactions]);

  // Get user's projects with their contribution amounts
  const userProjectsWithContributions = useMemo(() => {
    const projectMap = {};
    transactions.forEach(tx => {
      const projectId = tx.metadata?.proposal_id || tx.metadata?.project_id;
      if (projectId) {
        if (!projectMap[projectId]) {
          projectMap[projectId] = { projectId, amount: 0 };
        }
        projectMap[projectId].amount += Number(tx.amount || 0);
      }
    });

    return projects
      .filter(p => projectMap[p.id])
      .map(p => ({
        ...p,
        userContribution: projectMap[p.id].amount,
      }));
  }, [transactions, projects]);

  // Get all transactions sorted by date
  const allTransactionsSorted = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [transactions]);

  // Get paginated transactions
  const recentTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allTransactionsSorted.slice(startIndex, endIndex);
  }, [allTransactionsSorted, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(allTransactionsSorted.length / itemsPerPage);
  }, [allTransactionsSorted.length]);

  // Reset to page 1 when transactions change
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  // Get transaction title (project name or category)
  const getTransactionTitle = (transaction) => {
    const projectId = transaction.metadata?.proposal_id || transaction.metadata?.project_id;
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) return project.title;
    }
    if (transaction.category_name) {
      return transaction.category_name;
    }
    return 'Donation';
  };

  // Prepare data for pie chart - group by category
  const pieChartData = useMemo(() => {
    const categoryMap = {};
    transactions.forEach(tx => {
      const category = getTransactionTitle(tx);
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += Number(tx.amount || 0);
    });

    return Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limit to top 10 categories
  }, [transactions, projects]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) {
        setError('No user found');
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }
      setProfile(profileData);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount, metadata, created_at, user_id, category_name, type, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Filter by user_id OR metadata.investor_id (for legacy donations)
      const userTransactions = (transactionsData || []).filter(
        tx => tx.user_id === currentUser.id || tx.metadata?.investor_id === currentUser.id
      );
      setTransactions(userTransactions);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, category, budget, funds_raised, status')
        .eq('status', 'active');

      if (projectsError) throw projectsError;

      // Get unique project IDs from user transactions
      const userProjectIds = [
        ...new Set(
          userTransactions
            .map(tx => tx.metadata?.proposal_id || tx.metadata?.project_id)
            .filter(Boolean)
        ),
      ];

      // Filter projects to only those user contributed to
      const userProjects = (projectsData || []).filter(p => userProjectIds.includes(p.id));
      setProjects(userProjects);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle external giving modal trigger
  useEffect(() => {
    if (openGivingModal) {
      setShowGivingModal(true);
      if (onGivingModalClose) {
        onGivingModalClose();
      }
    }
  }, [openGivingModal, onGivingModalClose]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  const handleGiveNow = () => {
    setShowGivingModal(true);
  };

  const handleGivingSuccess = () => {
    // Refresh dashboard data after successful donation
    fetchData();
    setShowGivingModal(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const retryFetch = () => {
    fetchData();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  const handleNavigation = (href, name) => {
    if (href === '/give') {
      handleGiveNow();
    } else if (onNavigate) {
      onNavigate(href, name);
    }
  };

  const customHeader = (
    <View style={styles.headerContent}>
      <Text style={styles.welcomeText}>
        Welcome, <Text style={styles.userName}>{userName}</Text>
      </Text>
    </View>
  );

  return (
    <ScreenTemplate
      headerContent={customHeader}
      activeScreen="/dashboard"
      onNavigate={handleNavigation}
      onLogout={handleLogout}
    >

      {/* Metrics Cards */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total This Year</Text>
          <Text style={styles.metricValue}>{formatCurrency(totalThisYear)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total This Month</Text>
          <Text style={styles.metricValue}>{formatCurrency(totalThisMonth)}</Text>
        </View>
      </View>

      {/* Quick Action */}
      <TouchableOpacity style={styles.giveButton} onPress={handleGiveNow}>
        <Text style={styles.giveButtonText}>Give Now</Text>
      </TouchableOpacity>

      {/* Giving Breakdown Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Giving Breakdown</Text>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('/transactions', 'All Transactions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {pieChartData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <BarChart data={pieChartData} size={300} />
          </View>
        )}
      </View>

      {/* My Projects */}
      {userProjectsWithContributions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Projects</Text>
          <View style={styles.projectsList}>
            {userProjectsWithContributions.map((project) => (
              <View key={project.id} style={styles.projectItem}>
                <View style={styles.projectContent}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <Text style={styles.projectCategory}>{project.category}</Text>
                </View>
                <Text style={styles.projectContribution}>
                  {formatCurrency(project.userContribution)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Giving Modal */}
      <Modal
        visible={showGivingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGivingModal(false)}
      >
        <GivingScreen
          onClose={() => setShowGivingModal(false)}
          onSuccess={handleGivingSuccess}
        />
      </Modal>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#c33',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  giveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  giveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    paddingBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  projectsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  projectContent: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  projectCategory: {
    fontSize: 12,
    color: '#999',
  },
  projectContribution: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  paginationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  paginationButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
