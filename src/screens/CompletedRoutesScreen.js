import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const RouteCard = ({ route }) => {
  const router = useRouter();
  const date = new Date(route.date);
  const efficiency = Math.round((route.completed_houses / route.total_houses) * 100);
  const specialHouses = route.houses?.filter(h => h.notes || h.status === 'new customer' || h.status === 'skip')?.length || 0;
  const duration = route.duration || '2.5';

  return (
    <TouchableOpacity 
      style={styles.routeCard} 
      onPress={() => router.push(`/route/${route.id}/details`)}
    >
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
          <View style={[styles.efficiencyBadge, { 
            backgroundColor: efficiency >= 90 ? 'rgba(16, 185, 129, 0.2)' : 
                           efficiency >= 70 ? 'rgba(245, 158, 11, 0.2)' : 
                           'rgba(239, 68, 68, 0.2)'
          }]}>
            <Text style={[styles.efficiencyText, {
              color: efficiency >= 90 ? '#10B981' : 
                     efficiency >= 70 ? '#F59E0B' : 
                     '#EF4444'
            }]}>{efficiency}% Efficient</Text>
          </View>
        </View>

        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Ionicons name="home" size={16} color="#3B82F6" />
            <Text style={styles.routeStatText}>
              {route.completed_houses}/{route.total_houses} Houses
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
                width: `${efficiency}%`,
                backgroundColor: efficiency >= 90 ? '#10B981' : 
                               efficiency >= 70 ? '#F59E0B' : 
                               '#EF4444'
              }
            ]} 
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const CompletedRoutesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState([]);
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
    fetchCompletedRoutes();
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

  const fetchCompletedRoutes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          houses (
            id,
            status,
            notes
          ),
          driver:profiles (
            id,
            full_name,
            role
          )
        `)
        .eq('status', 'completed')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching completed routes:', error);
      Alert.alert('Error', 'Failed to load completed routes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCompletedRoutes();
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
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed Routes</Text>
        <View style={styles.placeholder} />
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
        {routes.length > 0 ? (
          <View style={styles.routesGrid}>
            {routes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>No completed routes</Text>
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
  efficiencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  routesGrid: {
    padding: 20,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default CompletedRoutesScreen; 
 
 
 