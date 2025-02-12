import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const RouteCard = ({ route, onSelect, isSelected }) => {
  const housesCompleted = route.completed_houses || 0;
  const totalHouses = route.total_houses || 0;
  const progress = totalHouses > 0 ? (housesCompleted / totalHouses) * 100 : 0;

  return (
    <TouchableOpacity 
      style={[styles.routeCard, isSelected && styles.routeCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.routeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeDate}>
            {new Date(route.date).toLocaleDateString()}
          </Text>
          {route.driver && (
            <View style={styles.driverBadge}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                style={styles.driverBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person-outline" size={14} color="#3B82F6" />
                <Text style={styles.driverText}>
                  Assigned to {route.driver.full_name}
                </Text>
              </LinearGradient>
            </View>
          )}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={[styles.progressFill, { width: `${progress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>
              {housesCompleted}/{totalHouses} houses
            </Text>
          </View>
        </View>
        <View style={styles.routeStatus}>
          <View style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(route.status) }
          ]} />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(route.status) }
          ]}>
            {formatStatus(route.status)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return '#10B981';
    case 'in_progress':
      return '#3B82F6';
    case 'pending':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
};

const formatStatus = (status) => {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const AssignRouteScreen = ({ memberId }) => {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch member data
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch upcoming routes (pending and future dated)
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles(id, full_name)
        `)
        .eq('status', 'pending')
        .gte('date', today.toISOString())
        .order('date', { ascending: true });

      if (routesError) throw routesError;
      setAvailableRoutes(routesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoute) {
      Alert.alert('Error', 'Please select a route to assign');
      return;
    }

    try {
      setLoading(true);
      
      // Create a new route with the same details but assigned to this driver
      const { data: newRoute, error: createError } = await supabase
        .from('routes')
        .insert({
          name: selectedRoute.name,
          date: selectedRoute.date,
          driver_id: memberId,
          status: 'pending',
          total_houses: selectedRoute.total_houses,
          completed_houses: 0,
          duration: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy all houses from the original route to the new route
      const { data: houses, error: housesError } = await supabase
        .from('houses')
        .select('*')
        .eq('route_id', selectedRoute.id);

      if (housesError) throw housesError;

      if (houses && houses.length > 0) {
        const newHouses = houses.map(house => ({
          ...house,
          id: undefined, // Let Supabase generate new IDs
          route_id: newRoute.id,
          status: 'pending'
        }));

        const { error: insertError } = await supabase
          .from('houses')
          .insert(newHouses);

        if (insertError) throw insertError;
      }

      Alert.alert(
        'Success',
        'Route assigned successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error assigning route:', error);
      Alert.alert('Error', 'Failed to assign route');
    } finally {
      setLoading(false);
    }
  };

  if (!member) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Member not found</Text>
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
        <Text style={styles.headerTitle}>Assign Route</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <View style={styles.memberInfo}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
          style={styles.memberInfoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
            <Text style={styles.avatarText}>
              {member.full_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.full_name}</Text>
            <Text style={styles.memberRole}>{member.role}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Available Routes</Text>
        
        <ScrollView 
          style={styles.routesList}
          showsVerticalScrollIndicator={false}
        >
          {availableRoutes.length > 0 ? (
            availableRoutes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                onSelect={() => setSelectedRoute(route)}
                isSelected={selectedRoute?.id === route.id}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#6B7280" />
              <Text style={styles.noRoutesText}>No available routes</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={[
            styles.assignButton,
            !selectedRoute && styles.assignButtonDisabled
          ]}
          onPress={handleAssign}
          disabled={!selectedRoute || loading}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.assignButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.assignButtonText}>Assign Route</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push(`/route/create?driver=${memberId}`)}
        >
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
            <Text style={styles.createButtonText}>Create New Route</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getAvatarColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '#3B82F6';
    case 'driver':
      return '#10B981';
    case 'manager':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  memberInfo: {
    padding: 16,
  },
  memberInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberDetails: {
    marginLeft: 16,
  },
  memberName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  routesList: {
    flex: 1,
  },
  routeCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardSelected: {
    borderColor: '#3B82F6',
  },
  routeGradient: {
    padding: 16,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  driverBadge: {
    marginBottom: 12,
  },
  driverBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  driverText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  routeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assignButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  assignButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRoutesText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  createButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AssignRouteScreen; 
 
 
 
 
 
 