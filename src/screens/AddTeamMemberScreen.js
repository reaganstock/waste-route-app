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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#6B7280"
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
    />
  </View>
);

const AddTeamMemberScreen = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'driver',
    password: '',
    confirmPassword: '',
  });

  const roles = [
    { id: 'driver', label: 'Driver' },
    { id: 'manager', label: 'Manager' },
    { id: 'admin', label: 'Admin' },
  ];

  const handleSubmit = () => {
    // Validate form data
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Here you would typically make an API call to create the team member
    Alert.alert(
      'Success',
      'Team member added successfully',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Team Member</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <InputField
          label="Full Name"
          value={formData.fullName}
          onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          placeholder="Enter full name"
        />

        <InputField
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Enter email address"
          keyboardType="email-address"
        />

        <InputField
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
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

        <InputField
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          placeholder="Enter password"
          secureTextEntry
        />

        <InputField
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          placeholder="Confirm password"
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Add Team Member</Text>
        </TouchableOpacity>
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
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTeamMemberScreen; 
 
 
 