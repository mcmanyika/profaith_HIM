'use client';
import React from 'react';
import { motion } from 'framer-motion';

export default function CommunityImpact({ impactStats }) {
  const stats = impactStats || {
    livesTouched: 0,
    ministriesSupported: 0,
    outreachImpact: 0
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-gray-800 dark:text-gray-100 font-semibold text-lg">Community Impact</h3>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 italic">
        "Your faithful giving touches lives and builds God's kingdom. Thank you for making a difference!"
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.livesTouched || 0}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Lives Touched</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.ministriesSupported || 0}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ministries</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.outreachImpact || 0}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Outreach Events</div>
        </div>
      </div>
    </motion.div>
  );
}
