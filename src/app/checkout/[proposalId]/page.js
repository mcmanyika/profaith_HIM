'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';
import convertToSubcurrency from '../../../lib/convertToSubcurrency';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from '../../../components/checkout';

import Admin from '../../../components/layout/Admin';

if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLIC_KEY is not defined");
}
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);


export default function CheckoutPageWrapper({ params }) {
  const router = useRouter();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState(null);
  const [investorId, setInvestorId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const supabase = createClientComponentClient();
  const proposalId = use(params).proposalId;
  
  const amount = 1;
  const options = {
    mode: 'payment',
    currency: 'usd',
    amount: amount,
  };

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            proposalId,
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setClientSecret(data.clientSecret);
      } catch (error) {
        // console.error('Error creating payment intent:', error);
        toast.error('Failed to initialize payment');
      }
    };

    // Only create payment intent if we don't have one and have a valid proposal
    if (!clientSecret && proposal) {
      createPaymentIntent();
    }
  }, [amount, proposalId, clientSecret, proposal]);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to invest');
          router.push('/login');
          return;
        }
        setInvestorId(user.id);

        // Fetch profile for name, email, and phone number
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        setCustomerName(profile.full_name);
        setCustomerEmail(profile.email);
        setPhoneNumber(profile.phone_number);

        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();

        if (error) throw error;
        setCategoryName(data.category);

        if (!data) {
          toast.error('Proposal not found');
          router.push('/');
          return;
        }

        if (data.status !== 'active') {
          toast.error('This proposal is not currently accepting investments');
          router.push('/');
          return;
        }

        if (data && (customerName || customerEmail || phoneNumber || categoryName)) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              customer_name: customerName,
              customer_email: customerEmail,
              phone_number: phoneNumber,
              category_name: categoryName
            })
            .eq('proposal_id', proposalId);

          if (updateError) {
            toast.error('Failed to update transaction');
          }
        }

        setProposal(data);
      } catch (error) {
        // console.error('Error fetching proposal:', error);
        toast.error('Failed to load proposal');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId, router, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  return (
    <Admin>
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Left column - Proposal details */}
            <div className="w-full bg-gray-50 border-r border-gray-100">
              <div className="s mr-2 space-y-6">
                <div className="w-full">
                  <div className=" text-gray-600 text-sm prose prose-sm p-4 bg-white rounded-lg shadow-sm max-w-none">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">{proposal.title}</h1>
                  <p className='uppercase font-semibold'>Investment DESCRIPTION</p>
                    {proposal.description.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <dt className="text-gray-500">Status</dt>
                      <dd className="font-medium">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          proposal.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {proposal.status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <dt className="text-gray-500">Category</dt>
                      <dd className="font-medium text-gray-900">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                          {categoryName}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <dt className="text-gray-500">Created</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(proposal.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Right column - Checkout form */}
            <div className="p-6">
              <div className="w-full">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Complete Your Investment</h2>
                {clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm clientSecret={clientSecret} proposalId={proposalId} investorId={investorId} amount={amount} customerName={customerName} customerEmail={customerEmail} phoneNumber={phoneNumber} categoryName={categoryName} />
                  </Elements>
                ) : (
                  <div className="flex justify-center items-center p-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Admin>
  );
} 