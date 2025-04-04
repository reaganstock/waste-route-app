import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const AddTeamMemberScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [teamId, setTeamId] = useState(null);
  const [isLoadingTeamId, setIsLoadingTeamId] = useState(false);

  console.log("User data in AddTeamMemberScreen:", JSON.stringify(user, null, 2));

  const getTeamId = async () => {
    if (isLoadingTeamId) {
      console.log("getTeamId is already in progress, skipping duplicate call");
      return null;
    }
    setIsLoadingTeamId(true);
    console.log("getTeamId called - checking all possible team ID sources");
    try {
      if (user?.team_id) {
        console.log("Found team_id directly on user object:", user.team_id);
        return user.team_id;
      }
      if (user?.profile?.team_id) {
        console.log("Found team_id in user.profile:", user.profile.team_id);
        return user.profile.team_id;
      }
      console.log("User object team ID check:", {
        userHasTeamId: !!user?.team_id,
        profileHasTeamId: !!user?.profile?.team_id,
        userId: user?.id,
        role: user?.profile?.role || user?.user_metadata?.role
      });

      console.log("Checking if user owns any teams...");
      const { data: ownedTeams, error: ownedTeamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id);

      if (ownedTeamsError) {
        console.error("Error checking owned teams:", ownedTeamsError);
      } else if (ownedTeams && ownedTeams.length > 0) {
        console.log("User owns teams:", JSON.stringify(ownedTeams));
        return ownedTeams[0].id;
      }

      console.log("User doesn't own any teams, checking team_members table...");
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', user.id);

      if (membershipError) {
        console.error("Error fetching team memberships:", membershipError);
        return null;
      }

      if (memberships && memberships.length > 0) {
        console.log("Found team_id from team_members:", memberships[0].team_id);
        return memberships[0].team_id;
      }

      console.log("No team found for this user");
      return null;
    } catch (error) {
      console.error("Error in getTeamId:", error);
      return null;
    } finally {
      setIsLoadingTeamId(false);
    }
  };

  useEffect(() => {
    if (user && !teamId && !isLoadingTeamId) {
      const loadTeamId = async () => {
        const id = await getTeamId();
        if (id) {
          setTeamId(id);
          console.log("Loaded team ID:", id);
        } else {
          console.log("Failed to load team ID, setting teamId to null explicitly");
          setTeamId(null);
          Alert.alert("Team Not Found", "Could not determine your team ID. You must belong to a team to add members.");
        }
      };
      loadTeamId();
    }
  }, [user, teamId, isLoadingTeamId]);

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Team Member</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="key-outline" size={60} color="#EF4444" />
          <Text style={styles.permissionTitle}>Authentication Required</Text>
          <Text style={styles.permissionText}>
            You must be logged in to add team members. Please log in first.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/(auth)')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (user && !teamId && isLoadingTeamId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Checking team status...</Text>
      </View>
    );
  }

  if (user && !teamId && !isLoadingTeamId) {
    const createTeam = async () => {
      try {
        console.log("Creating a new team for user...");

        const isOwner = user?.profile?.role === 'owner' || user?.user_metadata?.role === 'owner';

        if (!isOwner) {
          Alert.alert("Permission Denied", "Only business owners can create teams. Please contact your team administrator.");
          return;
        }

        const teamName = `${user?.profile?.full_name || user?.user_metadata?.full_name || 'New User'}'s Team`;

        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({ name: teamName, owner_id: user.id })
          .select('id')
          .single();

        if (teamError) throw teamError;

        console.log("Team created with ID:", teamData.id);

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ team_id: teamData.id, role: 'owner' })
          .eq('id', user.id);

        if (profileError) console.error("Error updating profile:", profileError);

        const { error: memberError } = await supabase
          .from('team_members')
          .insert({ team_id: teamData.id, profile_id: user.id });

        if (memberError) console.error("Error adding user to team_members:", memberError);

        setTeamId(teamData.id);

        Alert.alert(
          "Team Created",
          "Your team has been created successfully! You can now add team members.",
          [{ text: "OK" }]
        );
      } catch (e) {
        console.error("Error in team creation:", e);
        Alert.alert("Error", `Failed to create team: ${e.message}`);
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Team Member</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="people-outline" size={60} color="#F59E0B" />
          <Text style={styles.permissionTitle}>No Team Found</Text>
          <Text style={styles.permissionText}>
            {user?.profile?.role === 'owner' || user?.user_metadata?.role === 'owner'
              ? "You don't have a team yet. As an owner, you need to create a team before adding members."
              : "You must be part of a team to add members. Please contact your team administrator."}
          </Text>

          {(user?.profile?.role === 'owner' || user?.user_metadata?.role === 'owner') && (
            <TouchableOpacity
              style={styles.createTeamButton}
              onPress={createTeam}
            >
              <Text style={styles.loginButtonText}>Create a Team</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.loginButton, { marginTop: 12, backgroundColor: '#374151' }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.loginButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const findAndAddMemberByEmail = async () => {
    console.log("*** findAndAddMemberByEmail function entered ***");
    if (!emailToAdd) {
      Alert.alert('Error', 'Please enter the email address of the user to add.');
      return;
    }
    if (!teamId) {
        Alert.alert('Error', 'Could not determine your team ID. Cannot add member.');
        return;
    }

    if (loading) {
      console.log("findAndAddMemberByEmail already running, skipping.");
      return;
    }

    console.log("Setting loading to true");
    setLoading(true);

    try {
      console.log(`Attempting to find user with email: ${emailToAdd}...`);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', emailToAdd.trim().toLowerCase())
        .single();

      if (profileError || !profileData) {
        console.error("Error finding profile:", profileError);
        Alert.alert('User Not Found', `No user found with the email address ${emailToAdd}. Please ensure they have registered an account.`);
        setLoading(false);
        return;
      }

      const profileIdToAdd = profileData.id;
      const profileNameToAdd = profileData.full_name;
      console.log(`Found user: ${profileNameToAdd} (ID: ${profileIdToAdd})`);

      console.log(`Checking if user ${profileIdToAdd} is already in team ${teamId}...`);
      const { data: existingMember, error: checkError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('profile_id', profileIdToAdd)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing membership:", checkError);
        Alert.alert('Error', 'Could not verify team membership. Please try again.');
        setLoading(false);
        return;
      }

      if (existingMember) {
        console.log("User is already a member of this team.");
        Alert.alert('Already Member', `${profileNameToAdd} is already a member of your team.`);
        setLoading(false);
        return;
      }

      console.log(`Adding user ${profileIdToAdd} to team_members table for team ${teamId}...`);
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          profile_id: profileIdToAdd,
          team_id: teamId
        });

      if (insertError) {
        console.error("TEAM MEMBER INSERT ERROR:", insertError);
        Alert.alert('Error', `Failed to add user to the team: ${insertError.message}.`);
        setLoading(false);
        return;
      }

      console.log("User added to team_members successfully.");

      console.log(`Updating profile ${profileIdToAdd} to set team_id to ${teamId}...`);
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', profileIdToAdd);

      if (profileUpdateError) {
        console.error("PROFILE UPDATE ERROR after adding member:", profileUpdateError);
        Alert.alert('Warning', `User added to team, but failed to update their primary team record: ${profileUpdateError.message}.`);
      } else {
        console.log(`Profile ${profileIdToAdd} updated successfully with team_id ${teamId}.`);
      }

      console.log("======= USER ADDED TO TEAM SUCCESSFULLY =======");

      setEmailToAdd('');

      Alert.alert(
        "Team Member Added!",
        `${profileNameToAdd} (${emailToAdd}) has been successfully added to your team.`,
        [
          {
            text: "OK",
            onPress: () => {
              console.log("Navigating back to team screen...");
              router.replace('/(tabs)/team');
            }
          }
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('GENERAL ERROR IN findAndAddMemberByEmail:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}. Please try again.`);
    } finally {
      console.log("Setting loading to false in finally block");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Existing Member</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.instructions}>
          Enter the email address of an existing user to add them to your team. They must have already registered an account.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="User's Email Address"
            placeholderTextColor="#6B7280"
            value={emailToAdd}
            onChangeText={(text) => setEmailToAdd(text.trim())}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={findAndAddMemberByEmail}
          disabled={loading || !teamId}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Add Member to Team</Text>
          )}
        </TouchableOpacity>
         {!teamId && !isLoadingTeamId && (
             <Text style={styles.errorText}>You must be part of a team to add members.</Text>
         )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    backgroundColor: '#111827',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  content: {
    flex: 1,
    padding: 20,
  },
  instructions: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  addButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#4B5563',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createTeamButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default AddTeamMemberScreen; 
 
 
 
 