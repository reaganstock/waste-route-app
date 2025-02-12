import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const StatCard = ({ label, value, icon }) => (
  <LinearGradient
    colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
    style={styles.statCard}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={24} color="#3B82F6" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </LinearGradient>
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

      // Fetch member details and all their routes
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select(`
          *,
          routes(
            id,
            name,
            status,
            completed_houses,
            total_houses,
            duration,
            date
          )
        `)
        .eq('id', id)
        .single();

      if (memberError) throw memberError;

      // Calculate metrics from completed routes only
      const completedRoutes = memberData.routes?.filter(r => r.status === 'completed') || [];
      const totalHousesServiced = completedRoutes.reduce((sum, route) => sum + (route.completed_houses || 0), 0);
      const totalHoursDriven = completedRoutes.reduce((sum, route) => sum + (route.duration || 0), 0);
      const completedRoutesCount = completedRoutes.length;

      // Find active route if exists
      const activeRoute = memberData.routes?.find(r => r.status === 'in_progress');

      setMember({
        ...memberData,
        metrics: {
          totalHousesServiced,
          completedRoutes: completedRoutesCount,
          totalHoursDriven: Number((totalHoursDriven / 60).toFixed(2))  // Convert minutes to hours
        },
        activeRoute
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

  if (!member) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Member not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Team Member</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push(`/team/edit/${member.id}`)}
          >
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </BlurView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
          style={styles.profileSection}
        >
          {member.avatar_url ? (
            <Image
              source={{ uri: member.avatar_url }}
              style={styles.avatarLarge}
            />
          ) : (
            <LinearGradient
              colors={[getAvatarColor(member.role), `${getAvatarColor(member.role)}80`]}
              style={styles.avatarLarge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarTextLarge}>
                {member.full_name?.split(' ').map(n => n[0]).join('')}
              </Text>
            </LinearGradient>
          )}
          <Text style={styles.memberName}>{member.full_name}</Text>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
            style={styles.roleContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.roleText}>{member.role}</Text>
          </LinearGradient>
          <LinearGradient
            colors={[
              member.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
              member.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)'
            ]}
            style={styles.statusBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.statusDot, { 
              backgroundColor: member.status === 'active' ? '#10B981' : '#6B7280'
            }]} />
            <Text style={[styles.statusText, { 
              color: member.status === 'active' ? '#10B981' : '#6B7280'
            }]}>
              {member.activeRoute ? 'On Route' : member.status === 'active' ? 'Available' : 'Inactive'}
            </Text>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard 
            label="Total Houses"
            value={member.metrics.totalHousesServiced}
            icon="home-outline"
          />
          <StatCard 
            label="Hours Driven"
            value={member.metrics.totalHoursDriven.toFixed(1)}
            icon="time-outline"
          />
          <StatCard 
            label="Routes Completed"
            value={member.metrics.completedRoutes}
            icon="checkmark-circle-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Route</Text>
          {member.activeRoute ? (
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
              style={styles.routeCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{member.activeRoute.name}</Text>
                <Text style={styles.routeDate}>
                  Started {new Date(member.activeRoute.date).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewRouteButton}
                onPress={() => router.push(`/route/${member.activeRoute.id}`)}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.viewRouteButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.viewRouteText}>View Route</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <Text style={styles.noRouteText}>No active route</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/team/${member.id}/assign-route`)}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="map-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Assign New Route</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push(`/performance/${member.id}`)}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
              <Text style={styles.actionButtonTextSecondary}>View Performance</Text>
            </LinearGradient>
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
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    margin: 16,
    borderRadius: 16,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  roleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  roleText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  routeCard: {
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  viewRouteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewRouteButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewRouteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noRouteText: {
    color: '#6B7280',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  actionButton: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  actionButtonTextSecondary: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TeamMemberDetailsScreen; 
 
 
 