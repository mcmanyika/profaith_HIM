'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ categoryName, amount, clientSecret, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system is loading. Please wait...');
      setLoading(false);
      return;
    }

    try {
      // Submit the payment form first (required by Stripe)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message);
        setLoading(false);
        return;
      }

      // Confirm payment with Stripe using the existing clientSecret
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/account?success=true&category=${encodeURIComponent(categoryName)}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message);
        setLoading(false);
        return;
      }

      // Payment successful - save to database
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        try {
          // Get user profile
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not found');
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone_number')
            .eq('id', user.id)
            .single();

          // Save transaction to database
          const response = await fetch('/api/confirm-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              userId: user.id,
              amount: parseFloat(amount),
              customerName: profile?.full_name || 'Anonymous',
              customerEmail: profile?.email || user.email,
              phoneNumber: profile?.phone_number || '',
              categoryName: categoryName,
              // No projectId for direct donations
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to save transaction:', errorData);
            // Don't fail the payment, just log the error
            toast.warning('Payment successful but failed to save transaction. Please contact support.');
          }
        } catch (saveError) {
          console.error('Error saving transaction:', saveError);
          // Don't fail the payment, just log the error
          toast.warning('Payment successful but failed to save transaction. Please contact support.');
        }
      }

      // Payment successful
      toast.success(`Thank you for your donation to ${categoryName}!`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{categoryName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="py-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe || !elements}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Complete Donation'}
        </button>
      </div>
    </form>
  );
}

export default function GivingModal({ isOpen, onClose, categoryName }) {
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [step, setStep] = useState('amount'); // 'amount' or 'payment'
  const supabase = createClientComponentClient();

  const handleAmountSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to make a donation');
        return;
      }

      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryName: categoryName,
          description: `Donation to ${categoryName}`,
        }),
      });

      // Check if response is OK first
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Server error (${response.status}): ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || 
                          errorData.error?.message || 
                          errorMessage;
          } else {
            // Response is HTML (error page), get text for debugging
            const text = await response.text();
            console.error('API returned HTML instead of JSON:', text.substring(0, 200));
            errorMessage = `Server error: API endpoint may not be configured correctly`;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!data || !data.clientSecret) {
        throw new Error('Invalid response from server: missing clientSecret');
      }

      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (error) {
      console.error('Error initializing payment:', error);
      const errorMessage = error.message || 'Failed to initialize payment. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    setAmount('');
    setClientSecret(null);
    setStep('amount');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Give to {categoryName}
                  </h2>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {step === 'amount' ? (
                  <form onSubmit={handleAmountSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Donation Amount (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your donation will go directly to <strong>{categoryName}</strong>.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </form>
                ) : (
                  clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <PaymentForm
                        categoryName={categoryName}
                        amount={amount}
                        clientSecret={clientSecret}
                        onSuccess={() => {
                          toast.success('Thank you for your donation!');
                          // Trigger a custom event to refresh dashboard data
                          window.dispatchEvent(new CustomEvent('refreshDashboard'));
                          handleClose();
                        }}
                        onClose={handleClose}
                      />
                    </Elements>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

