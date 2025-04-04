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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const MetricCard = ({ title, value, icon, trend, trendValue }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={24} color="#3B82F6" />
      </View>
      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend === 'up' ? 'arrow-up' : 'arrow-down'} 
            size={16} 
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
  </View>
);

const PerformanceScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [metrics, setMetrics] = useState({
    routesCompleted: 0,
    housesServiced: 0,
    efficiency: 0,
    hoursDriven: 0,
  });
  const [recentRoutes, setRecentRoutes] = useState([]);

  useEffect(() => {
    fetchMemberData();
  }, [id, selectedPeriod]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get date range based on selected period
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
      }

      // Fetch member profile and routes
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select(`
          *,
          routes:routes(
            id,
            name,
            date,
            status,
            completed_houses,
            total_houses,
            efficiency,
            duration
          )
        `)
        .eq('id', id)
        .single();

      if (memberError) throw memberError;

      // Calculate metrics
      const periodRoutes = memberData.routes?.filter(r => 
        new Date(r.date) >= startDate && new Date(r.date) <= now
      ) || [];

      const completedRoutes = periodRoutes.filter(r => r.status === 'completed');
      const totalHousesServiced = completedRoutes.reduce((sum, r) => sum + (r.completed_houses || 0), 0);
      const avgEfficiency = completedRoutes.length > 0
        ? completedRoutes.reduce((sum, r) => sum + (r.efficiency || 0), 0) / completedRoutes.length
        : 0;
      const totalHours = completedRoutes.reduce((sum, r) => sum + (r.duration || 0), 0);

      setMember(memberData);
      setMetrics({
        routesCompleted: completedRoutes.length,
        housesServiced: totalHousesServiced,
        efficiency: Math.round(avgEfficiency),
        hoursDriven: Math.round(totalHours),
      });

      // Get recent routes
      setRecentRoutes(
        memberData.routes
          ?.sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5) || []
      );

    } catch (error) {
      console.error('Error fetching performance data:', error);
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
            title="Houses Serviced"
            value={metrics.housesServiced}
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
                onPress={() => {
                  // Navigate to appropriate screen based on route status
                  if (route.status === 'completed') {
                    router.push(`/route/${route.id}/details`);
                  } else if (route.status === 'in_progress') {
                    router.push(`/route/${route.id}`);
                  } else {
                    router.push(`/route/${route.id}/edit`);
                  }
                }}
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
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 12,
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
 
 
 