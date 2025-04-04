import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PropTypes from 'prop-types';

const { width } = Dimensions.get('window');

const RouteCard = ({ route, onPress }) => {
  const { user } = useAuth();
  const router = useRouter();
  const completionRate = Math.round((route.completed_houses / route.total_houses) * 100) || 0;
  const formattedDate = new Date(route.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  
  // Check if user is assigned to this route
  const isAssignedDriver = route.driver_id === user?.id;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'pending':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };
  
  // Handler for starting a route
  const handleStartRoute = async () => {
    try {
      if (!isAssignedDriver) {
        Alert.alert('Permission Denied', 'Only the assigned driver can start this route');
        return;
      }
      
      // Update route status
      const { error } = await supabase
        .from('routes')
        .update({ 
          status: 'in_progress'
          // Don't include start_time field since it might not exist
        })
        .eq('id', route.id);
        
      if (error) throw error;
      
      // Navigate to route screen
      router.push(`/route/${route.id}`);
    } catch (error) {
      console.error('Error starting route:', error);
      // Handle error more gracefully
      if (error.message && error.message.includes("start_time")) {
        Alert.alert('Error', 'Could not start route. Please contact support.');
      } else {
        Alert.alert('Error', 'Failed to start route: ' + error.message);
      }
    }
  };

  return (
    <View style={styles.routeCard}>
      <TouchableOpacity 
        style={styles.routeContent}
        onPress={onPress}
        activeOpacity={0.7}
        // Make completed routes not clickable
        disabled={route.status === 'completed'}
      >
        <LinearGradient
          colors={['rgba(31,41,55,0.8)', 'rgba(17,24,39,0.8)']}
          style={styles.routeCardGradient}
        >
          <View style={styles.routeHeader}>
            <Text style={styles.routeName}>{route.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(route.status)}20` }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(route.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(route.status) }
              ]}>
                {route.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.routeStats}>
            <View style={styles.statItem}>
              <Ionicons name="home" size={16} color="#9CA3AF" />
              <Text style={styles.statText}>
                {route.completed_houses}/{route.total_houses} houses
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#9CA3AF" />
              <Text style={styles.statText}>{route.duration || 0}h</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={16} color="#9CA3AF" />
              <Text style={styles.statText}>{completionRate}%</Text>
            </View>
          </View>

          <View style={styles.routeFooter}>
            <Text style={styles.routeDate}>{formattedDate}</Text>
            
            {/* Add Start button for pending routes */}
            {route.status === 'pending' && isAssignedDriver && (
              <TouchableOpacity 
                style={styles.startButton}
                onPress={handleStartRoute}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const FilterButton = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const AllRoutesScreen = ({ initialFilter }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set initial filter from params if provided
  useEffect(() => {
    if (params.filter && ['all', 'completed', 'in_progress', 'pending'].includes(params.filter)) {
      setFilter(params.filter);
    } else if (initialFilter && ['all', 'completed', 'in_progress', 'pending'].includes(initialFilter)) {
      setFilter(initialFilter);
    }
  }, [params.filter, initialFilter]);

  useEffect(() => {
    loadRoutes();
  }, [filter]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the user's team ID
      let teamId = null;
      if (user?.team_id) {
        teamId = user.team_id;
      } else if (user?.profile?.team_id) {
        teamId = user.profile.team_id;
      }
      
      if (!teamId) {
        console.error("No team ID found for current user");
        setRoutes([]);
        setLoading(false);
        return;
      }
      
      // Get user role
      const userRole = user?.user_metadata?.role || user?.profile?.role;
      const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
      
      console.log(`Fetching routes for team: ${teamId}, role: ${userRole}, filter: ${filter}`);
      
      // Start with a base query to fetch routes
      let query = supabase
        .from('routes')
        .select(`
          id,
          name,
          date,
          status,
          total_houses,
          completed_houses,
          duration,
          efficiency,
          driver_id,
          driver:driver_id(id, full_name)
        `)
        .eq('team_id', teamId); // Filter by team_id to ensure team-specific visibility
      
      // Apply filter if not 'all'
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      // Only fetch routes for this driver if not admin/owner
      if (!isOwnerOrAdmin) {
        query = query.eq('driver_id', user?.id);
      }
      
      // Sort by date, most recent first
      query = query.order('date', { ascending: false });
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      console.log(`Fetched ${data?.length || 0} routes`);
      setRoutes(data || []);
    } catch (err) {
      console.error('Error loading routes:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Error loading routes</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRoutes}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (routes.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No routes found</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/routes/create')}
          >
            <Text style={styles.createButtonText}>Create New Route</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.routesList}
        showsVerticalScrollIndicator={false}
      >
        {routes.map(route => (
          <RouteCard
            key={route.id}
            route={route}
            onPress={() => {
              // Different navigation behavior based on route status
              if (route.status === 'completed') {
                // No navigation for completed routes
                return;
              } else if (route.status === 'in_progress') {
                // In-progress routes go to the route screen
                router.push(`/route/${route.id}`);
              } else {
                // Pending routes go to edit screen
                router.push(`/route/${route.id}/edit`);
              }
            }}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.graySection}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Routes</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/routes/create')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <FilterButton
            label="All Routes"
            isActive={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            label="Completed"
            isActive={filter === 'completed'}
            onPress={() => setFilter('completed')}
          />
          <FilterButton
            label="In Progress"
            isActive={filter === 'in_progress'}
            onPress={() => setFilter('in_progress')}
          />
          <FilterButton
            label="Pending"
            isActive={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
        </ScrollView>
      </View>

      {renderContent()}
    </View>
  );
};

AllRoutesScreen.propTypes = {
  initialFilter: PropTypes.string
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  graySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(31,41,55,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  routesList: {
    padding: 20,
    gap: 16,
  },
  routeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  routeCardGradient: {
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  routeFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeDate: {
    color: '#6B7280',
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
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
  createButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeContent: {
    flex: 1,
  },
  startButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AllRoutesScreen; 