import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mockTeamMembers, mockRoutes } from '../lib/mockData';

const RouteCard = ({ route, onSelect, isSelected }) => {
  const housesCompleted = route.completed_houses || 0;
  const totalHouses = route.houses?.length || 0;
  const progress = totalHouses > 0 ? (housesCompleted / totalHouses) * 100 : 0;

  return (
    <TouchableOpacity 
      style={[styles.routeCard, isSelected && styles.routeCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.routeInfo}>
        <Text style={styles.routeName}>{route.name}</Text>
        <Text style={styles.routeDate}>
          {new Date(route.date).toLocaleDateString()}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]} 
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

  useEffect(() => {
    const memberData = mockTeamMembers.find(m => m.id === memberId);
    if (memberData) {
      setMember(memberData);
    }

    // Filter routes that are pending and not assigned
    const pendingRoutes = mockRoutes.filter(route => 
      route.status === 'pending'
    );
    setAvailableRoutes(pendingRoutes);
  }, [memberId]);

  const handleAssign = () => {
    if (!selectedRoute) {
      Alert.alert('Error', 'Please select a route to assign');
      return;
    }

    // Here you would typically make an API call to assign the route
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
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Route</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
          <Text style={styles.avatarText}>
            {member.full_name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          <Text style={styles.memberRole}>{member.role}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Available Routes</Text>
        
        <ScrollView style={styles.routesList}>
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
            <Text style={styles.noRoutesText}>No available routes</Text>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={[
            styles.assignButton,
            !selectedRoute && styles.assignButtonDisabled
          ]}
          onPress={handleAssign}
          disabled={!selectedRoute}
        >
          <Text style={styles.assignButtonText}>Assign Route</Text>
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
  placeholder: {
    width: 40,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#374151',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  routesList: {
    flex: 1,
  },
  routeCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardSelected: {
    borderColor: '#3B82F6',
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
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  routeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  assignButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  assignButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noRoutesText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default AssignRouteScreen; 
 
 
 