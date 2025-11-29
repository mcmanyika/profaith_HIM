import { loadStripe } from '@stripe/stripe-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export { stripePromise };

// Create a payment intent
export const createPaymentIntent = async (amount, proposalId) => {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        amount,
        proposalId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Process a successful donation
export const handleDonationSuccess = async (paymentIntent, projectId, categoryName = 'donation') => {
  try {
    // Get current user data
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user profile for additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone_number')
      .eq('id', user.id)
      .single();

    const response = await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        projectId,
        memberId: user.id,
        userId: user.id,
        amount: paymentIntent.amount / 100, // Convert from cents to dollars
        customerName: profile?.full_name || 'Anonymous',
        customerEmail: profile?.email,
        phoneNumber: profile?.phone_number,
        categoryName: categoryName // Category for church giving
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to confirm donation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming donation:', error);
    throw error;
  }
};

// Keep backward compatibility
export const handlePaymentSuccess = handleDonationSuccess; 