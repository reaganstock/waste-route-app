import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { mockTeamMembers } from '../lib/mockData';

const TeamScreen = ({ navigation }) => {
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
    const completedRoutes = member.routes?.filter(r => r.status === 'completed').length || 0;
    
    return (
      <TouchableOpacity 
        style={styles.memberCard}
        onPress={() => navigation.navigate('MemberDetail', { memberId: member.id })}
      >
        <View style={styles.memberInfo}>
          <View style={[
            styles.avatarContainer,
            { backgroundColor: getAvatarColor(member.role) }
          ]}>
            <Text style={styles.avatarText}>
              {member.full_name?.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.full_name}</Text>
            <Text style={styles.memberRole}>{member.role}</Text>
            <Text style={styles.completedRoutes}>
              {completedRoutes} routes completed
            </Text>
          </View>
        </View>

        <View style={styles.memberStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: member.status === 'active' ? '#10B981' : '#6B7280' }
          ]} />
          <Text style={styles.statusText}>
            {activeRoute ? 'On Route' : 'Available'}
          </Text>
        </View>
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

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.header}>
        <Text style={styles.title}>Team Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMember')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  completedRoutes: {
    color: '#6B7280',
    fontSize: 12,
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});

export default TeamScreen; 