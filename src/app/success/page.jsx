'use client'
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PaymentSuccess({ searchParams }) {
  const params = React.use(searchParams);
  const { amount, proposalId, investorId } = params;
  const [investorName, setInvestorName] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const supabase = createClientComponentClient();

  // Format amount as currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch investor name
      if (investorId) {
        const { data: investorData, error: investorError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', investorId)
          .single();

        if (investorError) {
          console.error('Error fetching investor name:', investorError);
        } else if (investorData) {
          setInvestorName(investorData.full_name);
        }
      }

      // Fetch project name
      if (proposalId) {
        const { data: projectData, error: projectError } = await supabase
          .from('proposals')
          .select('title')
          .eq('id', proposalId)
          .single();

        if (projectError) {
          console.error('Error fetching project name:', projectError);
        } else if (projectData) {
          setProjectName(projectData.title);
        }
      }
    };

    fetchData();
  }, [investorId, proposalId, supabase]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-gray-100 to-gray-200 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white/20 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-gray-300/30"
      >
        <motion.div 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-center"
        >
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <h1 className="text-5xl font-extrabold mb-4 text-gray-800 hover:text-gray-600 transition-colors">
              <Link href="/">Thank you! 🎉</Link>
            </h1>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-2xl text-gray-700 mb-6"
          >
            Your payment was successful
          </motion.h2>

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-white/30 backdrop-blur-sm p-6 rounded-xl border border-gray-300/40"
          >
            <div className="space-y-4 text-gray-800">
              <div className="text-3xl font-bold">
                {formattedAmount}
              </div>
              {projectName && (
                <div className="text-sm">
                  <span className="opacity-75">Project:</span> {projectName}
                </div>
              )}
              {investorName && (
                <div className="text-sm">
                  <span className="opacity-75">Investor:</span> {investorName}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8"
          >
            <Link 
              href="/"
              className="inline-block px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all duration-300 hover:scale-105"
            >
              Return Home
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}
