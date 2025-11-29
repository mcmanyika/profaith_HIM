import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Helper function to get Supabase client (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req) {
  try {
    const { paymentIntentId, projectId, proposalId, memberId, investorId, userId, amount, customerName, customerEmail, phoneNumber, categoryName } = await req.json();

    // Support both old and new parameter names for backward compatibility
    const finalProjectId = projectId || proposalId;
    const finalMemberId = memberId || investorId || userId; // Use userId if memberId not provided

    // Validate required fields (projectId is optional for direct donations)
    if (!paymentIntentId || !userId || !amount || !customerName || !customerEmail || !categoryName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { message: 'Donation not successful' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = getSupabaseClient();

    // For direct donations without projectId, save directly to transactions table
    if (!finalProjectId) {
      const { data: transaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          type: 'credit',
          status: 'completed',
          payment_method: 'stripe',
          metadata: {
            payment_intent_id: paymentIntentId,
            category_name: categoryName,
            type: 'direct_donation'
          },
          customer_name: customerName,
          customer_email: customerEmail,
          phone_number: phoneNumber || null,
          category_name: categoryName
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error saving direct donation:', insertError);
        return NextResponse.json(
          { 
            message: 'Error saving payment data',
            error: insertError.message
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          message: 'Payment confirmed and saved successfully',
          transactionId: transaction.id
        },
        { status: 200 }
      );
    }

    // For donations with projectId, use the RPC function
    if (!finalMemberId) {
      return NextResponse.json(
        { message: 'Member ID is required for project donations' },
        { status: 400 }
      );
    }

    // Call the handle_donation_confirmation function
    const { data, error } = await supabase.rpc('handle_donation_confirmation', {
      p_payment_intent_id: paymentIntentId,
      p_project_id: finalProjectId,
      p_member_id: finalMemberId,
      p_amount: amount,
      p_user_id: userId,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_phone_number: phoneNumber || '',
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