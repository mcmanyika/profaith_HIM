"use client";

import { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function PaymentForm({ proposalId, investorId, customerName, customerEmail, phoneNumber, categoryName }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState(null);

  // Fetch userId on mount
  useEffect(() => {
    async function fetchUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    fetchUserId();
  }, []);

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Please wait while we load the payment system...");
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?amount=${amount}&proposalId=${proposalId}&investorId=${investorId}`,
        },
        redirect: 'if_required'
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message);
        } else if (error.type === "authentication_error") {
          setMessage("Your payment session has expired. Please refresh the page and try again.");
        } else if (error.type === "api_error") {
          setMessage("We're having trouble connecting to our payment system. Please try again in a few minutes.");
        } else {
          setMessage("An unexpected error occurred. Please try again later.");
        }
        return;
      }

      // If we get here, the payment was successful
      if (!paymentIntent) {
        throw new Error('No payment intent received');
      }

      // Validate required fields
      if (!paymentIntent.id || !proposalId || !investorId || !amount) {
        throw new Error('Missing required payment data');
      }

      // Get user profile for additional data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', userId)
        .single();

      // Call our API to save the investment data
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          proposalId,
          investorId,
          userId,
          amount: parseFloat(amount),
          customerName: profile?.full_name || customerName || 'Anonymous',
          customerEmail: profile?.email || customerEmail,
          phoneNumber: profile?.phone_number || phoneNumber,
          categoryName: categoryName || 'investment'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Payment confirmation error:', {
          status: response.status,
          data: data
        });
        const errorMessage = data.message || 'Failed to save investment data';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Show success message before redirect
      toast.success('Payment successful! Redirecting...');
      // Redirect to success page with query parameters
      router.push(`/success?amount=${amount}&proposalId=${proposalId}&investorId=${investorId}`);
    } catch (error) {
      console.error('Payment error:', error);
      setMessage(error.message || 'An error occurred while processing your payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "accordion",
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="payment-form">
      <div className="amount-input-container">
        <label htmlFor="amount" className="amount-label">Amount (USD)</label>
        <div className="amount-input-wrapper">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
            className="amount-input"
          />
        </div>
      </div>
      <style jsx>{`
        .amount-input-container {
          margin-bottom: 24px;
        }
        .amount-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #30313d;
          margin-bottom: 8px;
        }
        .amount-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .currency-symbol {
          position: absolute;
          left: 12px;
          color: #30313d;
          font-size: 16px;
          font-weight: 500;
        }
        .amount-input {
          width: 100%;
          padding: 12px 12px 12px 28px;
          font-size: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background-color: #ffffff;
          color: #30313d;
          transition: border-color 0.2s ease;
        }
        .amount-input:focus {
          outline: none;
          border-color: #0570de;
          box-shadow: 0 0 0 1px #0570de;
        }
        .amount-input::placeholder {
          color: #a0a0a0;
        }
        .amount-input::-webkit-inner-spin-button,
        .amount-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .amount-input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button 
        disabled={isLoading || !stripe || !elements} 
        id="submit"
        className="payment-button"
        aria-busy={isLoading}
      >
        <span id="button-text">
          {isLoading ? (
            <div className="spinner-container">
              <div className="spinner" id="spinner" role="status" aria-label="Processing payment">
                <span className="sr-only">Processing payment...</span>
              </div>
              <span className="loading-text">Processing payment...</span>
            </div>
          ) : "Pay now"}
        </span>
      </button>
      {message && (
        <div 
          id="payment-message" 
          className="payment-message"
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </form>
  );
}

PaymentForm.propTypes = {
  proposalId: PropTypes.string.isRequired,
  investorId: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  customerEmail: PropTypes.string,
  phoneNumber: PropTypes.string,
  categoryName: PropTypes.string,
};

export default function CheckoutForm({ clientSecret, proposalId, investorId, customerName, customerEmail, phoneNumber, categoryName }) {

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      spacingUnit: '4px',
      borderRadius: '4px',
    },
  };
  
  return (
    <div className="mx-auto">
      <Elements stripe={stripePromise} options={{ appearance, clientSecret }}>
        <PaymentForm 
          proposalId={proposalId}
          investorId={investorId}
          customerName={customerName}
          customerEmail={customerEmail}
          phoneNumber={phoneNumber}
          categoryName={categoryName}
        />
      </Elements>
    </div>
  )
}

CheckoutForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  proposalId: PropTypes.string.isRequired,
  investorId: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  customerEmail: PropTypes.string,
  phoneNumber: PropTypes.string,
  categoryName: PropTypes.string,
};