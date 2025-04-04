import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  TextInput,
  Linking,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useGeofencing } from '../hooks/useGeofencing';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'skip':
      return '#EF4444'; // Red
    case 'new customer':
      return '#10B981'; // Green
    case 'pending':
      return '#3B82F6'; // Blue
    case 'collect':
    default:
      return '#6B7280'; // Grey
  }
};

const AddressModal = ({ visible, house, onClose, onSaveNote, onNavigate }) => {
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSaveAndClose = () => {
    if (additionalNotes.trim()) {
      onSaveNote(additionalNotes.trim());
    }
    onClose();
  };

  return (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <BlurView intensity={80} style={styles.modalContent}>
        <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
          <Text style={styles.modalTitle}>House Details</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(house?.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(house?.status) }]}>
                  {house?.status?.charAt(0).toUpperCase() + house?.status?.slice(1)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleSaveAndClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Address</Text>
            <Text style={styles.addressText}>{house?.address}</Text>
          </View>
          <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Initial Notes</Text>
              {house?.notes ? (
                <View style={styles.initialNotesContainer}>
                  <Text style={styles.initialNotesText}>{house?.notes}</Text>
                </View>
              ) : (
                <Text style={styles.noNotesText}>No initial notes</Text>
              )}
              
              <Text style={[styles.notesLabel, { marginTop: 16 }]}>Add Notes</Text>
              <View style={styles.notesInputContainer}>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  placeholder="Add additional notes..."
              placeholderTextColor="#6B7280"
                  autoCapitalize="sentences"
                  returnKeyType="done"
            />
                <View style={styles.notesInputBorder} />
              </View>
          </View>
          <TouchableOpacity 
            style={styles.navigateButton}
            onPress={onNavigate}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navigateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.navigateButtonText}>Navigate to Address</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  </Modal>
);
};

