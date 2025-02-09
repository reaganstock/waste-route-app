import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { mockTeamMembers, mockRoutes } from '../lib/mockData';

const MetricCard = ({ title, value, icon, trend, trendValue }) => (
  <View style={styles.metricCard}>
    <LinearGradient
      colors={['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
      style={styles.metricGradient}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricIcon}>
          <Ionicons name={icon} size={22} color="#3B82F6" />
        </View>
        {trend && (
          <View style={[
            styles.trendContainer,
            { backgroundColor: trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }
          ]}>
            <Ionicons 
              name={trend === 'up' ? 'arrow-up' : 'arrow-down'} 
              size={14} 
              color={trend === 'up' ? '#10B981' : '#EF4444'} 
            />
            <Text style={[
              styles.trendText,
              { color: trend === 'up' ? '#10B981' : '#EF4444' }
            ]}>
              {trendValue}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </LinearGradient>
  </View>
);

const PerformanceCard = ({ title, data }) => (
  <View style={styles.performanceCard}>
    <Text style={styles.performanceTitle}>{title}</Text>
    {data.map((item, index) => (
      <View key={index} style={styles.performanceItem}>
        <View style={styles.performanceInfo}>
          <View style={styles.performanceNameContainer}>
            <View style={[styles.rankBadge, { backgroundColor: index < 3 ? '#3B82F6' : '#6B7280' }]}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <Text style={styles.performanceName}>{item.name}</Text>
          </View>
          <Text style={styles.performanceMetric}>{item.metric}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.performanceBar, { width: `${item.percentage}%` }]} />
          <Text style={styles.percentageText}>{item.percentage}%</Text>
        </View>
      </View>
    ))}
  </View>
);

const AnalyticsScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedTab, setSelectedTab] = useState('analytics');

  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  // Get completed routes with driver info
  const completedRoutes = mockRoutes
    .filter(route => route.status === 'completed')
    .map(route => {
      const driver = mockTeamMembers.find(member => member.id === route.driver_id);
      return {
        ...route,
        driver_name: driver ? driver.full_name : 'Unknown Driver',
      };
    })
    .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date));

  // Group routes by driver
  const routesByDriver = completedRoutes.reduce((acc, route) => {
    if (!acc[route.driver_name]) {
      acc[route.driver_name] = [];
    }
    acc[route.driver_name].push(route);
    return acc;
  }, {});

  // Calculate key metrics
  const totalRoutes = mockRoutes.length;
  const completedRoutesCount = mockRoutes.filter(r => r.status === 'completed').length;
  const completionRate = Math.round((completedRoutesCount / totalRoutes) * 100);
  
  // Calculate efficiency
  const totalBins = mockRoutes.reduce((acc, route) => acc + route.houses.length, 0);
  const completedBins = mockRoutes.reduce((acc, route) => acc + (route.completed_houses || 0), 0);
  const efficiency = Math.round((completedBins / totalBins) * 100);

  // Top performing drivers
  const topDrivers = [
    { name: 'John Doe', metric: '45 routes', percentage: 90 },
    { name: 'Jane Smith', metric: '32 routes', percentage: 75 },
    { name: 'Bob Wilson', metric: '28 routes', percentage: 65 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <BlurView intensity={80} style={styles.header}>
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'analytics' && styles.tabActive]}
            onPress={() => setSelectedTab('analytics')}
          >
            <Text style={[styles.tabText, selectedTab === 'analytics' && styles.tabTextActive]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
            onPress={() => setSelectedTab('completed')}
          >
            <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
              Completed Routes
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {selectedTab === 'analytics' ? (
        <>
          <View style={styles.periodSelector}>
            {periods.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.id)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Completed Routes"
                value={completedRoutesCount}
                icon="checkmark-circle"
                trend="up"
                trendValue="12"
              />
              <MetricCard
                title="Completion Rate"
                value={`${completionRate}%`}
                icon="trending-up"
                trend="up"
                trendValue="8"
              />
              <MetricCard
                title="Total Bins"
                value={totalBins}
                icon="trash"
                trend="up"
                trendValue="5"
              />
              <MetricCard
                title="Efficiency"
                value={`${efficiency}%`}
                icon="speedometer"
                trend="up"
                trendValue="10"
              />
            </View>

            <PerformanceCard
              title="Top Performing Drivers"
              data={topDrivers}
            />

            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              
              <View style={styles.insightCard}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
                <Text style={styles.insightText}>
                  Route completion rate has increased by 15% this {selectedPeriod}
                </Text>
              </View>

              <View style={styles.insightCard}>
                <Ionicons name="people" size={20} color="#3B82F6" />
                <Text style={styles.insightText}>
                  Driver efficiency has improved with 95% on-time completion
                </Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {Object.entries(routesByDriver).map(([driverName, routes]) => (
            <View key={driverName} style={styles.driverSection}>
              <View style={styles.driverHeader}>
                <Ionicons name="person" size={20} color="#3B82F6" />
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.routeCount}>
                  <Text style={styles.routeCountText}>{routes.length} routes</Text>
                </View>
              </View>

              {routes.map((route) => (
                <TouchableOpacity key={route.id} style={styles.routeCard}>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Text style={styles.routeDate}>
                      {new Date(route.completion_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.routeStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                      <Text style={styles.statText}>{route.completed_houses} bins</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                      <Text style={styles.statText}>{route.duration} mins</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  periodButton: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  performanceCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  performanceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  performanceItem: {
    marginBottom: 20,
  },
  performanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  performanceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  performanceMetric: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  percentageText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  insightsSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  driverSection: {
    marginBottom: 24,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  routeCount: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeCountText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  routeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});

export default AnalyticsScreen; 