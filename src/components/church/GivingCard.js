'use client';
import React from 'react';
import { motion } from 'framer-motion';

export default function GivingCard({ title, amount, icon, description, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    gold: "bg-amber-600",
    green: "bg-emerald-600",
    indigo: "bg-indigo-600"
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`${colorClasses[color]} rounded-lg p-5 text-center shadow-md hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex flex-col items-center">
        <div className="mb-3">
          {icon}
        </div>
        <div className="text-white font-semibold text-xs tracking-wider mb-2 uppercase">
          {title}
        </div>
        <div className="text-white font-bold text-xl">
          {typeof amount === 'number' ? `$${amount.toLocaleString()}` : amount}
        </div>
        {description && (
          <div className="text-white/90 text-xs mt-2">
            {description}
          </div>
        )}
      </div>
    </motion.div>
  );
}
