import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { mockRoutes } from '../lib/mockData';

const { width } = Dimensions.get('window');

const RouteCard = ({ route, onPress }) => {
  const completionRate = Math.round((route.completed_houses / route.total_houses) * 100) || 0;
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
            <Text style={styles.statText}>{route.duration}h</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color="#9CA3AF" />
            <Text style={styles.statText}>{completionRate}%</Text>
          </View>
        </View>

        <View style={styles.routeFooter}>
          <Text style={styles.routeDate}>{formattedDate}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
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

const AllRoutesScreen = () => {
  const router = useRouter();
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRoutes();
  }, [filter]);

  const loadRoutes = () => {
    let filteredRoutes = [...mockRoutes];

    switch (filter) {
      case 'completed':
        filteredRoutes = filteredRoutes.filter(r => r.status === 'completed');
        break;
      case 'in_progress':
        filteredRoutes = filteredRoutes.filter(r => r.status === 'in_progress');
        break;
      case 'pending':
        filteredRoutes = filteredRoutes.filter(r => r.status === 'pending');
        break;
    }

    // Sort by date, most recent first
    filteredRoutes.sort((a, b) => new Date(b.date) - new Date(a.date));
    setRoutes(filteredRoutes);
  };

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

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.routesList}
        showsVerticalScrollIndicator={false}
      >
        {routes.map(route => (
          <RouteCard
            key={route.id}
            route={route}
            onPress={() => router.push(`/route/${route.id}`)}
          />
        ))}
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
    gap: 6,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  routeFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  routeDate: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default AllRoutesScreen; 