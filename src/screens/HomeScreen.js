import React, { useState, useEffect } from 'react';
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
  Image,
  FlatList,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRoutes } from '../hooks/useRoutes';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ResponsiveLayout from '../components/ResponsiveLayout';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Stats Card Component
const StatsCard = ({ icon, title, value, color, showHouseIcon }) => (
  <View style={styles.statsCard}>
    <LinearGradient
      colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.6)']}
      style={styles.statsGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.statsIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statsValueContainer}>
        <Text style={styles.statsValue}>{value}</Text>
        {showHouseIcon && (
          <>
            <Ionicons name="home" size={16} color="#94A3B8" style={styles.statsValueIcon} />
            <Text style={styles.statsValueSuffix}>'s</Text>
          </>
        )}
      </View>
      <Text style={[
        styles.statsTitle, 
        title === "Today's" && styles.todayHousesTitle
      ]}>
        {title}
      </Text>
    </LinearGradient>
  </View>
);

// Action Button Component
const ActionButton = ({ icon, title, color, onPress }) => (
  <TouchableOpacity 
    style={styles.actionButton} 
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
  >
    <LinearGradient
      colors={[color + '20', color + '10']}
      style={styles.actionGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.actionTitle}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// Route Card Component with visual improvements
const RouteCard = ({ route, isActive, router }) => {
  const { user } = useAuth();
  const isAssignedDriver = route.driver_id === user?.id;
  const progressPercent = route.total_houses > 0 
    ? Math.round((route.completed_houses / route.total_houses) * 100) 
    : 0;
  
  // Get gradient colors based on route status
  const getCardColors = () => {
    if (isActive) return ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)'];
    if (route.status === 'completed') return ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'];
    return ['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.4)'];
  };
  
  // Format the date to show day of week and day/month
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      return date.toLocaleDateString(undefined, options);
    }
  };

  const handleStartRoute = async () => {
    try {
      // Only allow the assigned driver to start/continue the route
      if (!isAssignedDriver) {
        Alert.alert('Permission Denied', 'Only the assigned driver can start this route');
        return;
      }

      // If route is already in progress, just navigate to it
      if (route.status === 'in_progress') {
        router.push(`/route/${route.id}`);
        return;
      }

      // Otherwise, update the status to in_progress and then navigate
      const { error } = await supabase
        .from('routes')
        .update({ status: 'in_progress' })
        .eq('id', route.id);

      if (error) throw error;
      
      // Provide haptic feedback on successful start
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to the route screen
      router.push(`/route/${route.id}`);
    } catch (error) {
      console.error('Error starting route:', error);
      // Provide error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Could not start route. Please try again.');
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    let color, bgColor, label;
    
    switch(status) {
      case 'in_progress':
        color = '#3B82F6';
        bgColor = 'rgba(59, 130, 246, 0.15)';
        label = 'In Progress';
        break;
      case 'completed':
        color = '#10B981';
        bgColor = 'rgba(16, 185, 129, 0.15)';
        label = 'Completed';
        break;
      default:
        color = '#F59E0B';
        bgColor = 'rgba(245, 158, 11, 0.15)';
        label = 'Pending';
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={styles.routeCard}
      onPress={() => {
        // Navigate to the appropriate screen based on route status
        if (route.status === 'completed') {
          router.push(`/route/${route.id}/summary`);
        } else if (route.status === 'in_progress') {
          router.push(`/route/${route.id}`);
        } else {
          router.push(`/route/${route.id}/edit`);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={getCardColors()}
        style={styles.routeCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.routeHeader}>
          <View style={styles.routeHeaderLeft}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeDate}>{formatDate(route.date)}</Text>
          </View>
          
          <StatusBadge status={route.status} />
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.routeStat}>
            <Ionicons name="location-outline" size={16} color="#94A3B8" />
            <Text style={styles.routeStatText}>{route.total_houses || 0} Stops</Text>
          </View>
          
          <View style={styles.routeStat}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#94A3B8" />
            <Text style={styles.routeStatText}>
              {route.completed_houses || 0} Completed
            </Text>
          </View>
          
          {route.driver && (
            <View style={styles.routeStat}>
              <Ionicons name="person-outline" size={16} color="#94A3B8" />
              <Text style={[
                styles.routeStatText,
                isAssignedDriver && styles.highlightedText
              ]}>
                {route.driver_id === user?.id ? 'You' : route.driver.full_name}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.routeProgressContainer}>
          <View style={styles.routeProgressBar}>
            <View 
              style={[
                styles.routeProgressFill, 
                { 
                  width: `${progressPercent}%`,
                  backgroundColor: isActive ? '#3B82F6' : route.status === 'completed' ? '#10B981' : '#F59E0B' 
                }
              ]} 
            />
          </View>
          <Text style={styles.routeProgressText}>{progressPercent}%</Text>
        </View>
        
        {/* Only show start/continue button to assigned driver */}
        {isAssignedDriver && (route.status === 'pending' || route.status === 'in_progress') && (
          <TouchableOpacity 
            style={[
              styles.startButton,
              route.status === 'in_progress' ? styles.continueButton : styles.primaryButton
            ]}
            onPress={handleStartRoute}
          >
            <Ionicons 
              name={route.status === 'in_progress' ? "arrow-forward" : "play"} 
              size={18} 
              color="#FFFFFF" 
            />
            <Text style={styles.startButtonText}>
              {route.status === 'in_progress' ? 'Continue' : 'Start Route'}
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { routes, loading, error, fetchRoutes } = useRoutes();
  const [refreshing, setRefreshing] = useState(false);
  const [userGreeting, setUserGreeting] = useState('');
  
  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setUserGreeting('Good Morning');
    else if (hour >= 12 && hour < 18) setUserGreeting('Good Afternoon');
    else if (hour >= 18 && hour < 22) setUserGreeting('Good Evening');
    else setUserGreeting('Good Night');
  }, []);

  // Filter routes based on user role and assignment
  const filteredRoutes = routes.filter(route => {
    const userRole = user?.user_metadata?.role || user?.profile?.role;
    // Owners and admins can see all routes from their team
    if (userRole === 'admin' || userRole === 'owner') {
      return true; // Already filtered by team_id in useRoutes hook
    }
    // Drivers can only see routes assigned to them
    return route.driver_id === user?.id;
  });

  // Find active routes - owners/admins see all in-progress routes in their team
  const activeRoutes = filteredRoutes.filter(r => r.status === 'in_progress');
  
  // Get today's date at start of day for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pending routes sorted by date, but only show today's and future dates
  const pendingRoutes = filteredRoutes
    .filter(r => {
      // Filter by pending status
      if (r.status !== 'pending') return false;
      
      // Parse route date and set to start of day for comparison
      const routeDate = new Date(r.date);
      routeDate.setHours(0, 0, 0, 0);
      
      // Only include routes from today or future dates
      return routeDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  const upcomingRoutes = pendingRoutes.slice(0, 5);
  const completedRoutes = filteredRoutes
    .filter(r => r.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Most recent first
    .slice(0, 5); // Only show the 5 most recent

  // Calculate statistics
  const totalCompletedHouses = filteredRoutes.reduce((total, route) => {
    return total + (route.completed_houses || 0);
  }, 0);
  
  const todayRoutes = filteredRoutes.filter(route => {
    const routeDate = new Date(route.date);
    routeDate.setHours(0, 0, 0, 0);
    return routeDate.getTime() === today.getTime();
  });
  
  const todayTotalHouses = todayRoutes.reduce((total, route) => {
    return total + (route.total_houses || 0);
  }, 0);
  
  const stats = {
    todayHouses: todayTotalHouses,
    completedRoutes: completedRoutes.length,
    completion: completedRoutes.length > 0
      ? Math.round(completedRoutes.reduce((acc, route) => acc + (route.efficiency || 0), 0) / completedRoutes.length)
      : 0
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <Ionicons name="cloud-offline" size={48} color="#EF4444" style={styles.errorIcon} />
        <Text style={styles.errorText}>Could not load your routes</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRoutes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.user_metadata?.full_name || user?.profile?.full_name || 'Driver';
  const firstName = userName.split(' ')[0];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Header Section with User Info */}
        <View style={styles.headerContainer}>
          <View style={styles.greeting}>
            <Text style={styles.welcomeText}>{userGreeting},</Text>
            <Text style={styles.nameText}>{firstName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/settings')}
          >
            {user?.profile?.avatar_url ? (
              <Image 
                source={{ uri: user.profile.avatar_url }} 
                style={styles.profileAvatar} 
              />
            ) : (
              <View style={styles.profileInitials}>
                <Text style={styles.initialsText}>
                  {userName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <StatsCard 
            icon="today-outline" 
            title="Today" 
            value={stats.todayHouses} 
            color="#3B82F6"
            showHouseIcon={true}
          />
          <StatsCard 
            icon="checkmark-done-outline" 
            title="Routes Completed" 
            value={stats.completedRoutes} 
            color="#10B981" 
          />
          <StatsCard 
            icon="speedometer-outline" 
            title="Completion" 
            value={`${stats.completion}%`} 
            color="#F59E0B" 
          />
        </View>
        
        {/* Quick Actions Section */}
        <View style={styles.actionsContainer}>
          <ActionButton 
            icon="add-outline" 
            title="New Route" 
            color="#3B82F6" 
            onPress={() => router.push('/routes/create')} 
          />
          <ActionButton 
            icon="map-outline" 
            title="View Map" 
            color="#10B981" 
            onPress={() => router.push('/map')} 
          />
          <ActionButton 
            icon="list-outline" 
            title="All Routes" 
            color="#8B5CF6" 
            onPress={() => router.push('/all-routes')} 
          />
        </View>
        
        {/* Active Routes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="navigate-circle" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Active Routes</Text>
            </View>
            {activeRoutes.length > 1 && (
              <TouchableOpacity onPress={() => router.push('/all-routes?filter=in_progress')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {activeRoutes.length > 0 ? (
            activeRoutes.map(route => (
              <RouteCard 
                key={route.id} 
                route={route} 
                isActive={true}
                router={router} 
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="play-circle" size={40} color="#64748B" />
              <Text style={styles.emptyStateText}>No active routes</Text>
              {upcomingRoutes.length > 0 ? (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => {
                    if (upcomingRoutes.length > 0) {
                      router.push(`/route/${upcomingRoutes[0].id}`);
                    }
                  }}
                >
                  <Text style={styles.emptyStateButtonText}>Start Next Route</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/routes/create')}
                >
                  <Text style={styles.emptyStateButtonText}>Create Route</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Upcoming Routes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Upcoming Routes</Text>
            </View>
            {pendingRoutes.length > upcomingRoutes.length && (
              <TouchableOpacity onPress={() => router.push('/all-routes?filter=pending')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {upcomingRoutes.length > 0 ? (
            upcomingRoutes.map(route => (
              <RouteCard 
                key={route.id} 
                route={route}
                router={router} 
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar" size={40} color="#64748B" />
              <Text style={styles.emptyStateText}>No upcoming routes</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/routes/create')}
              >
                <Text style={styles.emptyStateButtonText}>Create Route</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    flexDirection: 'column',
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  profileAvatar: {
    height: 42,
    width: 42,
    borderRadius: 21,
  },
  profileInitials: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    height: 110,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statsGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  statsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsValueIcon: {
    marginLeft: 5,
  },
  statsValueSuffix: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -2,
  },
  statsTitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  todayHousesTitle: {
    fontSize: 11,
    lineHeight: 13,
    flexWrap: 'wrap',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    width: '30%',
    marginHorizontal: 4,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  routeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  routeCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  routeStatText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 6,
  },
  highlightedText: {
    color: '#3B82F6',
  },
  routeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  routeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  routeProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 40,
    textAlign: 'right',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default HomeScreen; 