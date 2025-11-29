import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

export default function PieChart({ data, size = 200 }) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const radius = size / 2 - 10;
  const center = size / 2;
  let currentAngle = -90; // Start from top

  const colors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
    '#FF2D55', '#5856D6', '#FFCC00', '#5AC8FA', '#FF9500'
  ];

  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate path for pie slice
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      path: pathData,
      color: colors[index % colors.length],
      label: item.label,
      value: item.value,
      percentage: (percentage * 100).toFixed(1),
    };
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {paths.map((slice, index) => (
            <Path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.legend}>
        {paths.map((slice, index) => {
          // Truncate long category names
          const displayLabel = slice.label.length > 25 
            ? slice.label.substring(0, 22) + '...' 
            : slice.label;
          
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
              <View style={styles.legendContent}>
                <Text style={[styles.legendLabel, { color: '#000000' }]} numberOfLines={1}>
                  {displayLabel}
                </Text>
                <Text style={[styles.legendValue, { color: '#000000' }]}>
                  {slice.percentage}% • {formatCurrency(slice.value)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  legend: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  legendContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  legendLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 3,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
});

