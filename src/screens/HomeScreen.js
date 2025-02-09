import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { mockRoutes } from '../lib/mockData';

const { width } = Dimensions.get('window');

// QuickAction Component
const QuickAction = ({ icon, title, color, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <LinearGradient
      colors={[color, color + '80']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.quickActionGradient}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// RouteCard Component
const RouteCard = ({ route, isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.routeCard, isActive && styles.activeRouteCard]}
    onPress={onPress}
  >
    <View style={styles.routeInfo}>
      <Text style={styles.routeName}>{route.name}</Text>
      <Text style={styles.routeDate}>
        {new Date(route.date).toLocaleDateString()}
      </Text>
    </View>
    <View style={styles.routeStats}>
      <View style={styles.routeStat}>
        <Ionicons name="home" size={16} color="#9CA3AF" />
        <Text style={styles.routeStatText}>{route.houses.length} houses</Text>
      </View>
      <View style={styles.routeProgress}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${(route.houses.length > 0 ? route.completed_houses / route.houses.length : 0) * 100}%` }
          ]} 
        />
      </View>
    </View>
  </TouchableOpacity>
);

const HomeScreen = () => {
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState(null);
  const [upcomingRoutes, setUpcomingRoutes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayHouses: 0,
    completedRoutes: 0,
    efficiency: 85
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    // Mock data loading
    const active = mockRoutes.find(r => r.status === 'in_progress');
    const upcoming = mockRoutes.filter(r => r.status === 'pending');
    
    setActiveRoute(active);
    setUpcomingRoutes(upcoming);
    setStats({
      todayHouses: 15,
      completedRoutes: 45,
      efficiency: 85
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Welcome back</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="home" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.todayHouses}</Text>
            <Text style={styles.statLabel}>Today's Houses</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.completedRoutes}</Text>
            <Text style={styles.statLabel}>Routes Done</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats.efficiency}%</Text>
            <Text style={styles.statLabel}>Efficiency</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="add-circle"
              title="Create Route"
              color="#3B82F6"
              onPress={() => router.push('/route-create')}
            />
            <QuickAction
              icon="map"
              title="View Map"
              color="#10B981"
              onPress={() => router.push('/map')}
            />
            <QuickAction
              icon="notifications"
              title="Updates"
              color="#F59E0B"
              onPress={() => router.push('/updates')}
            />
            <QuickAction
              icon="help-circle"
              title="Support"
              color="#EF4444"
              onPress={() => router.push('/support')}
            />
          </View>
        </View>

        {/* Active Route */}
        {activeRoute && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Route</Text>
            <RouteCard 
              route={activeRoute} 
              isActive 
              onPress={() => router.push(`/route/${activeRoute.id}`)}
            />
          </View>
        )}

        {/* Upcoming Routes */}
        {upcomingRoutes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Routes</Text>
              <TouchableOpacity onPress={() => router.push('/completed-routes')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingRoutes.map(route => (
              <RouteCard 
                key={route.id} 
                route={route} 
                onPress={() => router.push(`/route/${route.id}`)}
              />
            ))}
          </View>
        )}
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  quickActions: {
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    height: 100,
    justifyContent: 'space-between',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activeRouteCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  routeProgress: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  settingsButton: {
    padding: 8,
  },
});

export default HomeScreen; 