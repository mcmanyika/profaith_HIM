import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { amount, proposalId, currency = 'usd' } = req.body;

    // Validate input parameters
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        message: 'Invalid amount provided',
        details: { amount }
      });
    }

    if (!proposalId) {
      return res.status(400).json({ 
        message: 'Missing proposalId',
        details: { proposalId }
      });
    }

    // Create a PaymentIntent with the specified amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        proposalId,
        originalAmount: amount
      },
      capture_method: 'automatic',
      confirm: false,
      setup_future_usage: 'off_session',
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Error creating payment intent',
      error: {
        message: error.message,
        type: error.type,
        code: error.code
      }
    });
  }
} 