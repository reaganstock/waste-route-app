import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import * as Clipboard from 'expo-clipboard';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', icon, required = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {label}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color="#6B7280" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  </View>
);

const AddTeamMemberScreen = () => {
  const router = useRouter();
  const { createTeamMember, fetchTeamMembers } = useTeamMembers();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'driver',
  });

  const roles = [
    { id: 'driver', label: 'Driver', icon: 'car-outline' },
    { id: 'admin', label: 'Admin', icon: 'shield-outline' },
  ];

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // First check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError) {
        console.error('Check Error:', checkError);
        throw new Error('Failed to check existing user');
      }

      if (existingUser) {
        Alert.alert('Error', 'A team member with this email already exists');
        return;
      }

      // Create user with admin API
      const initialPassword = Math.random().toString(36).slice(-12); // Store password to show later
      const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
          role: formData.role,
        },
      });

      if (signUpError) {
        throw new Error('Failed to create user account: ' + signUpError.message);
      }

      if (!data?.user) {
        throw new Error('No user data returned');
      }

      // Create the profile using admin client
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          status: 'active',
          start_date: new Date()
        });

      if (profileError) {
        console.error('Profile Error:', profileError);
        // If profile creation fails, we should delete the user
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw new Error('Failed to create team member profile: ' + profileError.message);
      }

      // Refresh the team members list
      await fetchTeamMembers();

      Alert.alert(
        'Team Member Added',
        `Team member has been created successfully.\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: ${initialPassword}\n\nPlease securely share these credentials with the team member.`,
        [
          {
            text: 'Copy Password',
            onPress: async () => {
              await Clipboard.setString(initialPassword);
              Alert.alert('Password Copied', 'The password has been copied to your clipboard.');
              router.back();
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding team member:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to add team member. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Add Team Member</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <InputField
            label="Full Name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Enter full name"
            icon="person-outline"
            required
          />

          <InputField
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email address"
            keyboardType="email-address"
            icon="mail-outline"
            required
          />

          <InputField
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            icon="call-outline"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleButtons}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleButton,
                    formData.role === role.id && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, role: role.id })}
                >
                  <Ionicons 
                    name={role.icon} 
                    size={24} 
                    color={formData.role === role.id ? '#fff' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === role.id && styles.roleButtonTextActive
                  ]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Send Invitation</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
    paddingRight: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 20,
    overflow: 'hidden',
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTeamMemberScreen; 
 
 
 
 