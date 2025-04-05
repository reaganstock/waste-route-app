import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Animated,
  Platform,
  Image,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Mock profile data
const mockProfile = {
  full_name: 'John Doe',
  role: 'Driver',
  email: 'john.doe@example.com',
};

// SettingItem Component with animation
const SettingItem = ({ icon, title, description, value, onValueChange, isDisabled }) => {
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
    <Animated.View
      style={[
        styles.settingItem,
        { transform: [{ scale: scaleValue }] },
        isDisabled && styles.settingItemDisabled
      ]}
    >
      <View style={styles.settingInfo}>
        <View style={[styles.settingIcon, { backgroundColor: `rgba(59,130,246,${value ? 0.2 : 0.1})` }]}>
          <Ionicons name={icon} size={24} color={value ? '#3B82F6' : '#6B7280'} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#3B82F6' }}
        thumbColor={value ? '#fff' : '#9CA3AF'}
        ios_backgroundColor="#374151"
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        disabled={isDisabled}
      />
    </Animated.View>
  );
};

// Support Item Component with animation
const SupportItem = ({ icon, title, onPress }) => {
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
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.supportItem,
          { transform: [{ scale: scaleValue }] }
        ]}
      >
        <View style={styles.supportItemLeft}>
          <View style={styles.supportIcon}>
            <Ionicons name={icon} size={24} color="#3B82F6" />
          </View>
          <Text style={styles.supportItemText}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </Animated.View>
    </TouchableOpacity>
  );
};

