import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { supabase } from '../config/supabase';
import ScreenTemplate from '../components/ScreenTemplate';

export default function TransactionsScreen({ onNavigate, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all', 'thisYear', 'thisMonth'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'category'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No user found');
        setLoading(false);
        return;
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount, metadata, created_at, user_id, category_name, type, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      const userTransactions = (transactionsData || []).filter(
        tx => tx.user_id === user.id || tx.metadata?.investor_id === user.id
      );

      setTransactions(userTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get transaction title
  const getTransactionTitleForSort = (transaction) => {
    if (transaction.category_name) {
      return transaction.category_name;
    }
    if (transaction.metadata?.proposalTitle) {
      return transaction.metadata.proposalTitle;
    }
    return 'Donation';
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let filtered = [...transactions];

    // Apply filter
    if (filter === 'thisYear') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startOfYear);
    } else if (filter === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startOfMonth);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'amount') {
        comparison = Number(a.amount || 0) - Number(b.amount || 0);
      } else if (sortBy === 'category') {
        const aTitle = getTransactionTitleForSort(a).toLowerCase();
        const bTitle = getTransactionTitleForSort(b).toLowerCase();
        comparison = aTitle.localeCompare(bTitle);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, filter, sortBy, sortOrder]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTransactions.length / itemsPerPage);
  }, [filteredTransactions.length]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [filteredTransactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionTitle = (transaction) => {
    if (transaction.category_name) {
      return transaction.category_name;
    }
    if (transaction.metadata?.proposalTitle) {
      return transaction.metadata.proposalTitle;
    }
    return 'Donation';
  };

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Fragment>
      <ScreenTemplate
        title="All Transactions"
        activeScreen="/transactions"
        onNavigate={onNavigate}
        onLogout={onLogout}
      >

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'thisYear' && styles.filterButtonActive]}
            onPress={() => setFilter('thisYear')}
          >
            <Text style={[styles.filterButtonText, filter === 'thisYear' && styles.filterButtonTextActive]}>
              This Year
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'thisMonth' && styles.filterButtonActive]}
            onPress={() => setFilter('thisMonth')}
          >
            <Text style={[styles.filterButtonText, filter === 'thisMonth' && styles.filterButtonTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Total {filter === 'thisYear' ? 'This Year' : filter === 'thisMonth' ? 'This Month' : ''}
          </Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
          <Text style={styles.summaryCount}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>

        {/* Sort Controls */}
        <View style={styles.sortContainer}>
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <View style={styles.sortButtonsRow}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
                onPress={() => setSortBy('date')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'amount' && styles.sortButtonActive]}
                onPress={() => setSortBy('amount')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'amount' && styles.sortButtonTextActive]}>
                  Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'category' && styles.sortButtonActive]}
                onPress={() => setSortBy('category')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'category' && styles.sortButtonTextActive]}>
                  Category
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Order:</Text>
            <View style={styles.sortButtonsRow}>
              <TouchableOpacity
                style={[styles.sortOrderButton, sortOrder === 'desc' && styles.sortOrderButtonActive]}
                onPress={() => setSortOrder('desc')}
              >
                <Text style={[styles.sortOrderButtonText, sortOrder === 'desc' && styles.sortOrderButtonTextActive]}>
                  Desc
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOrderButton, sortOrder === 'asc' && styles.sortOrderButtonActive]}
                onPress={() => setSortOrder('asc')}
              >
                <Text style={[styles.sortOrderButtonText, sortOrder === 'asc' && styles.sortOrderButtonTextActive]}>
                  Asc
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        {paginatedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.transactionsList}>
              {paginatedTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionContent}>
                    <Text style={styles.transactionTitle}>{getTransactionTitle(tx)}</Text>
                    <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
                    {tx.metadata?.proposalTitle && (
                      <Text style={styles.transactionProject}>{tx.metadata.proposalTitle}</Text>
                    )}
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text style={styles.transactionAmount}>{formatCurrency(tx.amount || 0)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.paginationInfo}>
                  Page {currentPage} of {totalPages}
                </Text>
                
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScreenTemplate>
      
      {/* Transaction Detail Modal */}
      <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedTransaction && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Category:</Text>
                <Text style={styles.modalValue}>{getTransactionTitle(selectedTransaction)}</Text>
              </View>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Amount:</Text>
                <Text style={[styles.modalValue, styles.modalAmount]}>
                  {formatCurrency(selectedTransaction.amount || 0)}
                </Text>
              </View>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Date:</Text>
                <Text style={styles.modalValue}>{formatDate(selectedTransaction.created_at)}</Text>
              </View>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Time:</Text>
                <Text style={styles.modalValue}>{formatDateTime(selectedTransaction.created_at)}</Text>
              </View>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Status:</Text>
                <Text style={[styles.modalValue, styles.modalStatus]}>
                  {selectedTransaction.status || 'Completed'}
                </Text>
              </View>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Type:</Text>
                <Text style={styles.modalValue}>{selectedTransaction.type || 'Donation'}</Text>
              </View>
              
              {selectedTransaction.metadata?.proposalTitle && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Project:</Text>
                  <Text style={styles.modalValue}>{selectedTransaction.metadata.proposalTitle}</Text>
                </View>
              )}
              
              {selectedTransaction.metadata?.proposal_id && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Project ID:</Text>
                  <Text style={styles.modalValue}>{selectedTransaction.metadata.proposal_id}</Text>
                </View>
              )}
              
              {selectedTransaction.metadata?.description && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Description:</Text>
                  <Text style={styles.modalValue}>{selectedTransaction.metadata.description}</Text>
                </View>
              )}
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Transaction ID:</Text>
                <Text style={[styles.modalValue, styles.modalId]}>{selectedTransaction.id}</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
    </Fragment>
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
    color: '#D32F2F',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sortContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 70,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortOrderButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  sortOrderButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortOrderButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sortOrderButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionContent: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  transactionProject: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
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
    textAlign: 'center',
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
  wrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  modalAmount: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalStatus: {
    color: '#34C759',
    textTransform: 'capitalize',
  },
  modalId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
});