const HouseItem = ({ house, onToggle, isSelected, onPress }) => {
  const statusColor = getStatusColor(house.status);
  
  return (
    <Pressable 
      style={[
        styles.houseItem,
        { backgroundColor: `${statusColor}10` },
        { borderColor: statusColor }
      ]} 
      onPress={onPress}
    >
      <View style={styles.houseInfo}>
        <Text style={styles.houseAddress}>{house.address}</Text>
        {house.notes && (
          <Text style={styles.houseNotes}>{house.notes}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {house.status?.charAt(0).toUpperCase() + house.status?.slice(1)}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[
          styles.checkbox,
          { borderColor: statusColor },
          isSelected && { backgroundColor: statusColor }
        ]}
        onPress={() => onToggle(house.id)}
      >
        {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
      </TouchableOpacity>
    </Pressable>
  );
};

const NotificationBanner = ({ message, onDismiss }) => (
  <BlurView intensity={80} style={styles.notificationBanner}>
    <View style={styles.notificationContent}>
      <Ionicons name="notifications" size={20} color="#10B981" />
      <Text style={styles.notificationText}>{message}</Text>
    </View>
    <TouchableOpacity onPress={onDismiss}>
      <Ionicons name="close" size={20} color="#6B7280" />
    </TouchableOpacity>
  </BlurView>
);

const NotificationsSection = () => (
  <BlurView intensity={80} style={styles.notificationsContainer}>
    <LinearGradient
      colors={['#3B82F615', 'transparent']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
    <View style={styles.notificationsContent}>
      <View style={styles.notificationsHeader}>
        <View style={styles.notificationsIconContainer}>
          <Ionicons name="notifications-outline" size={24} color="#3B82F6" />
        </View>
        <View style={styles.notificationsTextContainer}>
          <Text style={styles.notificationsTitle}>Approaching Houses</Text>
          <Text style={styles.notificationsSubtitle}>
            Special notifications will appear here
          </Text>
        </View>
      </View>
      
      <View style={styles.notificationsLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Skip Houses</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>New Customers</Text>
        </View>
      </View>
    </View>
  </BlurView>
);

const GeofenceAlert = ({ house }) => (
  <BlurView intensity={80} style={[
    styles.geofenceAlert,
    { borderColor: house.status === 'skip' ? '#EF444430' : '#10B98130' }
  ]}>
    <View style={styles.geofenceContent}>
      <View style={[
        styles.geofenceIcon,
        { backgroundColor: house.status === 'skip' ? '#EF444415' : '#10B98115' }
      ]}>
        <Ionicons 
          name={house.status === 'skip' ? 'alert-circle' : 'information-circle'} 
          size={24} 
          color={house.status === 'skip' ? '#EF4444' : '#10B981'} 
        />
      </View>
      <View style={styles.geofenceTextContent}>
        <Text style={[
          styles.geofenceTitle,
          { color: house.status === 'skip' ? '#EF4444' : '#10B981' }
        ]}>
          {house.status === 'skip' ? 'Skip House' : 'New Customer'}
        </Text>
        <Text style={styles.geofenceAddress}>{house.address}</Text>
      </View>
  </View>
  </BlurView>
);

const RouteScreen = ({ routeId }) => {
  const router = useRouter();
  const [route, setRoute] = useState(null);
  const [selectedHouses, setSelectedHouses] = useState(new Set());
  const [phoneNotifications, setPhoneNotifications] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const { nearbyHouses, approachingHouses, isTracking, error: geofencingError } = useGeofencing(
    route?.houses,
    true // Always track, notifications controlled separately
  );

  // Add allSelected calculation
  const allSelected = route?.houses && selectedHouses.size === route.houses.length;

  // Update toggleNotifications function to handle route-specific notifications independently of system permissions
  const toggleNotifications = async () => {
    try {
      // Check the current notification permission status
      const { status: notificationStatus } = await Notifications.getPermissionsAsync();
      
      // If toggling ON and permissions aren't granted, request them
      if (!phoneNotifications && notificationStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          // Still allow toggling the in-app preference even if system permission is denied
          setPhoneNotifications(true); // Toggle the in-app setting
          Alert.alert(
            'Limited Notifications',
            'System notifications are disabled, but in-app alerts will still show. Enable system notifications in Settings for full features.',
            [
              { text: 'Continue', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
      }
      
      // Toggle in-app notification preference
      setPhoneNotifications(prev => !prev);
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to toggle notifications');
    }
  };

  useEffect(() => {
    fetchRouteData();
  }, [routeId]);

  // Add this to the component to check notification permissions on mount and set the toggle accordingly
  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        // Only update the UI toggle if permissions are denied
        // This allows users to still toggle the in-app preference even if system permissions are off
        if (status !== 'granted') {
          setPhoneNotifications(false);
        }
      } catch (error) {
        console.error('Error checking notification permissions:', error);
      }
    };
    
    checkNotificationPermissions();
    setupNotifications();
  }, []);

  const fetchRouteData = async () => {
    try {
      setLoading(true);
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          *,
          houses (
            id,
            address,
            lat,
            lng,
            status,
            notes,
            estimated_time
          )
        `)
        .eq('id', routeId)
        .single();

      if (routeError) throw routeError;
      
      if (routeData) {
        // If route is pending, start it
        if (routeData.status === 'pending') {
          const { error: updateError } = await supabase
            .from('routes')
            .update({
              status: 'in_progress'
              // Don't include start_time since column might not exist
            })
            .eq('id', routeId);

          if (updateError) {
            console.error('Error updating route status:', updateError);
            // Continue without failing if it's a schema issue
            if (!updateError.message.includes('start_time')) {
              throw updateError;
            }
          }
          
          routeData.status = 'in_progress';
          // Set a fallback start time for UI display
          if (!routeData.start_time) {
            routeData.start_time = new Date().toISOString();
          }
        }

        setRoute(routeData);
        // Initialize with an empty selection set instead of preselecting "collect" houses
        setSelectedHouses(new Set());
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

  // Update showNotification to respect phoneNotifications setting and check system permissions
  const showNotification = async (message) => {
    // Always add to on-screen notifications regardless of system permissions
    setNotifications(prev => [...prev, { id: Date.now(), message }]);

    // Only show phone notification if in-app setting is enabled AND system permissions are granted
    if (phoneNotifications) {
      try {
        // Check current system permission status
        const { status } = await Notifications.getPermissionsAsync();
        
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
      content: {
        title: 'WasteRoute Update',
        body: message,
        sound: true,
      },
        trigger: null,
    });
        }
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== Date.now()));
    }, 5000);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Update the toggleHouse function to maintain the original status and only update the selection state
  const toggleHouse = async (houseId) => {
    try {
      const house = route.houses.find(h => h.id === houseId);
      if (!house) return;

      const newSelected = new Set(selectedHouses);
      if (newSelected.has(houseId)) {
        newSelected.delete(houseId);
      } else {
        newSelected.add(houseId);
      }

      // Update route progress in database
      const { error: routeError } = await supabase
        .from('routes')
        .update({ 
          completed_houses: newSelected.size
        })
        .eq('id', route.id);

      if (routeError) throw routeError;

      // Update local state
      setSelectedHouses(newSelected);
      setRoute(prev => ({
        ...prev,
        completed_houses: newSelected.size
      }));

    } catch (error) {
      console.error('Error updating selection:', error);
      Alert.alert('Error', 'Failed to update selection');
    }
  };

  const toggleAll = async () => {
    try {
      const allSelected = selectedHouses.size === route.houses.length;
      const newSelected = allSelected ? new Set() : new Set(route.houses.map(h => h.id));

      // Update route progress
      const { error: routeError } = await supabase
        .from('routes')
        .update({ 
          completed_houses: allSelected ? 0 : route.houses.length
        })
        .eq('id', route.id);

      if (routeError) throw routeError;

      // Update local state
      setSelectedHouses(newSelected);
      setRoute(prev => ({
        ...prev,
        completed_houses: allSelected ? 0 : route.houses.length
      }));

    } catch (error) {
      console.error('Error updating selections:', error);
      Alert.alert('Error', 'Failed to update selections');
    }
  };

  const handleAddressPress = (house) => {
    setSelectedHouse(house);
    setModalVisible(true);
  };

  const handleSaveNote = async (newNote) => {
    try {
      const updatedNotes = selectedHouse.notes 
        ? `${selectedHouse.notes}\n\n${newNote}`
        : newNote;

      // Update note in Supabase
      const { error } = await supabase
        .from('houses')
        .update({ notes: updatedNotes })
        .eq('id', selectedHouse.id);

      if (error) throw error;

      // Update local state
      setRoute(prev => ({
        ...prev,
        houses: prev.houses.map(h => 
          h.id === selectedHouse.id 
            ? { ...h, notes: updatedNotes }
            : h
        )
      }));
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleNavigate = () => {
    const { lat, lng } = selectedHouse;
    const url = Platform.select({
      ios: `maps:${lat},${lng}`,
      android: `geo:${lat},${lng}`,
    });
    Linking.openURL(url);
  };

  const handleEndRoute = async () => {
    const handleComplete = async () => {
      try {
        // Calculate basic metrics only
        const completed = selectedHouses.size;
        const total = route.houses.length;
        const completionPercentage = Math.round((completed / total) * 100);
        
        // Update route with minimal required fields
        const { error: updateError } = await supabase
          .from('routes')
          .update({
            status: 'completed',
            completed_houses: completed,
            completion: completionPercentage
          })
          .eq('id', route.id);

        if (updateError) {
          console.error('Error updating route completion:', updateError);
          throw updateError;
        }

        // Force a refresh of route data to ensure navigation home shows updated stats
        console.log(`Route completed - ${completed} houses out of ${total} (${completionPercentage}%)`);

        // Prepare simple summary for completion screen
        const summary = {
          route_id: route.id,
          route_name: route.name,
          total: total,
          completed: completed
        };

        // Navigate to completion screen with summary
        router.push({
          pathname: '/route-complete',
          params: { summary: JSON.stringify(summary) }
        });
      } catch (error) {
        console.error('Error completing route:', error);
        Alert.alert('Error', 'Failed to complete route: ' + error.message);
      }
    };

    if (selectedHouses.size < route.houses.length) {
      Alert.alert(
        'Incomplete Route',
        'Not all houses have been checked. Are you sure you want to end the route?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End Route', 
            style: 'destructive',
            onPress: handleComplete
          }
        ]
      );
    } else {
      handleComplete();
    }
  };

  // Update the header actions section
  const renderHeaderActions = () => {
    // Check if notifications are actually possible (system permission granted)
    let notificationLabel = phoneNotifications ? 'Notifications' : 'Off';
    
    return (
    <View style={styles.headerActions}>
      <TouchableOpacity 
        style={[
          styles.notificationToggle,
          { backgroundColor: phoneNotifications ? '#3B82F620' : '#6B728020' }
        ]}
        onPress={toggleNotifications}
      >
        <Ionicons 
          name={phoneNotifications ? "notifications" : "notifications-off-outline"} 
          size={20} 
          color={phoneNotifications ? "#3B82F6" : "#6B7280"} 
        />
        <Text style={[
          styles.notificationText,
          { color: phoneNotifications ? "#3B82F6" : "#6B7280" }
        ]}>
            {notificationLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
  };

  // Add this near the top of the file after imports
  const setupNotifications = async () => {
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Required',
          'Route notifications are important for tracking skip houses and new customers. Please enable notifications in your settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Continue Without Notifications', style: 'cancel' }
          ]
        );
        return false;
      }

      // Configure notification categories/actions
      await Notifications.setNotificationCategoryAsync('route', [
        {
          identifier: 'mark_complete',
          buttonTitle: 'Mark Complete',
          options: {
            isAuthenticationRequired: false,
            isDestructive: false,
          }
        },
        {
          identifier: 'navigate',
          buttonTitle: 'Navigate',
          options: {
            isAuthenticationRequired: false,
            isDestructive: false,
          }
        }
      ]);

      return true;
    } catch (error) {
      console.error('Error setting up notifications:', error);
      return false;
    }
  };

  // Add notification response handler
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { houseId, status, lat, lng } = response.notification.request.content.data;
      
      // Handle notification action
      switch (response.actionIdentifier) {
        case 'mark_complete':
          handleHouseComplete(houseId);
          break;
        case 'navigate':
          const url = Platform.select({
            ios: `maps://app?daddr=${lat},${lng}`,
            android: `google.navigation:q=${lat},${lng}`
          });
          Linking.openURL(url);
          break;
        default:
          // Open house details on notification tap
          if (houseId) {
            const house = route?.houses.find(h => h.id === houseId);
            if (house) {
              setSelectedHouse(house);
            }
          }
      }
    });

    return () => subscription.remove();
  }, [route?.houses]);

  // Add status indicators for nearby houses
  const getHouseStatus = useCallback((house) => {
    const isNearby = nearbyHouses.find(h => h.id === house.id);
    const isApproaching = approachingHouses.find(h => h.id === house.id);
    
    if (isNearby) {
      return {
        ...house,
        proximityStatus: 'nearby',
        distance: isNearby.distance
      };
    }
    
    if (isApproaching) {
      return {
        ...house,
        proximityStatus: 'approaching',
        distance: isApproaching.distance
      };
    }
    
    return house;
  }, [nearbyHouses, approachingHouses]);

  // Update house list rendering to include proximity status
  const renderHouseItem = ({ item: house }) => {
    const houseWithStatus = getHouseStatus(house);
    const showDistance = houseWithStatus.proximityStatus && houseWithStatus.distance;
    
    return (
      <TouchableOpacity 
        style={[
          styles.houseItem,
          houseWithStatus.proximityStatus === 'nearby' && styles.houseItemNearby,
          houseWithStatus.proximityStatus === 'approaching' && styles.houseItemApproaching,
        ]}
        onPress={() => setSelectedHouse(house)}
      >
        <View style={styles.houseInfo}>
          <Text style={styles.houseAddress}>{house.address}</Text>
          {showDistance && (
            <Text style={styles.distanceText}>
              {Math.round(houseWithStatus.distance)}m away
            </Text>
          )}
          {house.notes && (
            <Text style={styles.houseNotes}>{house.notes}</Text>
          )}
        </View>
        <View style={styles.houseStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(house.status) }
          ]} />
          <Text style={styles.statusText}>{house.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (geofencingError === 'LOCATION_PERMISSION_DENIED') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={['#1a1a1a', '#000000']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionErrorContainer}>
          <Ionicons name="navigate-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Location Access Required</Text>
          <Text style={styles.errorText}>
            We need location access to track your route progress and provide alerts for special pickups.
          </Text>
          <TouchableOpacity
            style={styles.enablePermissionButton}
            onPress={() => Linking.openSettings()}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.enablePermissionGradient}
            >
              <Text style={styles.enablePermissionText}>Open Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (geofencingError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={['#1a1a1a', '#000000']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionErrorContainer}>
          <Ionicons name="warning-outline" size={64} color="#F59E0B" />
          <Text style={styles.errorTitle}>Tracking Error</Text>
          <Text style={styles.errorText}>
            There was an error tracking your location. This may affect route notifications.
          </Text>
          <TouchableOpacity
            style={styles.enablePermissionButton}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.enablePermissionGradient}
            >
              <Text style={styles.enablePermissionText}>Return to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Route not found</Text>
      </View>
    );
  }

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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Route Details</Text>
          <Text style={styles.headerSubtitle}>{route?.name}</Text>
        </View>
        {renderHeaderActions()}
      </BlurView>

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.progressRow}>
            <View style={styles.progressSection}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                      { width: `${(selectedHouses.size / (route?.houses?.length || 1)) * 100}%` }
              ]} 
            />
          </View>
                <Text style={styles.progressText}>
                  {selectedHouses.size}/{route?.houses?.length || 0} completed
          </Text>
              </View>
        </View>
        
        <TouchableOpacity 
          style={styles.checkAllButton}
          onPress={toggleAll}
              disabled={loading || !route?.houses?.length}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.checkAllGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color="#fff" 
                />
              </LinearGradient>
        </TouchableOpacity>
          </View>
      </View>

        <View style={styles.notificationsSection}>
      <ScrollView 
            style={styles.notificationsScroll}
            contentContainerStyle={styles.notificationsScrollContent}
        showsVerticalScrollIndicator={false}
      >
            <NotificationsSection />
            {nearbyHouses.map((house, index) => (
              <GeofenceAlert key={`${house.id}-${index}`} house={house} />
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.housesScroll}
          contentContainerStyle={[
            styles.housesScrollContent,
            { paddingBottom: 200 } // Increased padding for better scroll
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {route?.houses?.map(house => (
          <HouseItem
            key={house.id}
            house={house}
            onToggle={toggleHouse}
            isSelected={selectedHouses.has(house.id)}
            onPress={() => handleAddressPress(house)}
          />
        ))}
      </ScrollView>
      </View>

      <BlurView intensity={80} style={styles.footer}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={[StyleSheet.absoluteFill, { height: 200 }]}
          pointerEvents="none"
          locations={[0, 0.5]}
        />
        <View style={styles.footerContent}>
          <View style={styles.footerStats}>
            <View style={styles.footerStatsLeft}>
              <Text style={styles.footerStatsText}>
                {selectedHouses.size}/{route?.houses?.length || 0} Houses
              </Text>
              <Text style={styles.footerStatsSubtext}>
                {Math.round((selectedHouses.size / (route?.houses?.length || 1)) * 100)}% Complete
              </Text>
            </View>
            <View style={styles.footerStatsRight}>
              <Text style={styles.footerTimeText}>Started at</Text>
              <Text style={styles.footerTimeValue}>
                {route?.start_time ? 
                  new Date(route.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : 
                  new Date().toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })
                }
              </Text>
            </View>
          </View>
        <TouchableOpacity 
            style={[
              styles.endRouteButton,
              selectedHouses.size === route?.houses?.length && styles.endRouteButtonComplete
            ]}
          onPress={handleEndRoute}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedHouses.size === route?.houses?.length ? 
                ['#059669', '#10B981'] : 
                ['#3B82F6', '#2563EB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.endRouteGradient}
            >
              <Ionicons 
                name={selectedHouses.size === route?.houses?.length ? "checkmark-circle" : "flag-outline"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.endRouteText}>
                {selectedHouses.size === route?.houses?.length ? 'Complete Route' : 'End Route'}
              </Text>
            </LinearGradient>
        </TouchableOpacity>
      </View>
      </BlurView>

      <AddressModal
        visible={modalVisible}
        house={selectedHouse}
        onClose={() => setModalVisible(false)}
        onSaveNote={handleSaveNote}
        onNavigate={handleNavigate}
      />

      {geofencingError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Location tracking error: {geofencingError}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsSection: {
    flex: 1,
    maxHeight: 180,
    marginBottom: 12,
  },
  notificationsScroll: {
    backgroundColor: '#00000040',
  },
  notificationsScrollContent: {
    padding: 16,
    gap: 12,
  },
  notificationsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3B82F620',
    marginBottom: 8,
  },
  notificationsContent: {
    padding: 16,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F615',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationsTextContainer: {
    flex: 1,
  },
  notificationsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  notificationsSubtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 20,
  },
  notificationsLegend: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  geofenceAlert: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 10,
  },
  geofenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  geofenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  geofenceTextContent: {
    flex: 1,
  },
  geofenceTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  geofenceAddress: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 20,
  },
  checkAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  checkAllGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressSection: {
    flex: 1,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
  housesScroll: {
    flex: 1,
    backgroundColor: '#00000040',
  },
  housesScrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  houseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  houseInfo: {
    flex: 1,
  },
  houseAddress: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  houseNotes: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  footerContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  footerStatsLeft: {
    flex: 1,
  },
  footerStatsRight: {
    alignItems: 'flex-end',
  },
  footerStatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerStatsSubtext: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  footerTimeText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  footerTimeValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  endRouteButton: {
    overflow: 'hidden',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 4,
  },
  endRouteButtonComplete: {
    shadowColor: '#059669',
    shadowOpacity: 0.4,
  },
  endRouteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
  },
  endRouteText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(17, 24, 39, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  modalBody: {
    gap: 24,
  },
  addressSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 22,
  },
  notesSection: {
    gap: 8,
  },
  notesLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  notesInputContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 2,
  },
  notesInput: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  notesInputBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    pointerEvents: 'none',
  },
  navigateButton: {
    overflow: 'hidden',
    borderRadius: 12,
    marginTop: 8,
  },
  navigateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  initialNotesContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  initialNotesText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  noNotesText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  houseItemNearby: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981', // green
  },
  houseItemApproaching: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6', // blue
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#EF4444',
    padding: 8,
    width: '100%',
  },
  permissionErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 20,
    paddingVertical: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#D1D5DB',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  enablePermissionButton: {
    overflow: 'hidden',
    borderRadius: 12,
    marginTop: 8,
    width: '80%',
  },
  enablePermissionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  enablePermissionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteScreen; 