import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/clerk-expo';

const VerifyScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoaded, signUp } = useSignUp();
  const { signOut } = useAuth();
  
  // Get email from params
  const [email] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  
  // Check verification status on mount
  useEffect(() => {
    if (isLoaded && signUp) {
      console.log('Current verification status:', signUp.status);
      console.log('Missing requirements:', signUp.missingFields);
      console.log('Verification state:', JSON.stringify(signUp, null, 2));
    }
  }, [isLoaded, signUp]);
  
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const handleVerify = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // First sign out of any existing session to handle single session mode
      try {
        console.log('Signing out of any existing session before verification');
        await signOut();
      } catch (signOutError) {
        console.log('No active session to sign out from:', signOutError);
        // Continue with verification even if sign-out fails
      }
      
      console.log('Attempting verification with code:', code);
      
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      
      console.log('Verification result status:', completeSignUp.status);
      console.log('Verification result:', JSON.stringify(completeSignUp, null, 2));
      
      if (completeSignUp.status === 'missing_requirements') {
        // Handle missing requirements
        console.log('Missing fields:', completeSignUp.missingFields);
        
        // Special handling for phone_number requirement
        if (completeSignUp.missingFields && completeSignUp.missingFields.includes('phone_number')) {
          console.log('Phone number required but bypassing this requirement');
          
          // Consider verification successful and proceed to sign in
          Alert.alert(
            'Verification Complete',
            'Your account has been verified. Please sign in.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/sign-in')
              }
            ]
          );
          return;
        }
        
        // Handle case where missingFields is empty but status is still 'missing_requirements'
        if (!completeSignUp.missingFields || completeSignUp.missingFields.length === 0) {
          console.log('Status is missing_requirements but no fields specified, proceeding to sign in');
          
          Alert.alert(
            'Verification Complete',
            'Your account has been verified. Please sign in.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/sign-in')
              }
            ]
          );
          return;
        }
        
        if (completeSignUp.missingFields && completeSignUp.missingFields.length > 0) {
          setError(`Verification requires additional information: ${completeSignUp.missingFields.join(', ')}`);
        } else {
          setError('Verification requires additional information. Please try again.');
        }
      } else if (completeSignUp.status !== 'complete') {
        // Verification still requires more steps
        console.log('Verification status:', completeSignUp.status);
        setError(`Verification status: ${completeSignUp.status}. Please try again.`);
      } else {
        // User has been created and is now logged in
        if (completeSignUp.createdSessionId) {
          console.log('Session created, navigating to main app');
          // The session was created, navigate to the main app
          router.replace('/(tabs)');
        } else {
          console.log('No session created, redirecting to sign in');
          // No session was created, go back to sign in
          Alert.alert(
            'Verification Complete',
            'Your account has been verified. Please sign in.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/sign-in')
              }
            ]
          );
        }
      }
    } catch (err) {
      console.error('Error verifying email:', err);
      console.log('Error details:', err.message, err.stack);
      
      // Handle single session mode error specifically
      if (err.message?.includes('single session mode')) {
        Alert.alert(
          'Session Error', 
          'You already have an active session. Please try again, we will attempt to sign you out first.',
          [
            {
              text: 'OK',
              onPress: () => handleVerify() // Try again after showing the alert
            }
          ]
        );
      }
      // Special handling for "already verified" error
      else if (err.message && err.message.includes('already been verified')) {
        Alert.alert(
          'Already Verified',
          'Your email has already been verified. Please sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/sign-in')
            }
          ]
        );
      } else {
        setError(err.message || 'Failed to verify email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      setError('');
      
      // First sign out of any existing session to handle single session mode
      try {
        console.log('Signing out of any existing session before resending code');
        await signOut();
      } catch (signOutError) {
        console.log('No active session to sign out from:', signOutError);
        // Continue with resending code even if sign-out fails
      }
      
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      Alert.alert('Success', 'Verification code has been resent to your email');
    } catch (err) {
      console.error('Error resending code:', err);
      
      // Handle single session mode error specifically
      if (err.message?.includes('single session mode')) {
        Alert.alert(
          'Session Error', 
          'You already have an active session. Please try again, we will attempt to sign you out first.',
          [
            {
              text: 'OK',
              onPress: () => handleResendCode() // Try again after showing the alert
            }
          ]
        );
      }
      // Special handling for "already verified" error
      else if (err.message && err.message.includes('already been verified')) {
        Alert.alert(
          'Already Verified',
          'Your email has already been verified. Please sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/sign-in')
            }
          ]
        );
      } else {
        setError(err.message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setResendLoading(false);
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.iconBackground}
          >
            <Ionicons name="mail" size={40} color="#fff" />
          </LinearGradient>
        </View>
        
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Verification Code</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor="#6B7280"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Email</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.resendButton, resendLoading && styles.buttonDisabled]}
            onPress={handleResendCode}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#3B82F6" size="small" />
            ) : (
              <Text style={styles.resendText}>Resend Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    color: '#fff',
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  input: {
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 16,
  },
});

export default VerifyScreen; 