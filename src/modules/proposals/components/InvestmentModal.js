import { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import CheckoutPage from './CheckoutPage';
// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// List of supported countries
const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'EU', name: 'European Union' },
  { code: 'AE', name: 'United Arab Emirates' },
];

// Payment Form Component
function PaymentForm({ proposal, onClose, onSubmit }) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [investmentDetails, setInvestmentDetails] = useState(null);
  const supabase = createClientComponentClient();

  // Error messages for common international card issues
  const getErrorMessage = (error) => {
    if (error.type === 'card_error') {
      switch (error.code) {
        case 'card_not_supported':
          return 'This card type is not supported. Please try a different card or use the Stripe Checkout link below.';
        case 'currency_not_supported':
          return 'This card does not support USD transactions. Please try a different card or use the Stripe Checkout link below.';
        case 'insufficient_funds':
          return 'Your card has insufficient funds. Please try a different card or amount.';
        case 'declined':
          return 'Your card was declined. This could be due to international transaction restrictions. Please try a different card or use the Stripe Checkout link below.';
        case 'processing_error':
          return 'There was an error processing your card. This could be due to international transaction restrictions. Please try again or use the Stripe Checkout link below.';
        default:
          return `${error.message} If this persists, please use the Stripe Checkout link below.`;
      }
    }
    return error.message;
  };

  // Subscribe to real-time updates for the proposal
  useEffect(() => {
    if (!proposal?.id) return;

    const subscription = supabase
      .channel('proposal-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals',
          filter: `id=eq.${proposal.id}`
        },
        (payload) => {
          console.log('Proposal updated:', payload.new);
          // Update local state with new proposal data
          if (payload.new) {
            toast.info(`Proposal's raised amount updated to ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(payload.new.amount_raised)}`);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [proposal?.id, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      toast.error('Payment system is not initialized. Please try again.');
      setLoading(false);
      return;
    }

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid investment amount');
      setLoading(false);
      return;
    }

    try {
      // Create payment intent first
      toast.info('Creating payment intent...');
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          proposalId: proposal.id,
        }),
      });

      // Clone the response before any read
      const responseClone = response.clone();
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        const rawText = await responseClone.text();
        console.error('Failed to parse response:', jsonError);
        console.error('Raw response:', rawText);
        throw new Error('Server response was not in the expected format. Please try again or contact support.');
      }

      if (!response.ok) {
        console.error('Payment intent creation failed:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
        // Handle specific error cases
        if (response.status === 400) {
          throw new Error(responseData.message || 'Invalid payment details');
        } else if (response.status === 500) {
          throw new Error(responseData.error?.message || 'Server error occurred. Please try again later.');
        } else {
          throw new Error(responseData.message || 'Failed to create payment intent. Please try again.');
        }
      }

      const { clientSecret, paymentIntentId } = responseData;

      if (!clientSecret || !paymentIntentId) {
        console.error('Invalid payment intent response:', responseData);
        throw new Error('Server returned invalid payment details. Please try again or contact support.');
      }

      toast.info('Validating card details...');
      const { error: cardError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (cardError) {
        console.error('Card validation error:', cardError);
        throw new Error(getErrorMessage(cardError));
      }

      toast.info('Processing payment...');
      const { error: paymentError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw new Error(paymentError.message);
      }

      // Confirm payment on the server
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user's profile for additional data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', user.id)
        .single();

      const confirmResponse = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          proposalId: proposal.id,
          investorId: user.id,
          userId: user.id,
          amount: parseFloat(amount),
          customerName: profile?.full_name || 'Anonymous',
          customerEmail: profile?.email,
          phoneNumber: profile?.phone_number,
          categoryName: proposal.category || 'investment'
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        console.error('Payment confirmation error:', {
          status: confirmResponse.status,
          data: confirmData
        });
        throw new Error(confirmData.message || 'Failed to confirm payment');
      }

      // Get updated proposal data
      const { data: updatedProposal } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposal.id)
        .single();

      // Format the amount for display
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);

      // Calculate funding percentage
      const fundingPercentage = Math.round((updatedProposal.amount_raised / updatedProposal.budget) * 100);

      // Store investment details for display
      setInvestmentDetails({
        amount: formattedAmount,
        proposalTitle: proposal.title,
        investorName: profile?.full_name || 'Anonymous Investor',
        investorEmail: profile?.email,
        fundingPercentage,
        totalRaised: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(updatedProposal.amount_raised),
        targetAmount: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(updatedProposal.budget)
      });

      // Send confirmation email
      try {
        await fetch('/api/send-investment-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: profile?.email,
            investorName: profile?.full_name,
            proposalTitle: proposal.title,
            amount: formattedAmount,
            fundingPercentage,
            totalRaised: updatedProposal.amount_raised,
            targetAmount: updatedProposal.budget
          }),
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't throw error here, just log it
      }

      // Show success message with investment details
      toast.success(
        <div>
          <h3 className="font-bold mb-2">Investment Successful!</h3>
          <p>Amount: {formattedAmount}</p>
          <p>Project: {proposal.title}</p>
          <p>Funding Progress: {fundingPercentage}%</p>
          <p>Total Raised: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(updatedProposal.amount_raised)}</p>
          <p className="mt-2">A confirmation email has been sent to your registered email address.</p>
        </div>,
        {
          position: "bottom-center",
          autoClose: 30000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Payment error:', {
        message: err.message,
        error: err
      });
      setError(getErrorMessage(err));
      toast.error(`Payment failed: ${getErrorMessage(err)}`, {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Investment Amount (USD)
        </label>
        <div className="mt-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-4 py-2 block w-full rounded-md border border-gray-300 focus:border-gray-500 focus:ring-gray-500"
            required
            min="1"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border rounded-md">
          <CardElement
            className='px-4 p-2'
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          We accept most international cards from supported countries. If your card is declined, please try a different card or <Link href="https://buy.stripe.com/14A8wP21U0Eh5YU3dr77O08" className="text-blue-500 font-bold">Click here to pay with Stripe</Link>.
        </p>
      </div>

      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50"
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : 'Confirm Investment'}
        </button>
      </div>

      {investmentDetails && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <h3 className="font-bold text-green-800 mb-2">Investment Details</h3>
          <p className="text-sm text-green-700">Amount: {investmentDetails.amount}</p>
          <p className="text-sm text-green-700">Project: {investmentDetails.proposalTitle}</p>
          <p className="text-sm text-green-700">Funding Progress: {investmentDetails.fundingPercentage}%</p>
          <p className="text-sm text-green-700">Total Raised: {investmentDetails.totalRaised}</p>
          <p className="text-sm text-green-700">Target Amount: {investmentDetails.targetAmount}</p>
        </div>
      )}
    </form>
  );
}

// Main InvestmentModal Component
export default function InvestmentModal({ proposal, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Invest in {proposal.title}</h2>
        <Elements stripe={stripePromise}>
          <PaymentForm proposal={proposal} onClose={onClose} onSubmit={onSubmit} />
        </Elements>
      </div>
    </div>
  );
} 