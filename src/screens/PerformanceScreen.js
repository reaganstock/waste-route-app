import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - (CARD_PADDING * 2) - (CARD_MARGIN * 2)) / 2;

const MetricCard = ({ title, value, icon, trend, trendValue }) => {
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.metricCard,
      {
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }
    ]}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.metricGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.metricIcon}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.iconGradient}
          >
            <Ionicons name={icon} size={24} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {trend && (
          <View style={[
            styles.trendBadge,
            { backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
          ]}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={16}
              color={trend === 'up' ? '#10B981' : '#EF4444'}
            />
            <Text style={[
              styles.trendValue,
              { color: trend === 'up' ? '#10B981' : '#EF4444' }
            ]}>
              {trendValue}%
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const PerformanceScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [metrics, setMetrics] = useState({
    totalHouses: 0,
    routesCompleted: 0,
    hoursDriven: 0,
    efficiency: 0
  });
  const [recentRoutes, setRecentRoutes] = useState([]);

  useEffect(() => {
    fetchMemberData();
  }, [id, selectedPeriod]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch the member details
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Get the date ranges based on selected period
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Fetch ALL completed routes for the member (for all-time metrics)
      const { data: allRoutes, error: allRoutesError } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          status,
          completed_houses,
          total_houses,
          duration,
          date,
          houses (
            id,
            status
          )
        `)
        .eq('driver_id', id)
        .eq('status', 'completed');

      if (allRoutesError) throw allRoutesError;

      // Calculate all-time metrics
      const totalHousesServiced = allRoutes.reduce((sum, route) => sum + (route.completed_houses || 0), 0);
      const completedRoutes = allRoutes.length;
      const totalHoursDriven = allRoutes.reduce((sum, route) => sum + (route.duration || 0), 0);

      // Filter routes for the selected period (for efficiency calculation only)
      const periodRoutes = allRoutes.filter(route => {
        const routeDate = new Date(route.date);
        return routeDate >= startDate && routeDate <= now;
      });

      // Calculate efficiency using 60/40 formula for the selected period
      const routeEfficiencies = periodRoutes.map(route => {
        const durationHours = route.duration / 60;
        const completionRate = route.completed_houses / route.total_houses;
        const housesPerHour = durationHours > 0 ? (route.completed_houses / durationHours) : 0;
        const speedEfficiency = housesPerHour / 60; // No cap at 100%
        return (0.6 * completionRate + 0.4 * speedEfficiency) * 100;
      });

      // Calculate average efficiency from all route efficiencies
      const averageEfficiency = routeEfficiencies.length > 0
        ? Number((routeEfficiencies.reduce((sum, eff) => sum + Number(eff), 0) / routeEfficiencies.length).toFixed(2))
        : 0;

      setMetrics({
        totalHouses: totalHousesServiced,
        routesCompleted: completedRoutes,
        hoursDriven: Number((totalHoursDriven / 60).toFixed(2)),  // Convert minutes to hours
        efficiency: averageEfficiency
      });

      // Set recent routes for the timeline (from the selected period)
      setRecentRoutes(periodRoutes.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));

    } catch (error) {
      console.error('Error fetching member data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error || 'Member not found'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchMemberData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <View style={styles.memberInfo}>
        {member.avatar_url ? (
          <Image
            source={{ uri: member.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
            <Text style={styles.avatarText}>
              {member.full_name?.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          <Text style={styles.memberRole}>{member.role}</Text>
        </View>
      </View>

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

      <ScrollView style={styles.content}>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Routes Completed"
            value={metrics.routesCompleted}
            icon="checkmark-circle-outline"
          />
          <MetricCard
            title="Total Houses"
            value={metrics.totalHouses}
            icon="home-outline"
          />
          <MetricCard
            title="Hours Driven"
            value={metrics.hoursDriven}
            icon="time-outline"
          />
          <MetricCard
            title="Efficiency"
            value={`${metrics.efficiency}%`}
            icon="trending-up-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.timeline}>
            {recentRoutes.map((route) => (
              <TouchableOpacity 
                key={route.id}
                style={styles.timelineItem}
                onPress={() => router.push(`/route/${route.id}/details`)}
              >
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{route.name}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(route.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.timelineMetrics}>
                    {route.completed_houses} of {route.total_houses} houses • {Math.round(route.efficiency)}% efficiency
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.insightText}>
              Completed {metrics.routesCompleted} routes in the past {selectedPeriod}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.insightText}>
              Average efficiency of {metrics.efficiency}% across all routes
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const getAvatarColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '#3B82F6';
    case 'driver':
      return '#10B981';
    case 'manager':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#374151',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#374151',
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
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  metricGradient: {
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  timelineMetrics: {
    color: '#6B7280',
    fontSize: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PerformanceScreen; 
 
 
 