import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import KeyboardAwareView from '../components/KeyboardAwareView';

const StepDot = ({ active, completed }) => (
  <View
    style={[
      styles.stepDot,
      active && styles.stepDotActive,
      completed && styles.stepDotCompleted,
    ]}
  >
    {completed && (
      <Ionicons name="checkmark" size={12} color="#fff" />
    )}
  </View>
);

const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleValue = new Animated.Value(1);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleValue, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        { transform: [{ scale: scaleValue }] }
      ]}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isFocused ? '#3B82F6' : '#6B7280'} 
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="none"
      />
    </Animated.View>
  );
};

const ActionButton = ({ title, onPress, disabled }) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    >
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.actionButtonGradient}
      >
        <Text style={styles.actionButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert(
        'Check your email',
        'We have sent you a password reset link. Please check your email to reset your password.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/sign-in') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareView 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.logoContainer}>
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          style={styles.logo}
        >
          <Ionicons name="key" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>Reset Password</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a password reset link.
        </Text>

        <InputField
          icon="mail"
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <ActionButton
          title={loading ? "Sending..." : "Send Reset Link"}
          onPress={handleResetPassword}
          disabled={loading || !email.trim()}
        />

        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text style={styles.signInText}>
            Remember your password? <Text style={styles.signInTextBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 20,
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
  content: {
    flex: 1,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
    transform: [{ scale: 1.2 }],
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
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
  inputContainerFocused: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  signInText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  signInTextBold: {
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen; 
 
 
 
 