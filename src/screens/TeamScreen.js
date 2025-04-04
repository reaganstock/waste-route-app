import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const TeamScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchTeamMembers = async () => {
    try {
      if (!user || !user.id) {
        console.error('No user found');
        setMembers([]);
        return;
      }

      // First, find the user's team ID - prioritize the user's own team_id
      let teamId = null;
      
      // Direct access from user object if available
      if (user.team_id) {
        teamId = user.team_id;
        console.log("Using team_id directly from user object:", teamId);
      } else if (user.profile?.team_id) {
        teamId = user.profile.team_id;
        console.log("Using team_id from user.profile:", teamId);
      } else {
        // If not available directly, try to find from team_members table
        const { data: userTeamMemberships, error: teamMembershipError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('profile_id', user.id);

        if (teamMembershipError) {
          console.error('Error fetching user team memberships:', teamMembershipError);
          setMembers([]);
          return;
        }

        if (!userTeamMemberships || userTeamMemberships.length === 0) {
          console.error('User is not a member of any team');
          setMembers([]);
          return;
        }

        // Use the first team_id found
        teamId = userTeamMemberships[0].team_id;
        console.log(`User belongs to ${userTeamMemberships.length} teams. Using team: ${teamId}`);
      }
      
      if (!teamId) {
        console.error('No team ID found for user');
        setMembers([]);
        return;
      }
      
      console.log("FETCHING MEMBERS FOR TEAM ID:", teamId);
      
      // Explicitly query by teamId to get ALL members in this team
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          profile_id,
          profiles:profile_id(
            id,
            full_name,
            email,
            role,
            status,
            avatar_url,
            hours_driven,
            routes:routes(
              id,
              status,
              completed_houses,
              total_houses
            )
          )
        `)
        .eq('team_id', teamId);

      if (error) {
        console.error('Error in team members query:', error);
        throw error;
      }
      
      // Detailed logging to debug team members
      console.log(`Raw team members data (${data?.length || 0} records):`, JSON.stringify(data, null, 2));
      
      // Reshape the data to get the profiles
      const teamProfiles = data
        .filter(item => item.profiles !== null)
        .map(item => item.profiles);
        
      console.log(`Found ${teamProfiles.length} team members for team ${teamId}`);
      console.log("Team profiles:", JSON.stringify(teamProfiles, null, 2));
      
      // Sort by role and name
      teamProfiles.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.full_name.localeCompare(b.full_name);
      });
      
      setMembers(teamProfiles);
    } catch (error) {
      console.error('Error fetching team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fixTeamMembers = async () => {
    try {
      if (!user || !user.id) {
        Alert.alert('Error', 'You must be logged in to fix team members.');
        return;
      }
      
      // Check if user is an owner
      const isOwner = user?.profile?.role === 'owner' || user?.user_metadata?.role === 'owner';
      
      if (!isOwner) {
        Alert.alert('Permission Denied', 'Only business owners can fix team members.');
        return;
      }
      
      // Find owner's team ID
      let ownerTeamId = null;
      
      if (user.team_id) {
        ownerTeamId = user.team_id;
      } else if (user.profile?.team_id) {
        ownerTeamId = user.profile.team_id;
      } else {
        // Look up the owner's team from the teams table
        const { data: ownedTeams, error: ownedTeamsError } = await supabase
          .from('teams')
          .select('id')
          .eq('owner_id', user.id);
          
        if (ownedTeamsError) {
          console.error('Error finding owned teams:', ownedTeamsError);
          Alert.alert('Error', 'Could not find your team. Please try again.');
          return;
        }
        
        if (!ownedTeams || ownedTeams.length === 0) {
          Alert.alert('No Team Found', 'You do not own any teams. Please create a team first.');
          return;
        }
        
        ownerTeamId = ownedTeams[0].id;
      }
      
      if (!ownerTeamId) {
        Alert.alert('Error', 'Could not determine your team ID. Please try again.');
        return;
      }
      
      console.log(`Using owner's team ID for fix: ${ownerTeamId}`);
      
      // Prompt user for confirmation
      Alert.alert(
        'Fix Team Members',
        'This will move all users in your database to your team. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: async () => {
              setLoading(true);
              
              // Update all driver profiles to have this team_id
              const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ team_id: ownerTeamId })
                .eq('role', 'driver');
                
              if (profileUpdateError) {
                console.error('Error updating profiles:', profileUpdateError);
                Alert.alert('Error', 'Failed to update profiles. Some users may not have been fixed.');
              }
              
              // Find all driver user IDs
              const { data: driverProfiles, error: driversError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'driver');
                
              if (driversError) {
                console.error('Error fetching drivers:', driversError);
              } else if (driverProfiles && driverProfiles.length > 0) {
                // For each driver, add or update team_members entry
                for (const driver of driverProfiles) {
                  // Check if entry exists
                  const { data: existingMembership } = await supabase
                    .from('team_members')
                    .select('id')
                    .eq('profile_id', driver.id)
                    .eq('team_id', ownerTeamId);
                    
                  if (!existingMembership || existingMembership.length === 0) {
                    // Create new team_members entry
                    await supabase
                      .from('team_members')
                      .insert({
                        team_id: ownerTeamId,
                        profile_id: driver.id
                      });
                  }
                }
              }
              
              // Refresh the team members list
              fetchTeamMembers();
              
              Alert.alert('Success', 'Team members have been fixed. They should now appear in your team.');
              setLoading(false);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error fixing team members:', error);
      Alert.alert('Error', 'Failed to fix team members. Please try again.');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Reset state when we refresh to prevent showing stale data
    setLoading(true);
    setMembers([]);
    fetchTeamMembers();
  }, [user?.team_id, user?.profile?.team_id]);

  React.useEffect(() => {
    const subscription = supabase
      .channel('team_members_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'team_members' 
      }, () => {
        // Refresh when team members change
        fetchTeamMembers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.team_id, user?.profile?.team_id]);

  const onRefresh = React.useCallback(() => {
    setLoading(true);
    fetchTeamMembers();
  }, []);

  const MemberCard = ({ member }) => {
    // Check if routes exists before trying to use it
    const routes = member.routes || [];
    const activeRoute = routes.find(r => r?.status === 'in_progress');
    const completedRoutes = routes.filter(r => r?.status === 'completed').length || 0;
    
    return (
      <TouchableOpacity 
        style={styles.memberCard}
        onPress={() => router.push(`/team/${member.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
          style={styles.memberGradient}
        >
          <View style={styles.memberHeader}>
            {member.avatar_url ? (
              <Image
                source={{ uri: member.avatar_url }}
                style={styles.avatarContainer}
              />
            ) : (
              <View style={[
                styles.avatarContainer,
                { backgroundColor: getAvatarColor(member.role) }
              ]}>
                <Text style={styles.avatarText}>
                  {member.full_name?.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
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
              <View style={styles.nameContainer}>
                <Text style={styles.memberName}>
                  {member.full_name}
                  {member.id === user?.id && (
                    <Text style={styles.currentUser}> (You)</Text>
                  )}
                </Text>
                {member.role === 'owner' && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                  </View>
                )}
                {member.role === 'admin' && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.memberRole}>{capitalizeFirstLetter(member.role || 'Member')}</Text>
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

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
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
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Team</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {members.length}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-team-member')}
          >
            <Ionicons name="person-add" size={22} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {members.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#3B82F6" />
            <Text style={styles.emptyStateTitle}>No Team Members</Text>
            <Text style={styles.emptyStateText}>
              Your team doesn't have any members yet. Add your first team member to get started.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/add-team-member')}
            >
              <Text style={styles.emptyStateButtonText}>Add Team Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#111827',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerBadge: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerBadgeText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentUser: {
    color: '#3B82F6',
    fontSize: 14,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    padding: 4,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TeamScreen; 