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
    shouldPlaySound: false, // Disable default sound, we'll play our own
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
      colors={['#3B82F620', '#1E40AF10']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    <View style={styles.notificationsContent}>
      <View style={styles.notificationsHeader}>
        <View style={styles.notificationsIconBadge}>
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            style={[StyleSheet.absoluteFill, styles.notificationsIconGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="notifications" size={20} color="#fff" />
        </View>
        
        <View style={styles.notificationsTextContainer}>
          <Text style={styles.notificationsTitle}>House Notifications</Text>
          <View style={styles.notificationsSubtitleContainer}>
            <Ionicons name="information-circle-outline" size={12} color="#93C5FD" />
            <Text style={styles.notificationsSubtitle}>
              Active alerts appear here
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.notificationsLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
          </View>
          <Text style={styles.legendText}>Skip</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="information-circle" size={12} color="#10B981" />
          </View>
          <Text style={styles.legendText}>New</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#6B728020' }]}>
            <Ionicons name="home-outline" size={12} color="#6B7280" />
          </View>
          <Text style={styles.legendText}>Regular</Text>
        </View>
      </View>
    </View>
  </BlurView>
);

const GeofenceAlert = ({ house }) => {
  // Determine status - simplify to ensure all house types are shown
  const status = house.status?.toLowerCase() || 'collect';
  const isSkip = status === 'skip' || status === 'skipped';
  const isNewCustomer = status === 'new customer' || status === 'new';
  
  // Get the right colors and icons based on status
  let color = '#6B7280'; // Default gray
  let icon = 'home-outline';
  let title = 'Regular Collection';
  let gradientColors = ['#6B728030', '#1f293760'];
  
  if (isSkip) {
    color = '#EF4444'; // Red for skip
    icon = 'alert-circle';
    title = 'Skip House';
    gradientColors = ['#EF444425', '#7f1d1d70'];
  } else if (isNewCustomer) {
    color = '#10B981'; // Green for new customer
    icon = 'information-circle';
    title = 'New Customer';
    gradientColors = ['#10B98125', '#065f4670'];
  }

  return (
    <BlurView intensity={80} style={[
      styles.geofenceAlert,
      { borderColor: `${color}40` }
    ]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.geofenceContent}>
        <View style={[styles.geofenceIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        
        <View style={styles.geofenceTextContent}>
          <View style={styles.geofenceHeader}>
            <Text style={[styles.geofenceTitle, { color }]}>{title}</Text>
            {house.distance && (
              <View style={[styles.distanceBadge, { backgroundColor: `${color}15` }]}>
                <Ionicons name="location" size={10} color={color} />
                <Text style={[styles.distanceBadgeText, { color }]}>
                  {Math.round(house.distance)}m
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.geofenceAddress} numberOfLines={1}>{house.address}</Text>
          
          {house.notes && (
            <Text style={styles.geofenceNotes} numberOfLines={1}>
              <Ionicons name="document-text-outline" size={10} color="#9CA3AF" /> {house.notes}
            </Text>
          )}
        </View>
      </View>
    </BlurView>
  );
};

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
  const [houseAlerts, setHouseAlerts] = useState([]);
  
  // Add a ref to track which houses have already been notified
  const notifiedHousesRef = useRef(new Set());
  
  // Use the geofencing hook for tracking, but we'll handle our own notifications display
  const { 
    nearbyHouses, 
    isTracking, 
    error: geofencingError 
  } = useGeofencing(
    route?.houses,
    true // Always track
  );

  // Add a subscription to receive notifications
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const notificationData = notification.request.content;
      const houseId = notificationData.data?.houseId;
      
      // Skip if we've already shown a notification for this house
      if (houseId && notifiedHousesRef.current.has(houseId)) {
        console.log(`Skipping duplicate notification for house ID: ${houseId}`);
        return;
      }
      
      // Add to our local notifications list
      setNotifications(prev => {
        // Check if notification with this house ID already exists
        const alreadyExists = prev.some(n => n.data?.houseId === houseId);
        if (alreadyExists) {
          console.log(`Notification for house ID ${houseId} already in list`);
          return prev;
        }
        
        // If it's a new notification with a house ID, track it
        if (houseId) {
          notifiedHousesRef.current.add(houseId);
        }
        
        // Add the new notification to the list
        return [
          {
            id: notification.request.identifier,
            title: notificationData.title,
            body: notificationData.body,
            data: notificationData.data,
            timestamp: new Date(),
          },
          ...prev
        ].slice(0, 10); // Keep only the 10 most recent notifications
      });
    });

    // Listen for notification responses (user interactions)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { houseId } = response.notification.request.content.data || {};
      
      // If a house ID was included, select that house
      if (houseId && route?.houses) {
        const house = route.houses.find(h => h.id === houseId);
        if (house) {
          handleAddressPress(house);
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [route]);

  // Add a function to check if a house has been notified
  const hasBeenNotified = useCallback((houseId) => {
    return notifiedHousesRef.current.has(houseId);
  }, []);

  // Reset tracked houses when route changes
  useEffect(() => {
    if (route) {
      notifiedHousesRef.current = new Set();
    }
  }, [route?.id]);

  // Add allSelected calculation
  const allSelected = route?.houses && selectedHouses.size === route.houses.length;

  // Update toggleNotifications function to handle only notification permissions
  const toggleNotifications = async () => {
    try {
      if (!phoneNotifications) {
        const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
        if (notificationStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Notification permission is required for alerts.');
          return;
        }
      }
      
      setPhoneNotifications(prev => !prev);
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to toggle notifications');
    }
  };

  useEffect(() => {
    fetchRouteData();
  }, [routeId]);

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
        // Set selected houses based on their current status
        const selectedHouseIds = new Set(
          routeData.houses
            .filter(h => h.status === 'collect')
            .map(h => h.id)
        );
        setSelectedHouses(selectedHouseIds);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

  // Update showNotification to respect phoneNotifications setting
  const showNotification = (message) => {
    // Always add to on-screen notifications
    setNotifications(prev => [...prev, { id: Date.now(), message }]);

    // Only show phone notification if enabled
    if (phoneNotifications) {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'WasteRoute Update',
        body: message,
        sound: true,
      },
        trigger: null,
    });
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
        
        // Update route with minimal required fields
        const { error: updateError } = await supabase
          .from('routes')
          .update({
            status: 'completed',
            completed_houses: completed
            // No other fields - they might cause schema errors
          })
          .eq('id', route.id);

        if (updateError) {
          console.error('Error updating route completion:', updateError);
          throw updateError;
        }

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
  const renderHeaderActions = () => (
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
          {phoneNotifications ? 'Notifications' : 'Off'}
        </Text>
      </TouchableOpacity>
    </View>
  );

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

  // Add this to the component
  useEffect(() => {
    setupNotifications();
  }, []);

  // Update useEffect to handle displaying all houses for notifications
  useEffect(() => {
    // Function to update house alerts
    const updateHouseAlerts = () => {
      if (!route?.houses) return;
      
      // Display a subset of houses in the alerts section (max 5)
      // In a real app, you'd filter by distance, but here we'll just show a sample
      const alerts = route.houses.slice(0, 5).map(house => ({
        ...house,
        distance: Math.floor(Math.random() * 200) + 50, // Simulate random distances
      }));
      
      setHouseAlerts(alerts);
    };
    
    // Update alerts when route data is loaded
    if (route) {
      updateHouseAlerts();
    }
    
    // Optionally simulate periodic updates
    const interval = setInterval(() => {
      if (route) {
        updateHouseAlerts();
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [route]);

  // Add status indicators for nearby houses
  const getHouseStatus = useCallback((house) => {
    // Check if this house is in our alerts list (simulating geofencing)
    const alertHouse = houseAlerts.find(h => h.id === house.id);
    
    if (alertHouse) {
      return {
        ...house,
        proximityStatus: 'nearby',
        distance: alertHouse.distance
      };
    }
    
    return house;
  }, [houseAlerts]);

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
        onPress={() => handleAddressPress(house)}
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

        {/* Notification section that mirrors phone notifications */}
        {showNotifications && (
          <View style={styles.notificationsSection}>
            <ScrollView 
              style={styles.notificationsScroll}
              contentContainerStyle={styles.notificationsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <NotificationsSection />
              
              {notifications.length > 0 ? (
                notifications.map((notification, index) => {
                  // Extract data needed for GeofenceAlert
                  const house = {
                    id: notification.data?.houseId || `notification-${index}`,
                    address: notification.data?.address || "Unknown address",
                    status: notification.data?.status || "collect",
                    notes: notification.body?.split('\n')?.[1]?.replace('Note: ', '') || '',
                    distance: notification.data?.distance || 0
                  };
                  
                  return (
                    <GeofenceAlert 
                      key={notification.id || index} 
                      house={house} 
                    />
                  );
                })
              ) : (
                <Text style={styles.noNotificationsText}>
                  No active notifications. Notifications will appear here when you receive them.
                </Text>
              )}
            </ScrollView>
          </View>
        )}

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
    borderColor: '#3B82F630',
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationsContent: {
    padding: 16,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  notificationsIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3B82F640',
  },
  notificationsIconGradient: {
    borderRadius: 12,
  },
  notificationsTextContainer: {
    flex: 1,
  },
  notificationsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  notificationsSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationsSubtitle: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '500',
  },
  notificationsLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff15',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  geofenceAlert: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  geofenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  geofenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  geofenceTextContent: {
    flex: 1,
  },
  geofenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  geofenceTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  geofenceAddress: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  geofenceNotes: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  distanceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
  noNotificationsText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  houseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default RouteScreen; 