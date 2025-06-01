import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { paymentIntentId, proposalId, investorId, amount, customerName, customerEmail, phoneNumber } = await req.json();

    if (!paymentIntentId || !proposalId || !investorId || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { message: 'Payment not successful' },
        { status: 400 }
      );
    }

    // Call the handle_payment_confirmation function
    const { data, error } = await supabase.rpc('handle_payment_confirmation', {
      p_payment_intent_id: paymentIntentId,
      p_proposal_id: proposalId,
      p_investor_id: investorId,
      p_amount: amount
    });

    if (error) {
      console.error('Error saving payment data:', error);
      return NextResponse.json(
        { message: 'Error saving payment data' },
        { status: 500 }
      );
    }

    // Update the transaction row with customerName, customerEmail, and phoneNumber
    if (data && (customerName || customerEmail || phoneNumber)) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          customer_name: customerName,
          customer_email: customerEmail,
          phone_number: phoneNumber
        })
        .eq('id', data);
      if (updateError) {
        console.error('Error updating transaction with customer info:', updateError);
        // Not fatal, so don't return error
      }
    }

    return NextResponse.json(
      { 
        message: 'Payment confirmed and saved successfully',
        transactionId: data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in payment confirmation:', error);
    return NextResponse.json(
      { message: error.message || 'Error confirming payment' },
      { status: 500 }
    );
  }
} 