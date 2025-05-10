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
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  useCurrentUser,
  useRoutes,
  useUserRoutes,
  useUpdateRouteStatus,
  useTeam
} from '../lib/convexHelpers';

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
  const convexUser = useCurrentUser();
  const updateRouteStatus = useUpdateRouteStatus();
  
  // Check if current user is the assigned driver
  const isAssignedDriver = route.assignedTo === convexUser?._id;

  const handleStartRoute = async () => {
    try {
      // Only allow the assigned driver to start/continue the route
      if (!isAssignedDriver) {
        Alert.alert('Permission Denied', 'Only the assigned driver can start this route');
        return;
      }

      // Update route status if needed
      if (route.status === 'pending') {
        await updateRouteStatus({
          routeId: route._id,
          status: 'in_progress'
        });
      }

      // Navigate to route screen
      router.push({
        pathname: '/(main)/route',
        params: { id: route._id }
      });
    } catch (error) {
      console.error('Error starting route:', error);
      Alert.alert('Error', 'Failed to start route');
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
                  route.assignedTo === user?.id && styles.currentDriverText
                ]}>
                  {route.driver.full_name}
                  {route.assignedTo === user?.id && ' (You)'}
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
  const convexUser = useCurrentUser();
  const team = useTeam(convexUser?.teamId);
  
  // Get routes based on team or user ID
  const isAdmin = convexUser?.role === 'admin';
  const routes = isAdmin 
    ? useRoutes(convexUser?.teamId)
    : useUserRoutes(convexUser?._id);
  
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    todayHouses: 0,
    todayRoutes: 0,
    efficiency: 0,
    hoursDriven: 0
  });

  // Get completed routes for efficiency calculations
  const completedTeamRoutes = useQuery(api.routes.getCompletedTeamRoutes, 
    convexUser?.teamId ? { teamId: convexUser.teamId } : "skip");
  
  const completedUserRoutes = useQuery(api.routes.getCompletedUserRoutes, 
    convexUser?._id ? { userId: convexUser._id } : "skip");

  const calculateMetrics = () => {
    try {
      // Get today's date for filtering
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Filter routes to only include today's routes
      const todayRoutes = (routes || []).filter(route => {
        const routeDate = new Date(route.date);
        return routeDate >= startOfDay && route.status !== 'completed';
      });

      // For admin, show team metrics
      if (isAdmin) {
        // Calculate total houses and routes for today (excluding completed)
        const teamHouses = todayRoutes.reduce((sum, route) => sum + (route.totalHouses || 0), 0);
        const teamRoutes = todayRoutes.length;

        // Calculate team efficiency from all completed routes
        let teamEfficiency = 0;
        if (completedTeamRoutes?.length > 0) {
          const routeEfficiencies = completedTeamRoutes
            .filter(route => route.completedHouses && route.totalHouses && route.duration)
            .map(route => {
              const completionRate = route.completedHouses / route.totalHouses;
              const housesPerHour = (route.completedHouses / (route.duration / 60)) || 0;
              const speedEfficiency = Math.min(housesPerHour / 60, 1); // Cap at 100%
              return (0.6 * completionRate + 0.4 * speedEfficiency) * 100;
            });

          if (routeEfficiencies.length > 0) {
            teamEfficiency = Math.round(routeEfficiencies.reduce((sum, eff) => sum + eff, 0) / routeEfficiencies.length);
          }
        }

        setMetrics({
          todayHouses: teamHouses,
          todayRoutes: teamRoutes,
          efficiency: teamEfficiency,
          hoursDriven: 0
        });
      }
      // For drivers, show personal metrics
      else {
        // Filter routes for this driver (excluding completed)
        const driverRoutes = todayRoutes.filter(route => route.assignedTo === convexUser?._id);
        const driverHouses = driverRoutes.reduce((sum, route) => sum + (route.totalHouses || 0), 0);
        const driverRoutesCount = driverRoutes.length;

        // Calculate driver efficiency from all their completed routes
        let driverEfficiency = 0;
        if (completedUserRoutes?.length > 0) {
          const routeEfficiencies = completedUserRoutes
            .filter(route => route.completedHouses && route.totalHouses && route.duration)
            .map(route => {
              const completionRate = route.completedHouses / route.totalHouses;
              const housesPerHour = (route.completedHouses / (route.duration / 60)) || 0;
              const speedEfficiency = Math.min(housesPerHour / 60, 1); // Cap at 100%
              return (0.6 * completionRate + 0.4 * speedEfficiency) * 100;
            });

          if (routeEfficiencies.length > 0) {
            driverEfficiency = Math.round(routeEfficiencies.reduce((sum, eff) => sum + eff, 0) / routeEfficiencies.length);
          }
        }

        setMetrics({
          todayHouses: driverHouses,
          todayRoutes: driverRoutesCount,
          efficiency: driverEfficiency,
          hoursDriven: 0
        });
      }
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  // Update metrics whenever routes or completed routes change
  React.useEffect(() => {
    calculateMetrics();
  }, [routes, completedTeamRoutes, completedUserRoutes, convexUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    // With Convex, we don't need to manually refresh as it will automatically update
    // Just wait a bit to show the refresh indicator
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (!routes && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Filter active and upcoming routes
  const activeRoutes = routes.filter(r => r.status === 'in_progress');
  const upcomingRoutes = routes.filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Metrics Section */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
              <Ionicons name="home" size={24} color="#3B82F6" />
            <Text style={styles.metricValue}>{metrics.todayHouses}</Text>
            <Text style={styles.metricLabel}>Today's Houses</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="map" size={24} color="#10B981" />
            <Text style={styles.metricValue}>{metrics.todayRoutes}</Text>
            <Text style={styles.metricLabel}>Today's Routes</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color="#8B5CF6" />
            <Text style={styles.metricValue}>{metrics.efficiency}%</Text>
            <Text style={styles.metricLabel}>
              {user?.user_metadata?.role === 'admin' ? "Team's Efficiency" : "Your Efficiency"}
            </Text>
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

        {/* Active Routes Section */}
        {activeRoutes.length > 0 && (
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
            {activeRoutes.map(route => (
              <RouteCard key={route.id} route={route} isActive router={router} />
            ))}
          </View>
        )}

        {/* Upcoming Routes Section */}
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
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
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
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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