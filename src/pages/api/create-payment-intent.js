import Stripe from 'stripe';

// Initialize Stripe - we don't need Supabase for payment intent creation
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { amount, projectId, proposalId, categoryName, currency = 'usd', description = 'Church Donation' } = req.body;
    
    // Support both projectId and proposalId for backward compatibility
    const finalProjectId = projectId || proposalId;

    // Validate input parameters
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        message: 'Invalid amount provided',
        details: { amount }
      });
    }

    // Build metadata - allow donations without projectId for simplified giving
    // All metadata values must be strings for Stripe
    const metadata = {
      originalAmount: String(amount),
      type: finalProjectId ? 'donation' : 'direct_donation'
    };
    
    if (finalProjectId) {
      metadata.projectId = String(finalProjectId);
      metadata.proposalId = String(finalProjectId); // Backward compatibility
    }
    
    if (categoryName) {
      metadata.categoryName = String(categoryName);
    }

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      throw new Error('Stripe secret key is not configured. Please check your environment variables.');
    }

    // Prepare payment intent data
    const paymentIntentData = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description: description || (categoryName ? `Donation to ${categoryName}` : 'Church Donation'),
      metadata: metadata,
      capture_method: 'automatic',
      confirm: false,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      }
    };

    // Create a PaymentIntent with the specified amount and currency
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent creation error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Error creating payment intent',
      error: {
        message: error.message || 'An unexpected error occurred',
        type: error.type,
        code: error.code
      }
    });
  }
} 