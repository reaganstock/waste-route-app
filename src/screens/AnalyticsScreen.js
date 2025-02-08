import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockRoutes } from '../lib/mockData';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const [timeframe, setTimeframe] = useState('week');
  const [metrics, setMetrics] = useState({
    totalRoutes: 0,
    completionRate: 0,
    avgTimePerHouse: 0,
    totalHouses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Using mock data instead of Supabase
      const routes = mockRoutes.map(route => ({
        ...route,
        houses_count: route.houses.count,
        route_history: [
          { status: 'collect', timestamp: new Date().toISOString() },
          { status: 'collect', timestamp: new Date(Date.now() - 3600000).toISOString() }
        ]
      }));

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(routes);
      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionRate = (history) => {
    if (!history?.length) return 0;
    const completed = history.filter(h => h.status === 'collect').length;
    return (completed / history.length) * 100;
  };

  const calculateAverageTime = (history) => {
    if (!history?.length) return 0;
    let totalTime = 0;
    for (let i = 1; i < history.length; i++) {
      const timeDiff = new Date(history[i].timestamp) - new Date(history[i-1].timestamp);
      totalTime += timeDiff;
    }
    return totalTime / (history.length - 1) / 60000; // Convert to minutes
  };

  const calculateMetrics = (routes) => {
    const totalRoutes = routes.length;
    const totalHouses = routes.reduce((sum, route) => sum + route.houses_count, 0);
    const avgCompletionRate = routes.reduce((sum, route) => 
      sum + calculateCompletionRate(route.route_history), 0) / totalRoutes;
    const avgTime = routes.reduce((sum, route) => 
      sum + calculateAverageTime(route.route_history), 0) / totalRoutes;

    return {
      totalRoutes,
      totalHouses,
      completionRate: avgCompletionRate,
      avgTimePerHouse: avgTime
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timeframeButton,
                timeframe === period && styles.timeframeButtonActive
              ]}
              onPress={() => setTimeframe(period)}
            >
              <Text style={[
                styles.timeframeText,
                timeframe === period && styles.timeframeTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metrics Overview */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#4169E1', '#3151B7']}
              style={styles.metricGradient}
            >
              <Ionicons name="map" size={24} color="#fff" />
              <Text style={styles.metricValue}>{metrics.totalRoutes}</Text>
              <Text style={styles.metricLabel}>Total Routes</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.metricGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.metricValue}>{metrics.completionRate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.metricGradient}
            >
              <Ionicons name="time" size={24} color="#fff" />
              <Text style={styles.metricValue}>{metrics.avgTimePerHouse.toFixed(1)}m</Text>
              <Text style={styles.metricLabel}>Avg Time/House</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.metricGradient}
            >
              <Ionicons name="home" size={24} color="#fff" />
              <Text style={styles.metricValue}>{metrics.totalHouses}</Text>
              <Text style={styles.metricLabel}>Total Houses</Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#4169E1',
  },
  timeframeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 20,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default AnalyticsScreen; 