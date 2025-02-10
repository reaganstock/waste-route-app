import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { mockTeamMembers } from '../lib/mockData';
import { LinearGradient } from 'expo-linear-gradient';

const TeamScreen = () => {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeamMembers = () => {
    setMembers(mockTeamMembers);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamMembers();
    setRefreshing(false);
  };

  const MemberCard = ({ member }) => {
    const activeRoute = member.routes?.find(r => r.status === 'in_progress');
    const completedRoutes = member.completed_routes || 0;
    
    return (
      <TouchableOpacity 
        style={styles.memberCard}
        onPress={() => router.push(`/member/${member.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
          style={styles.memberGradient}
        >
          <View style={styles.memberHeader}>
            <View style={[
              styles.avatarContainer,
              { backgroundColor: getAvatarColor(member.role) }
            ]}>
              <Text style={styles.avatarText}>
                {member.full_name?.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: member.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: member.status === 'active' ? '#10B981' : '#6B7280' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: member.status === 'active' ? '#10B981' : '#6B7280' }
              ]}>
                {activeRoute ? 'On Route' : member.status === 'active' ? 'Available' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.memberInfo}>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{member.full_name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
            <View style={styles.memberStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                <Text style={styles.statValue}>{completedRoutes}</Text>
                <Text style={styles.statLabel}>Routes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color="#3B82F6" />
                <Text style={styles.statValue}>{member.hours_driven || 0}</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
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
        <Text style={styles.title}>Team</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-team-member')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {members.map(member => (
          <MemberCard key={member.id} member={member} />
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  memberCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberGradient: {
    padding: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberInfo: {
    gap: 16,
  },
  memberDetails: {
    gap: 4,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
});

export default TeamScreen; 