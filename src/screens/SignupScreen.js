import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import KeyboardAwareView from '../components/KeyboardAwareView';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [role, setRole] = useState('owner');
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignup = async () => {
    if (role === 'owner' && !formData.businessName) {
      Alert.alert('Error', 'Please enter your Business Name');
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

    setLoading(true);

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.businessName,
        role
      );
      
      // Store credentials for sharing
      setCredentials({
        email: formData.email,
        password: formData.password
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async () => {
    const text = `WasteRoute Login\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Credentials copied to clipboard');
  };
  
  const goToLogin = () => {
    router.replace('/(auth)');
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successMessage}>
            {role === 'owner'
              ? 'Your business account has been created successfully. You can now log in.'
              : 'Your account has been created successfully. Please ask your manager to add you to the team. You can log in once added.'}
          </Text>
          
          <View style={styles.credentialsContainer}>
            <Text style={styles.credentialsTitle}>Your Login Details</Text>
            <View style={styles.credentialsBox}>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Email:</Text>
                <Text style={styles.credentialValue}>{credentials.email}</Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Password:</Text>
                <Text style={styles.credentialValue}>{credentials.password}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={copyToClipboard}
            >
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={goToLogin}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareView 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
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

      <View style={styles.form}>
        {role === 'owner' && (
          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Business Name"
              placeholderTextColor="#6B7280"
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
            />
          </View>
        )}

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
            onChangeText={(text) => setFormData({ ...formData, email: text.trim() })}
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
          <Text style={styles.roleLabel}>I am:</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                role === 'owner' && styles.roleButtonActive
              ]}
              onPress={() => setRole('owner')}
            >
              <Text 
                style={[
                  styles.roleButtonText,
                  role === 'owner' && styles.roleButtonTextActive
                ]}
              >
                Business Owner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                role === 'driver' && styles.roleButtonActive
              ]}
              onPress={() => setRole('driver')}
            >
              <Text 
                style={[
                  styles.roleButtonText,
                  role === 'driver' && styles.roleButtonTextActive
                ]}
              >
                Driver
              </Text>
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
          style={styles.loginLinkButton}
          onPress={() => router.replace('/(auth)')}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkTextBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareView>
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
  signupButton: {
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonGradient: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLinkButton: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLinkTextBold: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  credentialsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  credentialsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  credentialsBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  credentialRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  credentialLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    width: 90,
  },
  credentialValue: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Add Role Selector Styles ---
  roleLabel: {
      fontSize: 14,
      color: '#9CA3AF',
      marginBottom: 8,
      marginLeft: 4, // Align with inputs slightly
  },
  roleSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  roleButtonSelected: {
    backgroundColor: '#3B82F6', // Highlight selected
    borderColor: '#3B82F6',
  },
  roleIcon: {
      marginRight: 8,
  },
  roleButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtonTextSelected: {
      color: '#fff',
  },
  // --- End Role Selector Styles ---
  roleContainer: {
    marginBottom: 20,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
}); 