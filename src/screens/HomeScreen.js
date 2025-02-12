import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRoutes } from '../hooks/useRoutes';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
const RouteCard = ({ route, isActive, router }) => {
  const { user } = useAuth();
  const isAssignedDriver = route.driver_id === user?.id;

  const handleStartRoute = async () => {
    try {
      // Only allow the assigned driver to start/continue the route
      if (!isAssignedDriver) {
        Alert.alert('Permission Denied', 'Only the assigned driver can start this route');
        return;
      }

      const { error } = await supabase
        .from('routes')
        .update({ status: 'in_progress' })
        .eq('id', route.id);

      if (error) throw error;
      router.push(`/route/${route.id}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={[styles.routeCard, isActive && styles.activeRouteCard]}>
      <TouchableOpacity 
        style={styles.routeContent}
        onPress={() => router.push(`/route/${route.id}/edit`)}
      >
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.name}</Text>
          <View style={styles.routeMeta}>
            <Text style={styles.routeDate}>
              {new Date(route.date).toLocaleDateString()}
            </Text>
            {route.driver && (
              <>
                <Text style={styles.routeMetaDivider}>•</Text>
                <Text style={[
                  styles.routeDriver,
                  route.driver_id === user?.id && styles.currentDriverText
                ]}>
                  {route.driver.full_name}
                  {route.driver_id === user?.id && ' (You)'}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Ionicons name="home" size={16} color="#9CA3AF" />
            <Text style={styles.routeStatText}>{route.total_houses} houses</Text>
          </View>
          <View style={styles.routeProgress}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${(route.total_houses > 0 ? route.completed_houses / route.total_houses : 0) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Only show start/continue button to assigned driver */}
      {isAssignedDriver && (route.status === 'pending' || route.status === 'in_progress') && (
        <TouchableOpacity 
          style={[
            styles.startButton,
            route.status === 'in_progress' && styles.continueButton
          ]}
          onPress={handleStartRoute}
        >
          <Ionicons 
            name={route.status === 'in_progress' ? "arrow-forward" : "play"} 
            size={20} 
            color={route.status === 'in_progress' ? "#3B82F6" : "#10B981"} 
          />
          <Text style={[
            styles.startButtonText,
            route.status === 'in_progress' && styles.continueButtonText
          ]}>
            {route.status === 'in_progress' ? 'Continue' : 'Start'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { routes, loading, error, fetchRoutes } = useRoutes();
  const [refreshing, setRefreshing] = useState(false);

  // Filter routes based on user role and assignment
  const filteredRoutes = routes.filter(route => {
    const userRole = user?.user_metadata?.role;
    if (userRole === 'admin') {
      return true; // Admins can see all routes
    }
    // Drivers can only see routes assigned to them
    return route.driver_id === user?.id;
  });

  const activeRoute = filteredRoutes.find(r => r.status === 'in_progress');
  const pendingRoutes = filteredRoutes
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingRoutes = pendingRoutes.slice(0, 3);
  const completedRoutes = filteredRoutes.filter(r => r.status === 'completed');

  const stats = {
    todayHouses: activeRoute?.completed_houses || 0,
    completedRoutes: completedRoutes.length,
    efficiency: completedRoutes.length > 0
      ? Math.round(completedRoutes.reduce((acc, route) => acc + route.efficiency, 0) / completedRoutes.length)
      : 0
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error loading routes</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRoutes}>
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
        <Text style={styles.title}>Home</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Ionicons name="home" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.todayHouses}</Text>
            <Text style={styles.statLabel}>Today's Houses</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.completedRoutes}</Text>
            <Text style={styles.statLabel}>Routes Done</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Routes</Text>
              <TouchableOpacity 
                onPress={() => router.push('/active-routes')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <RouteCard route={activeRoute} isActive router={router} />
          </View>
        )}

        {/* Upcoming Routes */}
        {pendingRoutes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Routes</Text>
              <TouchableOpacity 
                onPress={() => router.push('/upcoming-routes')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            {upcomingRoutes.map(route => (
              <RouteCard key={route.id} route={route} router={router} />
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  routeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  routeContent: {
    padding: 16,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  routeMetaDivider: {
    color: '#6B7280',
    fontSize: 12,
  },
  routeDriver: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  routeStats: {
    gap: 8,
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
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    gap: 8,
  },
  startButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  activeRouteCard: {
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  continueButton: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  continueButtonText: {
    color: '#3B82F6',
  },
  currentDriverText: {
    color: '#10B981',
    fontWeight: '600',
  },
});

export default HomeScreen; 