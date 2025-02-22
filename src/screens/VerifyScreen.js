import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const VerifyScreen = () => {
  const router = useRouter();
  const { type = 'signup', email: emailParam = '' } = useLocalSearchParams();
  const { verifyOTP, resetPassword, verificationEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [timer, setTimer] = useState(30);

  const isPasswordReset = type === 'reset';
  const email = emailParam || verificationEmail;

  useEffect(() => {
    if (!email && !isPasswordReset) {
      Alert.alert(
        'Error',
        'No email address provided for verification',
        [{ text: 'OK', onPress: () => router.replace('/(auth)') }]
      );
    }
  }, [email, isPasswordReset]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Error', 'No email address provided for verification');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    if (isPasswordReset && !newPassword) {
      Alert.alert('Error', 'Please enter your new password');
      return;
    }

    try {
      setLoading(true);

      if (isPasswordReset) {
        const { success, error } = await resetPassword(email, code, newPassword);
        if (success) {
          Alert.alert('Success', 'Password has been reset successfully', [
            { text: 'OK', onPress: () => router.replace('/(auth)') }
          ]);
        } else {
          Alert.alert('Error', error || 'Failed to reset password');
        }
      } else {
        const { success, error } = await verifyOTP(email, code);
        if (success) {
          Alert.alert('Success', 'Email verified successfully', [
            { text: 'OK', onPress: () => router.replace('/(auth)') }
          ]);
        } else {
          Alert.alert('Error', error || 'Invalid verification code');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPasswordReset ? 'Reset Password' : 'Verify Email'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {isPasswordReset ? 'Enter Reset Code' : 'Verify Your Email'}
        </Text>
        <Text style={styles.subtitle}>
          {isPasswordReset
            ? 'Enter the code we sent to reset your password'
            : 'Enter the verification code we sent to your email'}
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          {isPasswordReset && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.verifyButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {isPasswordReset ? 'Reset Password' : 'Verify Email'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend code in {timer} seconds
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                // Implement resend logic
                setTimer(30);
              }}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 8,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  resendButton: {
    marginTop: 16,
  },
  resendButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default VerifyScreen; 