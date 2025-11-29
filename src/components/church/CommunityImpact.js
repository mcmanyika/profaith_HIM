'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function CommunityImpact({ ministriesSupportedData }) {
  const ministriesData = ministriesSupportedData || {};
  const [activeItems, setActiveItems] = useState(new Set());

  const allPieData = useMemo(() => {
    return Object.entries(ministriesData)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [ministriesData]);

  // Initialize activeItems when data changes
  useEffect(() => {
    if (allPieData.length > 0 && activeItems.size === 0) {
      setActiveItems(new Set(allPieData.map(item => item.name)));
    }
  }, [allPieData, activeItems.size]);

  // Filter pie data based on active items
  const pieData = useMemo(() => {
    return allPieData.filter(item => activeItems.has(item.name));
  }, [allPieData, activeItems]);

  // Generate colors dynamically based on number of ministries
  const COLORS = ['#818cf8', '#ec4899', '#f59e0b', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Create color map based on original data order
  const colorMap = useMemo(() => {
    const map = {};
    allPieData.forEach((item, index) => {
      map[item.name] = COLORS[index % COLORS.length];
    });
    return map;
  }, [allPieData]);

  const totalMinistries = Object.values(ministriesData).reduce((sum, count) => sum + count, 0);

  const handleLegendClick = (e) => {
    const name = e.dataKey || e.value;
    if (!name) return;
    
    setActiveItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm h-full flex items-center justify-center overflow-hidden"
    >
      {totalMinistries === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No ministries supported yet</p>
        </div>
      ) : (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 0, bottom: 25, left: 0 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius="100%"
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={colorMap[entry.name] || '#818cf8'} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [`$${Number(value).toLocaleString()}`, props.payload.name]}
                labelFormatter={() => ''}
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={50}
                wrapperStyle={{ paddingTop: '5px' }}
                iconSize={8}
                onClick={handleLegendClick}
                payload={allPieData.map((item, index) => {
                  const isActive = activeItems.has(item.name);
                  return {
                    value: item.name,
                    type: 'circle',
                    id: item.name,
                    color: colorMap[item.name] || COLORS[index % COLORS.length],
                    inactive: !isActive
                  };
                })}
                formatter={(value) => {
                  const isActive = activeItems.has(value);
                  return (
                    <span 
                      style={{ 
                        fontSize: '9px', 
                        color: isActive ? '#6b7280' : '#9ca3af',
                        opacity: isActive ? 1 : 0.5,
                        cursor: 'pointer'
                      }} 
                      className="dark:text-gray-400"
                    >
                      {value}
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
