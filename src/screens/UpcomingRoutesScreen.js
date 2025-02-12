import React, { useState } from 'react';
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRoutes } from '../hooks/useRoutes';
import { useAuth } from '../contexts/AuthContext';

const FilterButton = ({ label, active, onPress }) => (
  <TouchableOpacity 
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const RouteCard = ({ route, router }) => {
  const { user } = useAuth();
  const isAssignedDriver = route.driver_id === user?.id;
  
  // Get yesterday's date at midnight
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const routeDate = new Date(route.date);
  routeDate.setHours(0, 0, 0, 0);
  
  const isExpired = routeDate < yesterday && route.status === 'pending';

  return (
    <View style={[
      styles.routeCard,
      isExpired && styles.expiredRouteCard
    ]}>
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
          {isExpired && (
            <View style={styles.expiredBadge}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const UpcomingRoutesScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { routes, loading, error } = useRoutes();
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'expired'

  const filteredRoutes = routes.filter(route => {
    const userRole = user?.user_metadata?.role;
    const isAssigned = userRole === 'admin' || route.driver_id === user?.id;
    const isPending = route.status === 'pending';
    
    // Get yesterday's date at midnight
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const routeDate = new Date(route.date);
    routeDate.setHours(0, 0, 0, 0);
    
    const isExpired = routeDate < yesterday && isPending;
    const isUpcoming = routeDate >= yesterday && isPending;

    if (!isAssigned) return false;
    
    switch (filter) {
      case 'upcoming':
        return isUpcoming;
      case 'expired':
        return isExpired;
      default:
        return isPending;
    }
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

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
        <Text style={styles.headerTitle}>Upcoming Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <View style={styles.filters}>
        <FilterButton 
          label="All" 
          active={filter === 'all'} 
          onPress={() => setFilter('all')} 
        />
        <FilterButton 
          label="Upcoming" 
          active={filter === 'upcoming'} 
          onPress={() => setFilter('upcoming')} 
        />
        <FilterButton 
          label="Expired" 
          active={filter === 'expired'} 
          onPress={() => setFilter('expired')} 
        />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map(route => (
            <RouteCard key={route.id} route={route} router={router} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>No routes found</Text>
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
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
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
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  expiredRouteCard: {
    borderColor: '#EF4444',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  currentDriverText: {
    color: '#10B981',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
  },
});

export default UpcomingRoutesScreen; 