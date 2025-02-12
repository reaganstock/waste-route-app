import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// Helper function for avatar colors
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

const MetricCard = ({ icon, title, value, color, showInfo, infoText, trend }) => (
  <TouchableOpacity 
    style={[styles.metricCard, { borderLeftColor: color }]}
    onPress={showInfo ? () => Alert.alert(title, infoText) : null}
    activeOpacity={showInfo ? 0.7 : 1}
  >
    <LinearGradient
      colors={[`${color}20`, `${color}10`]}
      style={styles.metricGradient}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${color}30` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#10B98120' : '#EF444420' }]}>
            <Ionicons 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trend > 0 ? '#10B981' : '#EF4444'} 
            />
            <Text style={[styles.trendText, { color: trend > 0 ? '#10B981' : '#EF4444' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const PerformerCard = ({ member, position }) => {
  const router = useRouter();
  const routesCompleted = member.completed_routes || 0;
  const efficiency = Math.round((routesCompleted / (routesCompleted + 2)) * 100);

  const getPositionColor = (pos) => {
    switch (pos) {
      case 1: return ['#FFD700', '#FFF7CC']; // Gold
      case 2: return ['#C0C0C0', '#F5F5F5']; // Silver
      case 3: return ['#CD7F32', '#FFE5CC']; // Bronze
      default: return ['#3B82F6', '#EBF5FF']; // Blue
    }
  };

  const [primaryColor, secondaryColor] = getPositionColor(position);

  return (
    <TouchableOpacity 
      style={styles.performerCard}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[`${primaryColor}20`, `${primaryColor}10`]}
        style={styles.performerGradient}
      >
        <View style={styles.performerInfo}>
          <View style={[
            styles.positionBadge,
            { backgroundColor: primaryColor }
          ]}>
            <Text style={[
              styles.positionText,
              { color: position <= 3 ? '#000' : '#fff' }
            ]}>#{position}</Text>
          </View>
          {member.avatar_url ? (
            <Image
              source={{ uri: member.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
              <Text style={styles.avatarText}>
                {member.full_name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.performerName}>{member.full_name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${getAvatarColor(member.role)}20` }]}>
              <Text style={[styles.roleText, { color: getAvatarColor(member.role) }]}>{member.role}</Text>
            </View>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={[styles.statBadge, { backgroundColor: `${primaryColor}20` }]}>
            <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
            <Text style={[styles.statValue, { color: primaryColor }]}>{routesCompleted}</Text>
            <Text style={[styles.statLabel, { color: primaryColor }]}>Routes</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: `${primaryColor}20` }]}>
            <Ionicons name="flash" size={16} color={primaryColor} />
            <Text style={[styles.statValue, { color: primaryColor }]}>{efficiency}%</Text>
            <Text style={[styles.statLabel, { color: primaryColor }]}>Efficiency</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const RouteCard = ({ route }) => {
  const router = useRouter();
  const efficiency = Math.round((route.completed_houses / route.houses.length) * 100);
  const date = new Date(route.date);

  return (
    <TouchableOpacity 
      style={styles.routeCard}
      onPress={() => router.push(`/route/${route.id}/details`)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.routeGradient}
      >
        <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{route.name}</Text>
          <View style={[styles.efficiencyBadge, { 
            backgroundColor: efficiency >= 90 ? '#10B98120' : 
                           efficiency >= 70 ? '#F59E0B20' : 
                           '#EF444420'
          }]}>
            <Text style={[styles.efficiencyText, {
              color: efficiency >= 90 ? '#10B981' : 
                     efficiency >= 70 ? '#F59E0B' : 
                     '#EF4444'
            }]}>{efficiency}% Efficient</Text>
          </View>
        </View>
        <Text style={styles.routeDate}>
          {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Ionicons name="home" size={16} color="#3B82F6" />
            <Text style={styles.routeStatText}>
              {route.completed_houses}/{route.houses.length} Houses
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const calculateAnalytics = (routes) => {
  // Filter routes within the selected date range
  const today = new Date();
  
  // Calculate completion rate only for routes scheduled within date range
  const scheduledRoutes = routes.filter(r => {
    const scheduleDate = new Date(r.date);
    return scheduleDate <= today;
  });
  
  const completedRoutes = routes.filter(route => route.status === 'completed');
  
  // Calculate total houses and completed houses
  const totalHouses = completedRoutes.reduce((sum, route) => sum + route.total_houses, 0);
  const completedHouses = completedRoutes.reduce((sum, route) => sum + route.completed_houses, 0);
  
  // Calculate special houses (skip or new customer)
  const specialHouses = completedRoutes.reduce((sum, route) => {
    const specialInRoute = route.houses?.filter(h => 
      h.status === 'skip' || h.status === 'new customer'
    ).length || 0;
    return sum + specialInRoute;
  }, 0);
  
  // Calculate total hours driven (from completed routes only)
  const totalHoursDriven = completedRoutes.reduce((sum, route) => 
    sum + (route.duration || 0), 0) / 60; // Convert minutes to hours
  
  // Calculate houses per hour
  const housesPerHour = totalHoursDriven > 0 ? 
    completedHouses / totalHoursDriven : 0;
  
  // Calculate average efficiency across all completed routes
  const avgEfficiency = completedRoutes.length > 0
    ? completedRoutes.reduce((sum, route) => {
        const durationHours = route.duration / 60;
        const completionRate = route.completed_houses / route.total_houses;
        const routeHousesPerHour = durationHours > 0 ? 
          route.completed_houses / durationHours : 0;
        const speedEfficiency = routeHousesPerHour / 60; // No cap
        const routeEfficiency = (0.6 * completionRate + 0.4 * speedEfficiency) * 100;
        return sum + routeEfficiency;
      }, 0) / completedRoutes.length
    : 0;
  
  // Calculate completion rate
  const completionRate = scheduledRoutes.length > 0
    ? (completedRoutes.length / scheduledRoutes.length) * 100
    : 0;
  
  // Calculate expired routes
  const expiredRoutes = scheduledRoutes.filter(r => 
    r.status !== 'completed' && new Date(r.date) < today
  ).length;

  return {
    totalHouses,
    completedHouses,
    specialHouses,
    efficiency: Number(avgEfficiency.toFixed(2)),
    completionRate: Number(completionRate.toFixed(2)),
    expiredRoutes,
    hoursDriven: Number(totalHoursDriven.toFixed(2)),
    housesPerHour: Number(housesPerHour.toFixed(2))
  };
};

const AnalyticsScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalHouses: 0,
    routesCompleted: 0,
    completionRate: 0,
    expiredRoutes: 0,
    specialHouses: 0,
    hoursDriven: 0,
    housesPerHour: 0,
    efficiency: 0,
  });
  const [topPerformers, setTopPerformers] = useState([]);
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  });

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) {
      selectedDate.setHours(0, 0, 0, 0);
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) {
      selectedDate.setHours(23, 59, 59, 999);
      setEndDate(selectedDate);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch routes within date range
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select(`
          *,
          houses (
            id,
            status,
            notes
          ),
          driver:profiles(
            id,
            full_name,
            role
          )
        `)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (routesError) throw routesError;

      // Calculate analytics
      const stats = calculateAnalytics(routes);
      setAnalytics(stats);
      
      // Set recent routes (only completed ones)
      const completedRoutes = routes.filter(r => r.status === 'completed');
      setRecentRoutes(completedRoutes.slice(0, 5));

      // Fetch top performers
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          avatar_url,
          routes(
            id,
            completed_houses,
            total_houses,
            duration,
            efficiency,
            date,
            status
          )
        `)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const performers = members
        .map(member => {
          const memberRoutes = member.routes?.filter(r => 
            r.status === 'completed' &&
            new Date(r.date) >= startDate && 
            new Date(r.date) <= endDate
          ) || [];

          return {
            ...member,
            completed_routes: memberRoutes.length,
            efficiency: memberRoutes.length > 0
              ? Number((memberRoutes.reduce((sum, r) => sum + (r.efficiency || 0), 0) / memberRoutes.length).toFixed(2))
              : 0
          };
        })
        .sort((a, b) => b.completed_routes - a.completed_routes)
        .slice(0, 3);

      setTopPerformers(performers);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
        <Text style={styles.title}>Analytics</Text>
      </BlurView>

      <View style={styles.datePickerContainer}>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowStartPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          <Text style={styles.dateButtonText}>
            {startDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <Text style={styles.dateSeperator}>to</Text>

        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowEndPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          <Text style={styles.dateButtonText}>
            {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={showStartPicker ? startDate : endDate}
          mode="date"
          display="default"
          onChange={showStartPicker ? onStartDateChange : onEndDateChange}
          maximumDate={new Date()}
        />
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="home-outline"
            title="Total Houses"
            value={analytics.totalHouses}
            color="#6B7280"
            showInfo
            infoText="Total number of houses across all routes"
          />
          <MetricCard
            icon="checkmark-circle-outline"
            title="Routes Completed"
            value={analytics.routesCompleted}
            color="#10B981"
          />
          <MetricCard
            icon="pie-chart-outline"
            title="Completion Rate"
            value={`${analytics.completionRate}%`}
            color="#3B82F6"
            showInfo
            infoText="Percentage of scheduled routes completed by their scheduled date"
          />
          <MetricCard
            icon="alert-circle-outline"
            title="Expired Routes"
            value={analytics.expiredRoutes}
            color="#EF4444"
            showInfo
            infoText="Routes not completed by their scheduled date"
          />
          <MetricCard
            icon="flag-outline"
            title="Special Houses"
            value={analytics.specialHouses}
            color="#8B5CF6"
            showInfo
            infoText="Houses that were skipped or marked as new customers"
          />
          <MetricCard
            icon="time-outline"
            title="Hours Driven"
            value={analytics.hoursDriven}
            color="#14B8A6"
            showInfo
            infoText="Total hours spent on routes"
          />
          <MetricCard
            icon="flash-outline"
            title="Houses/Hr"
            value={analytics.housesPerHour}
            color="#F59E0B"
            showInfo
            infoText="Average number of houses serviced per hour"
          />
          <MetricCard
            icon="trending-up-outline"
            title="Efficiency"
            value={`${analytics.efficiency}%`}
            color="#8B5CF6"
            showInfo
            infoText="Based on 60% completion rate and 40% speed (target: 60 houses/hour)"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
          </View>
          <View style={styles.performersGrid}>
            {topPerformers.map((member, index) => (
              <PerformerCard
                key={member.id}
                member={member}
                position={index + 1}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Routes</Text>
            {recentRoutes?.length === 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('completed-routes')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
          {recentRoutes.length > 0 ? (
            <View style={styles.routesGrid}>
              {recentRoutes.map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyStateText}>No completed routes yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  metricsGrid: {
    padding: 20,
    gap: 16,
  },
  metricCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  metricGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  performersGrid: {
    gap: 12,
  },
  performerCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  performerGradient: {
    padding: 16,
  },
  performerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  nameContainer: {
    flex: 1,
    gap: 4,
  },
  performerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routesGrid: {
    gap: 12,
  },
  routeCard: {
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 12,
  },
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeStatText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  dateButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  dateSeperator: {
    color: '#6B7280',
    marginHorizontal: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});

export default AnalyticsScreen; 