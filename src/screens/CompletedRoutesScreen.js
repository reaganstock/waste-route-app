import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';

const RouteCard = ({ route, onPress, onReuseRoute }) => {
  const date = new Date(route.date);
  const completion = Math.round((route.completed_houses / route.houses.length) * 100);
  const specialHouses = route.houses.filter(h => h.status === 'skip' || h.notes).length;
  const duration = route.duration || '2.5'; // This would come from your backend
  const [isReuseLoading, setIsReuseLoading] = useState(false);

  return (
    <View style={styles.routeCardContainer}>
      <TouchableOpacity style={styles.routeCard} onPress={onPress}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
          style={styles.routeGradient}
        >
          <View style={styles.routeHeader}>
            <View>
              <Text style={styles.routeName}>{route.name}</Text>
              <Text style={styles.routeDate}>
                {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={[styles.completionBadge, { 
              backgroundColor: completion >= 90 ? 'rgba(16, 185, 129, 0.2)' : 
                           completion >= 70 ? 'rgba(245, 158, 11, 0.2)' : 
                           'rgba(239, 68, 68, 0.2)'
            }]}>
              <Text style={[styles.completionText, {
                color: completion >= 90 ? '#10B981' : 
                       completion >= 70 ? '#F59E0B' : 
                       '#EF4444'
              }]}>{completion}% Complete</Text>
            </View>
          </View>

          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Ionicons name="home" size={16} color="#3B82F6" />
              <Text style={styles.routeStatText}>
                {route.completed_houses}/{route.houses.length} Houses
              </Text>
            </View>
            {specialHouses > 0 && (
              <View style={styles.routeStat}>
                <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
                <Text style={styles.routeStatText}>
                  {specialHouses} Special
                </Text>
              </View>
            )}
            <View style={styles.routeStat}>
              <Ionicons name="time" size={16} color="#F59E0B" />
              <Text style={styles.routeStatText}>{duration} hrs</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${completion}%`,
                  backgroundColor: completion >= 90 ? '#10B981' : 
                               completion >= 70 ? '#F59E0B' : 
                               '#EF4444'
                }
              ]} 
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.reuseButton}
        onPress={() => {
          if (!isReuseLoading) {
            onReuseRoute(route);
          }
        }}
        disabled={isReuseLoading}
      >
        {isReuseLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="repeat" size={16} color="#fff" />
            <Text style={styles.reuseButtonText}>Reuse Route</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const CompletedRoutesScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, [startDate, endDate]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      
      // Get the user's team ID
      let teamId = null;
      if (user?.team_id) {
        teamId = user.team_id;
      } else if (user?.profile?.team_id) {
        teamId = user.profile.team_id;
      }
      
      // Format dates for query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Query completed routes in date range
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          houses:houses(*)
        `)
        .eq('status', 'completed')
        .eq('team_id', teamId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching routes:', error);
        Alert.alert('Error', 'Failed to load completed routes');
        return;
      }
      
      setRoutes(data || []);
    } catch (error) {
      console.error('Error in fetchRoutes:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReuseRoute = async (route) => {
    try {
      // Ask for confirmation
      Alert.alert(
        "Reuse Route",
        "Would you like to reuse this route for a future date?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Continue", 
            onPress: () => {
              // Navigate to route creation screen with pre-filled data from this route
              router.push({
                pathname: '/routes/create',
                params: { 
                  reusing: 'true',
                  route_id: route.id
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reusing route:', error);
      Alert.alert('Error', 'Failed to reuse route');
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

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

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routesList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          ) : routes.length > 0 ? (
            routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                onPress={() => router.push(`/route/${route.id}/details`)}
                onReuseRoute={handleReuseRoute}
              />
            ))
          ) : (
            <Text style={styles.noRoutesText}>
              No completed routes found in this date range
            </Text>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
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
  content: {
    flex: 1,
  },
  routesList: {
    padding: 20,
    gap: 16,
  },
  routeCardContainer: {
    marginBottom: 16,
  },
  routeCard: {
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  routeGradient: {
    padding: 20,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  completionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  noRoutesText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  reuseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -4,
  },
  reuseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
});

export default CompletedRoutesScreen; 
 
 
 