import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import ActiveRouteMap from '../components/ActiveRouteMap';
import { mockRoutes, mockHouses } from '../lib/mockData';
import * as Notifications from 'expo-notifications';

const { height } = Dimensions.get('window');

const RouteScreen = ({ route, navigation }) => {
  const { routeId } = route.params;
  const [routeData, setRouteData] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const slideAnim = useState(new Animated.Value(height))[0];

  useEffect(() => {
    setupNotifications();
    fetchRouteData();
  }, [routeId]);

  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Notifications are required for route alerts');
    }
  };

  const fetchRouteData = () => {
    const data = mockRoutes.find(r => r.id === routeId);
    setRouteData(data);
  };

  const showHouseCard = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const hideHouseCard = () => {
    Animated.spring(slideAnim, {
      toValue: height,
      useNativeDriver: true,
    }).start();
    setSelectedHouse(null);
  };

  const handleHouseStatusChange = async (houseId, status) => {
    if (status === 'approaching') {
      // Show notification when approaching a house
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Approaching House',
          body: 'You are near the next house on your route',
          data: { houseId },
        },
        trigger: null, // Show immediately
      });
    } else {
      // Update house status in UI
      const house = mockHouses.find(h => h.id === houseId);
      if (house) {
        setSelectedHouse({ ...house, status });
        showHouseCard();
      }

      // Check if route is complete
      const remainingHouses = mockHouses.filter(h => 
        h.route_id === routeId && h.status === 'pending'
      );
      
      if (remainingHouses.length === 0) {
        Alert.alert(
          'Route Complete',
          'All houses have been processed. Would you like to finish the route?',
          [
            {
              text: 'Continue',
              style: 'cancel',
            },
            {
              text: 'Finish Route',
              onPress: () => navigation.navigate('RouteComplete', { routeId }),
            },
          ]
        );
      }
    }
  };

  const getProgressPercentage = () => {
    const houses = mockHouses.filter(h => h.route_id === routeId);
    if (!houses.length) return 0;
    const completed = houses.filter(h => h.status !== 'pending').length;
    return (completed / houses.length) * 100;
  };

  return (
    <View style={styles.container}>
      <ActiveRouteMap
        route={routeData}
        onHouseStatusChange={handleHouseStatusChange}
      />

      {/* Top Navigation Bar */}
      <BlurView intensity={80} style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.routeTitle}>{routeData?.name || 'Route'}</Text>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('RouteDetails', { routeId })}
        >
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </BlurView>

      {/* Navigation Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isNavigating && styles.activeControl]}
          onPress={() => setIsNavigating(!isNavigating)}
        >
          <Ionicons 
            name={isNavigating ? "navigate" : "navigate-outline"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* House Card */}
      <Animated.View 
        style={[
          styles.houseCard,
          {
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {selectedHouse && (
          <BlurView intensity={80} style={styles.houseCardContent}>
            <View style={styles.houseHeader}>
              <Text style={styles.houseAddress}>{selectedHouse.address}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hideHouseCard}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedHouse.notes && (
              <Text style={styles.houseNotes}>{selectedHouse.notes}</Text>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.collectButton]}
                onPress={() => handleHouseStatusChange(selectedHouse.id, 'collect')}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Collect</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => handleHouseStatusChange(selectedHouse.id, 'skip')}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
      </Animated.View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { width: `${getProgressPercentage()}%` }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  controls: {
    position: 'absolute',
    top: 120,
    right: 20,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeControl: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  houseCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  houseCardContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  houseAddress: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  houseNotes: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  collectButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
});

export default RouteScreen; 