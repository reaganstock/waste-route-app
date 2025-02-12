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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';

const RouteCard = ({ route }) => {
  const router = useRouter();
  const efficiency = Math.round((route.completed_houses / route.total_houses) * 100);
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

        <View style={styles.routeMeta}>
          <Text style={styles.routeDate}>
            {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {route.driver && (
            <View style={styles.driverInfo}>
              <View style={[styles.driverAvatar, { backgroundColor: getDriverColor(route.driver.role) }]}>
                <Text style={styles.driverInitials}>
                  {route.driver.full_name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <Text style={styles.driverName}>{route.driver.full_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Ionicons name="home" size={16} color="#3B82F6" />
            <Text style={styles.routeStatText}>
              {route.completed_houses}/{route.total_houses} Houses
            </Text>
          </View>
          <View style={styles.routeStat}>
            <Ionicons name="time" size={16} color="#3B82F6" />
            <Text style={styles.routeStatText}>
              {route.duration || 0} Hours
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getDriverColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '#3B82F6';
    case 'driver':
      return '#10B981';
    default:
      return '#6B7280';
  }
};

const CompletedRoutesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    fetchCompletedRoutes();
  }, []);

  const fetchCompletedRoutes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles (
            id,
            full_name,
            role
          )
        `)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching completed routes:', error);
      Alert.alert('Error', 'Failed to load completed routes');
    } finally {
      setLoading(false);
    }
  };

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

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  routesGrid: {
    padding: 16,
    gap: 16,
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
    marginBottom: 12,
  },
  routeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  routeMeta: {
    marginBottom: 12,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  driverName: {
    color: '#6B7280',
    fontSize: 14,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
  },
});

export default CompletedRoutesScreen; 
 
 
 