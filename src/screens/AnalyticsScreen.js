import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockRoutes, mockTeamMembers } from '../lib/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';

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
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
            <Text style={styles.avatarText}>
              {member.full_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
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

const AnalyticsScreen = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRoutes: 0,
    completionRate: 0,
    efficiency: 0,
    specialHouses: 0,
    topPerformers: []
  });
  const [recentRoutes, setRecentRoutes] = useState([]);

  const router = useRouter();

  useEffect(() => {
    calculateAnalytics();
  }, [startDate, endDate]);

  useEffect(() => {
    // Filter completed routes and sort by date
    const completed = mockRoutes
      .filter(route => route.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3); // Get only the 3 most recent
    setRecentRoutes(completed);
  }, []);

  const calculateAnalytics = () => {
    // Mock analytics calculation
    const sortedMembers = [...mockTeamMembers].sort((a, b) => 
      (b.completed_routes || 0) - (a.completed_routes || 0)
    );

    setAnalytics({
      totalRoutes: 156,
      completionRate: 92,
      efficiency: 88,
      specialHouses: 45,
      topPerformers: sortedMembers.slice(0, 3)
    });
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </BlurView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateText}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>to</Text>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateText}>
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="checkmark-circle"
            title="Routes Completed"
            value={analytics.totalRoutes}
            color="#3B82F6"
            trend={12}
          />
          <MetricCard
            icon="trending-up"
            title="Completion Rate"
            value={`${analytics.completionRate}%`}
            color="#10B981"
            trend={5}
          />
          <MetricCard
            icon="flash"
            title="Efficiency"
            value={`${analytics.efficiency}%`}
            color="#F59E0B"
            trend={-3}
          />
          <MetricCard
            icon="alert-circle"
            title="Special Houses"
            value={analytics.specialHouses}
            color="#8B5CF6"
            showInfo
            infoText="Houses marked as Skip, New Customer, or with Special Instructions"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performers</Text>
          <View style={styles.performersContainer}>
            {analytics.topPerformers.map((member, index) => (
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
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/route/completed')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.routesContainer}>
            {recentRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
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
  performersContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  performerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
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
  routesContainer: {
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
});

export default AnalyticsScreen; 