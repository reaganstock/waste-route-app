import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';

const StatCard = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={24} color="#3B82F6" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TeamMemberDetailsScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemberDetails();
  }, [id]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch member profile
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select(`
          *,
          routes:routes(
            id,
            name,
            date,
            status,
            completed_houses,
            total_houses
          )
        `)
        .eq('id', id)
        .single();

      if (memberError) throw memberError;

      // Calculate stats
      const completedRoutes = memberData.routes?.filter(r => r.status === 'completed') || [];
      const completedRoutesCount = completedRoutes.length || 0;
      
      // Calculate total houses serviced (completed houses)
      const housesServiced = completedRoutes.reduce((sum, route) => sum + (route.completed_houses || 0), 0) || 0;
      
      // Calculate total houses in all completed routes
      const totalHousesInCompletedRoutes = completedRoutes.reduce((sum, route) => sum + (route.total_houses || 0), 0) || 0;
      
      // Calculate stops per route (total houses / number of routes) for consistency with PerformanceScreen
      const stopsPerRoute = completedRoutesCount > 0 ? Math.round(totalHousesInCompletedRoutes / completedRoutesCount) : 0;
      
      setMember({
        ...memberData,
        completed_routes: completedRoutesCount,
        houses_serviced: housesServiced,
        stops_per_route: stopsPerRoute
      });
    } catch (error) {
      console.error('Error fetching member details:', error);
      setError(error.message);
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

  if (error || !member) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error || 'Member not found'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchMemberDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeRoute = member.routes?.find(r => r.status === 'in_progress');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Member</Text>
        {member.role === 'driver' && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push(`/team/edit/${member.id}`)}
          >
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        )}
        {member.role !== 'driver' && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          {member.avatar_url ? (
            <Image
              source={{ uri: member.avatar_url }}
              style={styles.avatarLarge}
            />
          ) : (
            <View style={[styles.avatarLarge, { backgroundColor: getAvatarColor(member.role) }]}>
              <Text style={styles.avatarTextLarge}>
                {member.full_name?.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <Text style={styles.memberName}>{member.full_name}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>{member.role}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: member.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)'
          }]}>
            <View style={[styles.statusDot, { 
              backgroundColor: member.status === 'active' ? '#10B981' : '#6B7280'
            }]} />
            <Text style={[styles.statusText, { 
              color: member.status === 'active' ? '#10B981' : '#6B7280'
            }]}>
              {activeRoute ? 'On Route' : member.status === 'active' ? 'Available' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            label="Houses Serviced"
            value={member.houses_serviced || 0}
            icon="home-outline"
          />
          <StatCard 
            label="Stops Per Route"
            value={member.stops_per_route || 0}
            icon="location-outline"
          />
          <StatCard 
            label="Routes Completed"
            value={member.completed_routes || 0}
            icon="checkmark-circle-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Route</Text>
          {activeRoute ? (
            <View style={styles.routeCard}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{activeRoute.name}</Text>
                <Text style={styles.routeDate}>
                  Started {new Date(activeRoute.date).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewRouteButton}
                onPress={() => router.push(`/route/${activeRoute.id}`)}
              >
                <Text style={styles.viewRouteText}>View Route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noRouteText}>No active route</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/route/create?driver_id=${member.id}`)}
          >
            <Ionicons name="map-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Assign New Route</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push(`/performance/${member.id}`)}
          >
            <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
            <Text style={styles.actionButtonTextSecondary}>View Performance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#1F2937',
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleContainer: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  routeCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  viewRouteButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRouteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noRouteText: {
    color: '#6B7280',
    fontSize: 16,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  actionButtonTextSecondary: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});

export default TeamMemberDetailsScreen; 
 
 
 