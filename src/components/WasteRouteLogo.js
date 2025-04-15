import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const WasteRouteLogo = ({ size = 120, color = '#3B82F6' }) => {
  // Calculate dimensions based on size
  const outerCircleRadius = size / 2;
  const innerCircleRadius = size * 0.45;
  const center = size / 2;
  
  // For custom logos that need SVG, use this
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer Circle with gradient-like effect */}
        <Circle
          cx={center}
          cy={center}
          r={outerCircleRadius}
          fill="rgba(59, 130, 246, 0.1)"
        />
        
        {/* Inner Circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerCircleRadius}
          fill="rgba(59, 130, 246, 0.15)"
        />
        
        {/* Route Path (circular path with a gap) */}
        <Circle
          cx={center}
          cy={center}
          r={innerCircleRadius * 0.8}
          stroke={color}
          strokeWidth={3}
          strokeDasharray="5,3"
          fill="transparent"
        />
        
        {/* Pin/Marker at the start/end of route */}
        <Circle
          cx={center}
          cy={center - innerCircleRadius * 0.8}
          r={size * 0.06}
          fill={color}
        />
      </Svg>
      
      {/* Centered Icon using Ionicons */}
      <View style={styles.iconContainer}>
        <Ionicons name="trash-outline" size={size * 0.4} color={color} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WasteRouteLogo; 