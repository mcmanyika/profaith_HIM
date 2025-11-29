import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StripeProvider, useStripe, CardField } from '@stripe/stripe-react-native';
import { supabase } from '../config/supabase';
import { createPaymentIntent, confirmPayment } from '../config/api';

// Stripe publishable key - should be in environment variable
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

function GivingScreenContent({ onClose, onSuccess }) {
  const { confirmPayment: stripeConfirmPayment } = useStripe();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [step, setStep] = useState('amount'); // 'amount' or 'payment'
  const [clientSecret, setClientSecret] = useState(null);
  const [cardDetails, setCardDetails] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, display_name, db_name')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        Alert.alert('Error', 'Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleAmountSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please sign in to make a donation');
      }

      // Create payment intent
      const { clientSecret: secret, paymentIntentId } = await createPaymentIntent(
        amount,
        selectedCategory.display_name
      );

      setClientSecret(secret);
      setStep('payment');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    if (!clientSecret) {
      Alert.alert('Error', 'Payment session expired. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Get current user and profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not found');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', user.id)
        .single();

      // Confirm payment with Stripe
      // CardField automatically creates the payment method, so we just need to confirm
      const { error: confirmError, paymentIntent } = await stripeConfirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: profile?.full_name || 'Anonymous',
            email: profile?.email || user.email,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'Succeeded') {
        // Save transaction to database
        try {
          await confirmPayment(
            paymentIntent.id,
            user.id,
            amount,
            profile?.full_name || 'Anonymous',
            profile?.email || user.email,
            profile?.phone_number || '',
            selectedCategory.display_name
          );

          Alert.alert(
            'Thank You!',
            `Your donation of ${formatCurrency(parseFloat(amount))} to ${selectedCategory.display_name} has been processed successfully.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  if (onSuccess) onSuccess();
                  if (onClose) onClose();
                },
              },
            ]
          );
        } catch (saveError) {
          console.error('Error saving transaction:', saveError);
          Alert.alert(
            'Payment Successful',
            'Your payment was processed, but there was an issue saving the transaction. Please contact support.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (onSuccess) onSuccess();
                  if (onClose) onClose();
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message || 'An error occurred during payment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('amount');
    setClientSecret(null);
    setCardDetails(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (categoriesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (step === 'payment') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Payment Summary */}
        <View style={styles.paymentSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Category:</Text>
            <Text style={styles.summaryValue}>{selectedCategory?.display_name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryAmount}>
              {amount ? formatCurrency(parseFloat(amount)) : '$0.00'}
            </Text>
          </View>
        </View>

        {/* Card Field */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>
          <CardField
            postalCodeEnabled={false}
            placeholders={{
              number: '4242 4242 4242 4242',
            }}
            cardStyle={{
              backgroundColor: '#FFFFFF',
              textColor: '#000000',
              borderWidth: 1,
              borderColor: '#DDDDDD',
              borderRadius: 8,
            }}
            style={styles.cardField}
            onCardChange={(cardDetails) => {
              setCardDetails(cardDetails);
            }}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handlePaymentSubmit}
          disabled={loading || !cardDetails?.complete}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Complete Donation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Give Now</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Category</Text>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory?.id === category.id && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(category)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory?.id === category.id && styles.categoryButtonTextSelected,
                ]}
              >
                {category.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donation Amount</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#999"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </View>
        {selectedCategory && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your donation will go directly to <Text style={styles.infoBold}>{selectedCategory.display_name}</Text>.
            </Text>
          </View>
        )}
      </View>

      {/* Quick Amount Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Amount</Text>
        <View style={styles.quickAmountContainer}>
          {[10, 25, 50, 100, 250, 500].map((quickAmount) => (
            <TouchableOpacity
              key={quickAmount}
              style={styles.quickAmountButton}
              onPress={() => setAmount(quickAmount.toString())}
              disabled={loading}
            >
              <Text style={styles.quickAmountText}>${quickAmount}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleAmountSubmit}
        disabled={loading || !selectedCategory || !amount}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            Continue to Payment
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function GivingScreen({ onClose, onSuccess }) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Stripe is not configured. Please set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <GivingScreenContent onClose={onClose} onSuccess={onSuccess} />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  categoryButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBox: {
    marginTop: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  paymentSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
});

