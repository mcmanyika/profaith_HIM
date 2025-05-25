"use client";

import { useState } from "react";
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

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function PaymentForm({ proposalId, investorId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Please wait while we load the payment system...");
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
      } else if (paymentIntent) {
        

        // Validate required fields
        if (!paymentIntent.id || !proposalId || !investorId || !amount) {
          throw new Error('Missing required payment data');
        }

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
            amount
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || 'Failed to save investment data';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        // Show success message before redirect
        toast.success('Payment successful! Redirecting...');
        // Redirect to success page with query parameters
        router.push(`/success?amount=${amount}&proposalId=${proposalId}&investorId=${investorId}`);
      }
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
  amount: PropTypes.number.isRequired
};

export default function CheckoutForm({ clientSecret, proposalId, investorId, amount }) {
  // Log the props received by the component
  console.log('CheckoutForm props:', { clientSecret, proposalId, investorId, amount });

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
    <div className="checkout-container">
      <Elements stripe={stripePromise} options={{ appearance, clientSecret }}>
        <PaymentForm 
          proposalId={proposalId}
          investorId={investorId}
          amount={amount}
        />
      </Elements>
    </div>
  )
}

CheckoutForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  proposalId: PropTypes.string.isRequired,
  investorId: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired
};