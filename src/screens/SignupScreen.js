import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/clerk-expo';

export default function SignupScreen() {
  console.log('SignupScreen rendered');
  
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'driver',
  });

  const handleSignup = async () => {
    console.log('Signup attempt started');
    
    if (!isLoaded) {
      Alert.alert('Error', 'Authentication is still loading');
      return;
    }

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Starting sign-up process...');
      
      // First sign out of any existing session to handle single session mode
      try {
        console.log('Signing out of any existing session before signup');
        await signOut();
      } catch (signOutError) {
        console.log('No active session to sign out from:', signOutError);
        // Continue with sign-up even if sign-out fails
      }
      
      // Start the sign-up process with Clerk
      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
      });

      console.log('Sign-up created, current status:', signUp.status);

      // Set the user's metadata
      // Note: We'll set the name and role as metadata only
      await signUp.update({
        unsafeMetadata: {
          fullName: formData.fullName,
          role: formData.role,
        },
      });

      console.log('Metadata updated, current status:', signUp.status);
      
      // Check if there are any missing requirements before proceeding
      if (signUp.status === 'missing_requirements') {
        console.log('Missing requirements detected:', signUp.missingFields);
        
        // Special handling for phone_number requirement
        if (signUp.missingFields && signUp.missingFields.includes('phone_number')) {
          console.log('Bypassing phone number requirement');
          
          // Proceed with email verification regardless of phone number requirement
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          
          // Navigate to verification screen
          router.push({
            pathname: '/(auth)/verify',
            params: { email: formData.email }
          });
        }
        // Handle missing fields if needed
        else if (signUp.missingFields && signUp.missingFields.includes('email_address')) {
          // If email verification is required, proceed with verification
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          
          // Navigate to verification screen
          router.push({
            pathname: '/(auth)/verify',
            params: { email: formData.email }
          });
        }
        // Handle case where missingFields is empty or undefined but status is still 'missing_requirements'
        else if (!signUp.missingFields || signUp.missingFields.length === 0) {
          console.log('Status is missing_requirements but no fields specified, proceeding with email verification');
          
          // Proceed with email verification
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          
          // Navigate to verification screen
          router.push({
            pathname: '/(auth)/verify',
            params: { email: formData.email }
          });
        }
        else {
          // For other missing fields, show an alert
          Alert.alert(
            'Additional Information Required',
            `Please provide: ${signUp.missingFields?.join(', ')}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // If no missing requirements, prepare verification and navigate
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        console.log('Verification prepared, navigating to verify screen');
        
        router.push({
          pathname: '/(auth)/verify',
          params: { email: formData.email }
        });
      }
      
      console.log('Signup successful, navigating to verify');
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle single session mode error specifically
      if (error.message?.includes('single session mode')) {
        Alert.alert(
          'Session Error', 
          'You already have an active session. Please try again, we will attempt to sign you out first.'
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to sign up');
      }
    } finally {
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
      </View>

      <View style={styles.logoContainer}>
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          style={styles.logo}
        >
          <Ionicons name="map" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>WasteRoute</Text>
        <Text style={styles.subtitle}>Create your account</Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#6B7280"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#6B7280"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry
          />
        </View>

        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Select Role</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'driver' && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: 'driver' })}
            >
              <Ionicons 
                name="car" 
                size={24} 
                color={formData.role === 'driver' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.role === 'driver' && styles.roleButtonTextActive,
              ]}>Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'admin' && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: 'admin' })}
            >
              <Ionicons 
                name="shield" 
                size={24} 
                color={formData.role === 'admin' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.role === 'admin' && styles.roleButtonTextActive,
              ]}>Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.signupButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
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
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
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
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#3B82F6',
    fontWeight: '600',
  },
}); 