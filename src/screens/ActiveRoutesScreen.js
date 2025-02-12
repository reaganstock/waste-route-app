import React from 'react';
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

// RouteCard Component (same as HomeScreen)
const RouteCard = ({ route, router }) => {
  const { user } = useAuth();
  const isAssignedDriver = route.driver_id === user?.id;

  const handleStartRoute = async () => {
    try {
      if (!isAssignedDriver) {
        Alert.alert('Permission Denied', 'Only the assigned driver can start this route');
        return;
      }

      router.push(`/route/${route.id}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.routeCard}>
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
      
      {isAssignedDriver && (
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleStartRoute}
        >
          <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const ActiveRoutesScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { routes, loading, error } = useRoutes();

  // Filter for active routes
  const activeRoutes = routes.filter(route => {
    const userRole = user?.user_metadata?.role;
    const isAssigned = userRole === 'admin' || route.driver_id === user?.id;
    return isAssigned && route.status === 'in_progress';
  });

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
        <Text style={styles.headerTitle}>Active Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeRoutes.length > 0 ? (
          activeRoutes.map(route => (
            <RouteCard key={route.id} route={route} router={router} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>No active routes</Text>
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
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3B82F6',
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
    padding: 8,
    gap: 8,
  },
  continueButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
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

export default ActiveRoutesScreen; 