const SettingsScreen = () => {
  const router = useRouter();
  const { signOut, user, deleteAccount } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: false,
    locationTracking: false,
    autoNavigation: true,
    soundEffects: true,
    tracking: false,
  });

  useEffect(() => {
    loadSettings();
    if (user) {
      fetchProfile();
    }
    checkPermissions();
  }, [user]);

  const checkPermissions = async () => {
    setPermissionsLoading(true);
    try {
      // Check notification permissions
      const { status: notificationStatus } = await Notifications.getPermissionsAsync();
      
      // Check location permissions
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      
      // Check tracking permissions
      let trackingStatus = false;
      if (Platform.OS === 'ios') {
        try {
          const { ATTrackingManager } = require('react-native-tracking-transparency');
          if (ATTrackingManager && ATTrackingManager.getTrackingPermissionStatus) {
            const status = await ATTrackingManager.getTrackingPermissionStatus();
            trackingStatus = status === 'authorized';
          }
        } catch (e) {
          console.log('Error checking tracking permission:', e);
        }
      }
      
      setSettings(prev => ({
        ...prev,
        notifications: notificationStatus === 'granted',
        locationTracking: locationStatus === 'granted',
        tracking: trackingStatus
      }));
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          autoNavigation: parsedSettings.autoNavigation !== undefined ? parsedSettings.autoNavigation : true,
          soundEffects: parsedSettings.soundEffects !== undefined ? parsedSettings.soundEffects : true,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSettingChange = async (key, value) => {
    try {
      let newValue = value;
      
      if (key === 'notifications') {
        if (value) {
          const { status } = await Notifications.requestPermissionsAsync();
          newValue = status === 'granted';
          
          if (!newValue) {
            Alert.alert(
              'Permission Required',
              'Notifications are needed for route alerts and updates. Please enable them in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
        } else {
          Alert.alert(
            'Disable Notifications',
            'To disable notifications, please go to your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return; // Don't update the setting since it can only be changed in Settings
        }
      }
      
      if (key === 'locationTracking') {
        if (value) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          newValue = status === 'granted';
          
          if (!newValue) {
            Alert.alert(
              'Permission Required',
              'Location permissions are needed for navigation and route tracking. Please enable them in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
        } else {
          Alert.alert(
            'Disable Location Tracking',
            'To disable location tracking, please go to your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return; // Don't update the setting since it can only be changed in Settings
        }
      }

      if (key === 'tracking') {
        if (Platform.OS === 'ios') {
          try {
            const { ATTrackingManager } = require('react-native-tracking-transparency');
            if (value) {
              if (ATTrackingManager && ATTrackingManager.requestTrackingPermission) {
                const status = await ATTrackingManager.requestTrackingPermission();
                newValue = status === 'authorized';
                
                if (!newValue) {
                  Alert.alert(
                    'Permission Denied',
                    'Tracking permission helps us optimize route planning based on usage patterns. You can change this in your device settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                  );
                }
              }
            } else {
              Alert.alert(
                'Disable App Tracking',
                'To disable app tracking, please go to your device settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
              );
              return; // Don't update the setting since it can only be changed in Settings
            }
          } catch (e) {
            console.log('Error with tracking permission:', e);
          }
        }
      }

      // Only save certain settings to AsyncStorage
      if (['autoNavigation', 'soundEffects'].includes(key)) {
        const updatedSettings = { ...settings, [key]: newValue };
        await AsyncStorage.setItem('userSettings', JSON.stringify({
          autoNavigation: updatedSettings.autoNavigation,
          soundEffects: updatedSettings.soundEffects
        }));
      }

      // Update the state
      setSettings(prev => ({ ...prev, [key]: newValue }));
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Directly sign out without confirmation
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteAccountRequest = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        // Account deleted, user will be signed out automatically
        Alert.alert('Success', 'Your account has been deleted successfully.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.profileCard}
            onPress={() => router.push('/profile-details')}
            activeOpacity={0.7}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'Loading...'}</Text>
              <Text style={styles.profileRole}>{profile?.role || ''}</Text>
              <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
            </View>
            <View style={styles.editButton}>
              <Ionicons name="chevron-forward" size={24} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            description="Receive alerts about route updates and collection stops"
            value={settings.notifications}
            onValueChange={(value) => handleSettingChange('notifications', value)}
            isDisabled={permissionsLoading}
          />

          <SettingItem
            icon="location-outline"
            title="Location Tracking"
            description="Allow app to track your location during routes"
            value={settings.locationTracking}
            onValueChange={(value) => handleSettingChange('locationTracking', value)}
            isDisabled={permissionsLoading}
          />

          <SettingItem
            icon="navigate-outline"
            title="Auto Navigation"
            description="Automatically start navigation to next house"
            value={settings.autoNavigation}
            onValueChange={(value) => handleSettingChange('autoNavigation', value)}
          />

          <SettingItem
            icon="volume-high-outline"
            title="Sound Effects"
            description="Play sounds for notifications and actions"
            value={settings.soundEffects}
            onValueChange={(value) => handleSettingChange('soundEffects', value)}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <SupportItem
            icon="help-circle-outline"
            title="Help & FAQ"
            onPress={() => router.push('/help')}
          />

          <SupportItem
            icon="mail-outline"
            title="Contact Support"
            onPress={() => router.push('/help')}
          />

          <SupportItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SupportItem
            icon="key-outline"
            title="Change Password"
            onPress={() => router.push('/change-password')}
          />

          <SupportItem
            icon="trash-outline"
            title="Delete Account"
            onPress={handleDeleteAccountRequest}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity 
                onPress={() => setDeleteModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Ionicons name="warning-outline" size={48} color="#EF4444" style={styles.warningIcon} />
              <Text style={styles.modalWarningText}>
                This action is permanent and cannot be undone. All your data will be deleted.
              </Text>
              <Text style={styles.confirmInstructionText}>
                Type "delete" to confirm:
              </Text>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="delete"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.confirmDeleteButton, { opacity: isDeleting ? 0.7 : 1 }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete My Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
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
  title: {
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
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  supportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionInfo: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 20,
  },
  modalWarningText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  confirmInstructionText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  confirmInput: {
    width: '100%',
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  confirmDeleteButton: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    width: '100%',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
});

export default SettingsScreen; 