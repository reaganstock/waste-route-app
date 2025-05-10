import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSignIn, useAuth } from '@clerk/clerk-expo';

const LoginScreen = () => {
  console.log('LoginScreen rendered');
  
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('Login attempt started');
    
    if (loading) return;
    
    if (!isLoaded) {
      Alert.alert('Error', 'Authentication is still loading');
      return;
    }
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting sign-in process for:', email);
      
      // First sign out of any existing session to handle single session mode
      try {
        console.log('Signing out of any existing session');
        await signOut();
      } catch (signOutError) {
        console.log('No active session to sign out from:', signOutError);
        // Continue with sign-in even if sign-out fails
      }
      
      // Start the sign-in process
      const result = await signIn.create({
        identifier: email,
        password,
      });
      
      console.log('Sign-in result status:', result.status);
      
      if (result.status === 'complete') {
        // Sign in was successful
        console.log('Sign-in complete, setting active session');
        await setActive({ session: result.createdSessionId });
        console.log('Session activated, redirecting to tabs');
        console.log('Login successful, navigating to home');
        router.replace('/(tabs)');
      } else if (result.status === 'needs_second_factor') {
        // Handle 2FA if implemented
        Alert.alert('Two-factor authentication', 'Please complete the second factor authentication');
      } else if (result.status === 'needs_identifier') {
        Alert.alert('Error', 'Please provide a valid email address');
      } else if (result.status === 'needs_password') {
        Alert.alert('Error', 'Please provide your password');
      } else {
        // The user needs to complete additional steps
        console.log('Sign in requires additional steps:', result);
        Alert.alert('Error', `Unable to sign in: ${result.status}`);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle single session mode error specifically
      if (error.message?.includes('single session mode')) {
        Alert.alert(
          'Session Error', 
          'You already have an active session. Please try again, we will attempt to sign you out first.'
        );
      }
      // Provide more specific error messages for other cases
      else if (error.message?.includes('password')) {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (error.message?.includes('identifier')) {
        Alert.alert('Error', 'Email not found. Please check your email or sign up.');
      } else {
        Alert.alert('Error', error.message || 'Failed to sign in');
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
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.logo}
          >
            <Ionicons name="map" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>WasteRoute</Text>
        </View>
        <Text style={styles.subtitle}>Route management made easy</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
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
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.loginButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signupButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.signupText}>
            Don't have an account? <Text style={styles.signupTextBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    flex: 1,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    alignItems: 'center',
  },
  signupText: {
    color: '#6B7280',
    fontSize: 14,
  },
  signupTextBold: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default LoginScreen; 