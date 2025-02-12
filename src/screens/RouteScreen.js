import React, { useState, useEffect } from 'react';
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

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const GEOFENCE_RADIUS = 200; // meters

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#3B82F6'; // Blue for pending
    case 'completed':
      return '#10B981'; // Green for completed
    case 'skip':
      return '#EF4444'; // Red for skip
    default:
      return '#6B7280'; // Gray for unknown
  }
};

const AddressModal = ({ visible, house, onClose, onSaveNote, onNavigate }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <BlurView intensity={90} style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Address Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalAddress}>{house?.address}</Text>
        
        <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(house?.status) + '20' }]}>
          <Text style={[styles.modalStatusText, { color: getStatusColor(house?.status) }]}>
            {house?.status?.charAt(0).toUpperCase() + house?.status?.slice(1)}
          </Text>
        </View>

        <Text style={styles.modalLabel}>Notes</Text>
        <TextInput
          style={styles.modalInput}
          multiline
          placeholder="Add notes here..."
          placeholderTextColor="#6B7280"
          defaultValue={house?.notes}
          onEndEditing={(e) => onSaveNote(e.nativeEvent.text)}
        />

        <TouchableOpacity 
          style={styles.navigateButton}
          onPress={onNavigate}
        >
          <Ionicons name="navigate" size={20} color="#fff" />
          <Text style={styles.navigateText}>Navigate to Address</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  </Modal>
);

const HouseItem = ({ house, onToggle, isSelected, onPress }) => (
  <Pressable 
    style={[styles.houseItem, isSelected && styles.houseItemSelected]} 
    onPress={onPress}
  >
    <View style={styles.houseInfo}>
      <Text style={styles.houseAddress}>{house.address}</Text>
      {house.notes && (
        <Text style={styles.houseNotes}>{house.notes}</Text>
      )}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(house.status) + '20' }]}>
        <Text style={[styles.statusText, { color: getStatusColor(house.status) }]}>
          {house.status?.charAt(0).toUpperCase() + house.status?.slice(1)}
        </Text>
      </View>
    </View>
    <TouchableOpacity 
      style={[styles.checkbox, isSelected && styles.checkboxSelected]}
      onPress={() => onToggle(house.id)}
    >
      {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
    </TouchableOpacity>
  </Pressable>
);

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

