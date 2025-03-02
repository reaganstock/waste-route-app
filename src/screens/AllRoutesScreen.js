import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrentUser, useRoutes } from '../lib/convexHelpers';

const { width } = Dimensions.get('window');

const RouteCard = ({ route, onPress }) => {
  const completionRate = Math.round((route.completedHouses || 0) / (route.totalHouses || 1) * 100) || 0;
  const formattedDate = new Date(route.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

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

  return (
    <TouchableOpacity 
      style={styles.routeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['rgba(31,41,55,0.8)', 'rgba(17,24,39,0.8)']}
        style={styles.routeCardGradient}
      >
        <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{route.name}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(route.status) }
          ]}>
            <Text style={styles.statusText}>
              {route.status === 'in_progress' ? 'Active' : 
                route.status.charAt(0).toUpperCase() + route.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="home-outline" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>
              {route.completedHouses || 0}/{route.totalHouses || 0} houses
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${completionRate}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{completionRate}%</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const FilterButton = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.activeFilterButton]}
    onPress={onPress}
  >
    <Text style={[
      styles.filterButtonText,
      isActive && styles.activeFilterButtonText
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const AllRoutesScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const currentUser = useCurrentUser();
  const allRoutes = useRoutes(currentUser?.teamId);
  
  // Filter and sort routes based on the selected filter
  const filteredRoutes = useMemo(() => {
    if (!allRoutes) return [];
    
    let result = [...allRoutes];
    
    switch (filter) {
      case 'completed':
        result = result.filter(r => r.status === 'completed');
        break;
      case 'in_progress':
        result = result.filter(r => r.status === 'in_progress');
        break;
      case 'pending':
        result = result.filter(r => r.status === 'pending');
        break;
    }
    
    // Sort by date, most recent first
    return result.sort((a, b) => b.date - a.date);
  }, [allRoutes, filter]);

  if (!allRoutes) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
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
        <Text style={styles.headerTitle}>All Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <FilterButton 
            label="All" 
            isActive={filter === 'all'} 
            onPress={() => setFilter('all')}
          />
          <FilterButton 
            label="Pending" 
            isActive={filter === 'pending'} 
            onPress={() => setFilter('pending')}
          />
          <FilterButton 
            label="Active" 
            isActive={filter === 'in_progress'} 
            onPress={() => setFilter('in_progress')}
          />
          <FilterButton 
            label="Completed" 
            isActive={filter === 'completed'} 
            onPress={() => setFilter('completed')}
          />
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.routesList}
        contentContainerStyle={styles.routesContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map(route => (
            <RouteCard 
              key={route._id} 
              route={route} 
              onPress={() => router.push({
                pathname: '/(main)/route',
                params: { id: route._id }
              })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>No routes found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all' 
                ? 'Create a new route to get started' 
                : `No ${filter === 'in_progress' ? 'active' : filter} routes`}
            </Text>
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
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filtersScrollContent: {
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
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  routesList: {
    padding: 20,
    gap: 16,
  },
  routesContent: {
    padding: 20,
    gap: 16,
  },
  routeCard: {
    borderRadius: 16,
    overflow: 'hidden',
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AllRoutesScreen; 