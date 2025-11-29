import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';

export default function BarChart({ data, size = 300 }) {
  const [activeCategories, setActiveCategories] = useState({});

  // Initialize all categories as active
  useEffect(() => {
    if (data && data.length > 0) {
      const initialActive = {};
      data.forEach((item) => {
        initialActive[item.label] = true;
      });
      setActiveCategories(initialActive);
    }
  }, [data]);

  const toggleCategory = (label) => {
    setActiveCategories((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Filter data based on active categories
  const filteredData = data.filter((item) => activeCategories[item.label] !== false);
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  // Use filtered data for calculations
  const displayData = filteredData.length > 0 ? filteredData : data;
  const total = displayData.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.container, { height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const maxValue = Math.max(...displayData.map(item => item.value));
  const barHeight = 32;
  const barSpacing = 16;
  const chartHeight = displayData.length * (barHeight + barSpacing) + 20;
  const chartWidth = size;
  const labelWidth = 90; // Fixed width for category labels
  const maxBarWidth = chartWidth - labelWidth - 20; // Leave space for labels and padding

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const colors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
    '#FF2D55', '#5856D6', '#FFCC00', '#5AC8FA', '#FF9500'
  ];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartContainer, { height: chartHeight }]}>
        <Svg width={chartWidth} height={chartHeight}>
          <G>
            {displayData.map((item, index) => {
              const barWidth = (item.value / maxValue) * maxBarWidth;
              const y = index * (barHeight + barSpacing) + 10;
              const percentage = ((item.value / total) * 100).toFixed(1);
              
              // Truncate long category names
              const displayLabel = item.label.length > 12 
                ? item.label.substring(0, 9) + '...' 
                : item.label;

              const barStartX = labelWidth + 10;
              const isActive = activeCategories[item.label] !== false;

              return (
                <G key={index}>
                  {/* Category label - clickable */}
                  <SvgText
                    x={5}
                    y={y + barHeight / 2 + 5}
                    fontSize={11}
                    fontWeight="600"
                    fill={isActive ? "#000000" : "#999999"}
                    textDecoration={isActive ? "none" : "line-through"}
                  >
                    {displayLabel}
                  </SvgText>
                  {/* Bar */}
                  <Rect
                    x={barStartX}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={isActive ? colors[index % colors.length] : "#E0E0E0"}
                    rx={4}
                    opacity={isActive ? 1 : 0.5}
                  />
                </G>
              );
            })}
          </G>
        </Svg>
        {/* Clickable label overlays */}
        {displayData.map((item, index) => {
          const y = index * (barHeight + barSpacing) + 10;
          const isActive = activeCategories[item.label] !== false;
          
          return (
            <TouchableOpacity
              key={`touch-${index}`}
              style={[
                styles.labelTouchArea,
                {
                  top: y - 8,
                  height: barHeight + 16,
                  width: labelWidth,
                }
              ]}
              onPress={() => toggleCategory(item.label)}
              activeOpacity={0.7}
            >
              <View style={styles.labelTouchAreaInner} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.summary}>
        {data.map((item, originalIndex) => {
          const displayIndex = displayData.findIndex(d => d.label === item.label);
          const isActive = activeCategories[item.label] !== false;
          const percentage = isActive && displayIndex >= 0 
            ? ((item.value / total) * 100).toFixed(1)
            : '0.0';
          const displayLabel = item.label.length > 25 
            ? item.label.substring(0, 22) + '...' 
            : item.label;
          
          return (
            <TouchableOpacity
              key={originalIndex}
              style={styles.summaryItem}
              onPress={() => toggleCategory(item.label)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.summaryColor, 
                { 
                  backgroundColor: isActive ? colors[originalIndex % colors.length] : '#E0E0E0',
                  opacity: isActive ? 1 : 0.5,
                }
              ]} />
              <View style={styles.summaryContent}>
                <Text style={[
                  styles.summaryLabel,
                  { color: isActive ? '#000000' : '#999999' }
                ]} numberOfLines={1}>
                  {displayLabel}
                </Text>
                <Text style={[
                  styles.summaryValue,
                  { color: isActive ? '#000000' : '#999999' }
                ]}>
                  {formatCurrency(item.value)} ({percentage}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  chartContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  labelTouchArea: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  labelTouchAreaInner: {
    flex: 1,
  },
  summary: {
    width: '100%',
    paddingHorizontal: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  summaryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  summaryContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
});

