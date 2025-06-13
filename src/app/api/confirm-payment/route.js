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
    const { paymentIntentId, proposalId, investorId, userId, amount, customerName, customerEmail, phoneNumber, categoryName } = await req.json();

    if (!paymentIntentId || !proposalId || !investorId || !amount || !customerName || !customerEmail || !phoneNumber || !categoryName) {
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
      p_amount: amount,
      p_user_id: userId,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_phone_number: phoneNumber,
      p_category_name: categoryName
    });

    if (error) {
      console.error('Error saving payment data:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code,
        params: {
          paymentIntentId,
          proposalId,
          investorId,
          amount,
          userId,
          customerName,
          customerEmail,
          phoneNumber,
          categoryName
        }
      });
      return NextResponse.json(
        { 
          message: 'Error saving payment data',
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      );
    }

    // Get proposal details for the email
    // const { data: proposalData, error: proposalError } = await supabase
    //   .from('proposals')
    //   .select('title, description')
    //   .eq('id', proposalId)
    //   .single();

    // if (proposalError) {
    //   console.error('Error fetching proposal details:', proposalError);
    // }

    // Send confirmation email using Supabase Edge Function
    // const { error: emailError } = await supabase.functions.invoke('send-email', {
    //   body: {
    //     email: customerEmail,
    //     investorName: customerName,
    //     proposalTitle: proposalData?.title || 'Investment Proposal',
    //     amount: amount,
    //     fundingPercentage: (amount / (proposalData?.target_amount || amount)) * 100,
    //     totalRaised: amount,
    //     targetAmount: proposalData?.target_amount || amount,
    //     transactionId: data
    //   }
    // });

    // if (emailError) {
    //   console.error('Error sending confirmation email:', emailError);
    //   // Don't return error to client since payment was successful
    // }

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