const RouteScreen = ({ routeId }) => {
  const router = useRouter();
  const [route, setRoute] = useState(null);
  const [selectedHouses, setSelectedHouses] = useState(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRouteData();
    setupLocationAndNotifications();
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
        setRoute(routeData);
        // Set selected houses based on completed status
        const completedHouses = new Set(
          routeData.houses
            .filter(h => h.status === 'completed')
            .map(h => h.id)
        );
        setSelectedHouses(completedHouses);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

  const setupLocationAndNotifications = async () => {
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for address notifications.');
        return;
      }

      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Notification permission is required for address alerts.');
        return;
      }

      // Start location updates
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (location) => {
          if (notificationsEnabled) {
            checkGeofences(location.coords);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up location:', error);
    }
  };

  const showNotification = (message) => {
    // Add to on-screen notifications
    setNotifications(prev => [...prev, { id: Date.now(), message }]);

    // Schedule phone notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'WasteRoute Update',
        body: message,
        sound: true,
      },
      trigger: null, // Show immediately
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== Date.now()));
    }, 5000);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const checkGeofences = (currentLocation) => {
    if (!route?.houses) return;

    route.houses.forEach(house => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        parseFloat(house.lat),
        parseFloat(house.lng)
      );

      if (distance <= GEOFENCE_RADIUS && !selectedHouses.has(house.id)) {
        const isSkip = house.status === 'skip';
        const isNew = house.status === 'new';
        const message = `${isSkip ? '⚠️ Skip House' : isNew ? '🆕 New Customer' : '🏠 Collection'}: ${house.address}`;
        
        // Show in-app notification
        showNotification(message);
        
        // Show system notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: isSkip ? '⚠️ Skip House Nearby' : isNew ? '🆕 New Customer Nearby' : '🏠 Collection Nearby',
            body: `${house.address}\n${isSkip ? 'This house should be skipped' : isNew ? 'New customer for collection' : 'Regular collection'}`,
            data: { houseId: house.id },
          },
          trigger: null,
        });
      }
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const toggleHouse = async (houseId) => {
    const newSelected = new Set(selectedHouses);
    if (newSelected.has(houseId)) {
      newSelected.delete(houseId);
    } else {
      newSelected.add(houseId);
    }
    setSelectedHouses(newSelected);

    // Update house status in Supabase
    try {
      const { error } = await supabase
        .from('houses')
        .update({ status: newSelected.has(houseId) ? 'completed' : 'pending' })
        .eq('id', houseId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating house status:', error);
    }
  };

  const toggleAll = () => {
    if (selectedHouses.size === route.houses.length) {
      setSelectedHouses(new Set());
    } else {
      setSelectedHouses(new Set(route.houses.map(h => h.id)));
    }
  };

  const handleAddressPress = (house) => {
    setSelectedHouse(house);
    setModalVisible(true);
  };

  const handleSaveNote = async (note) => {
    try {
      // Update note in Supabase
      const { error } = await supabase
        .from('houses')
        .update({ notes: note })
        .eq('id', selectedHouse.id);

      if (error) throw error;

      // Update local state
      setRoute(prev => ({
        ...prev,
        houses: prev.houses.map(h => 
          h.id === selectedHouse.id 
            ? { ...h, notes: note }
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
    const stats = {
      total: route.houses.length,
      completed: selectedHouses.size,
      skipped: route.houses.filter(h => h.status === 'skip').length,
      newCustomers: route.houses.filter(h => h.status === 'new').length,
      startTime: new Date(route.date),
      endTime: new Date(),
    };

    const handleComplete = async () => {
      try {
        // Update route status to completed
        const { error } = await supabase
          .from('routes')
          .update({ status: 'completed' })
          .eq('id', route.id);

        if (error) throw error;

        router.push({
          pathname: '/route-complete',
          params: { summary: JSON.stringify(stats) }
        });
      } catch (error) {
        console.error('Error completing route:', error);
        Alert.alert('Error', 'Failed to complete route');
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.notificationToggle}
            onPress={() => setShowNotifications(!showNotifications)}
          >
            <Ionicons 
              name={showNotifications ? "notifications" : "notifications-off"} 
              size={24} 
              color={showNotifications ? "#10B981" : "#6B7280"} 
            />
            <Text style={[
              styles.notificationText,
              !showNotifications && styles.notificationTextOff
            ]}>
              Notifications
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {showNotifications && notifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          {notifications.map(notification => (
            <NotificationBanner
              key={notification.id}
              message={notification.message}
              onDismiss={() => dismissNotification(notification.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.toolbar}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(selectedHouses.size / route.houses.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progress}>
            {selectedHouses.size}/{route.houses.length} completed
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.checkAllButton}
          onPress={toggleAll}
        >
          <Ionicons name="checkbox" size={20} color="#fff" />
          <Text style={styles.checkAllText}>
            {selectedHouses.size === route.houses.length ? 'Uncheck All' : 'Check All'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {route.houses.map(house => (
          <HouseItem
            key={house.id}
            house={house}
            onToggle={toggleHouse}
            isSelected={selectedHouses.has(house.id)}
            onPress={() => handleAddressPress(house)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.endRouteButton}
          onPress={handleEndRoute}
        >
          <Ionicons name="flag" size={20} color="#fff" />
          <Text style={styles.endRouteText}>End Route</Text>
        </TouchableOpacity>
      </View>

      <AddressModal
        visible={modalVisible}
        house={selectedHouse}
        onClose={() => setModalVisible(false)}
        onSaveNote={handleSaveNote}
        onNavigate={handleNavigate}
      />
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  notificationText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationTextOff: {
    color: '#6B7280',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progress: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  checkAllButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  houseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  houseItemSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10B981',
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10B981',
  },
  houseInfo: {
    flex: 1,
  },
  houseAddress: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  houseNotes: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
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
  },
  footer: {
    padding: 16,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  endRouteButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  endRouteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(31, 41, 55, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  modalClose: {
    padding: 4,
  },
  modalAddress: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  navigateButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  navigateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
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
});

export default RouteScreen; 