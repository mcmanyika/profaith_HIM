'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Daily Scripture verses - rotating selection
const DAILY_VERSES = [
  {
    text: "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.",
    reference: "2 Corinthians 9:7"
  },
  {
    text: "Honor the Lord with your wealth, with the firstfruits of all your crops.",
    reference: "Proverbs 3:9"
  },
  {
    text: "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the Lord.",
    reference: "Malachi 3:10"
  },
  {
    text: "It is more blessed to give than to receive.",
    reference: "Acts 20:35"
  },
  {
    text: "Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done.",
    reference: "Proverbs 19:17"
  },
  {
    text: "Trust in the Lord with all your heart and lean not on your own understanding.",
    reference: "Proverbs 3:5"
  },
  {
    text: "The earth is the Lord's, and everything in it, the world, and all who live in it.",
    reference: "Psalm 24:1"
  }
];

export default function DailyVerse() {
  const [verse, setVerse] = useState(null);

  useEffect(() => {
    // Get verse based on day of year (so it's consistent per day)
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const verseIndex = dayOfYear % DAILY_VERSES.length;
    setVerse(DAILY_VERSES[verseIndex]);
  }, []);

  if (!verse) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-indigo-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-indigo-600 dark:border-indigo-500 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-200 italic text-sm leading-relaxed mb-2">
            "{verse.text}"
          </p>
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            — {verse.reference}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
