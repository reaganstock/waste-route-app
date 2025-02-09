import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mockRoutes, mockTeamMembers } from '../../src/lib/mockData';

const CompletedRoutesScreen = () => {
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
  const routesByDriver = {};
  completedRoutes.forEach(route => {
    if (!routesByDriver[route.driver_name]) {
      routesByDriver[route.driver_name] = {
        routes: [],
        totalBins: 0,
        totalDuration: 0,
        totalRoutes: 0,
      };
    }
    routesByDriver[route.driver_name].routes.push(route);
    routesByDriver[route.driver_name].totalBins += route.total_bins;
    routesByDriver[route.driver_name].totalDuration += route.duration;
    routesByDriver[route.driver_name].totalRoutes += 1;
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <BlurView intensity={80} style={styles.header}>
        <Text style={styles.title}>Completed Routes</Text>
      </BlurView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.entries(routesByDriver).map(([driverName, data]) => (
          <View key={driverName} style={styles.driverSection}>
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <Ionicons name="person" size={20} color="#3B82F6" />
                <Text style={styles.driverName}>{driverName}</Text>
              </View>
              <View style={styles.driverStats}>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>{data.totalRoutes} routes</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>{data.totalBins} bins</Text>
                </View>
              </View>
            </View>

            {data.routes.map((route) => (
              <TouchableOpacity key={route.id} style={styles.routeCard}>
                <LinearGradient
                  colors={['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
                  style={styles.routeGradient}
                >
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <View style={[
                      styles.efficiencyBadge,
                      { backgroundColor: getEfficiencyColor(route.efficiency_score) }
                    ]}>
                      <Text style={styles.efficiencyText}>{route.efficiency_score}% efficient</Text>
                    </View>
                  </View>

                  <View style={styles.routeInfo}>
                    <Text style={styles.routeDate}>
                      {new Date(route.completion_date).toLocaleDateString()}
                    </Text>
                    <View style={styles.routeStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.statText}>{route.completed_houses}/{route.total_bins} bins</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.statText}>{formatDuration(route.duration)}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.statText}>{route.on_time_percentage}% on time</Text>
                      </View>
                    </View>
                  </View>

                  {route.skipped_houses > 0 && (
                    <View style={styles.skippedInfo}>
                      <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                      <Text style={styles.skippedText}>{route.skipped_houses} houses skipped</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const getEfficiencyColor = (score) => {
  if (score >= 90) return 'rgba(16,185,129,0.2)';
  if (score >= 75) return 'rgba(245,158,11,0.2)';
  return 'rgba(239,68,68,0.2)';
};

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  driverSection: {
    marginBottom: 24,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  driverStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statBadgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  routeCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  routeGradient: {
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  routeInfo: {
    marginBottom: 12,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
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
  skippedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  skippedText: {
    color: '#F59E0B',
    fontSize: 13,
  },
});

export default CompletedRoutesScreen; 