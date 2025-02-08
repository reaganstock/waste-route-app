import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Map from '../components/Map';
import { useLocation } from '../hooks/useLocation';
import { useGeofencing } from '../hooks/useGeofencing';
import { mockRoutes, mockHouses } from '../lib/mockData';

const { height } = Dimensions.get('window');

const RouteScreen = ({ route, navigation }) => {
  const { routeId } = route.params;
  const [routeData, setRouteData] = useState(null);
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const { location } = useLocation();
  const { nearbyHouses } = useGeofencing(location, houses);

  const slideAnim = useState(new Animated.Value(height))[0];

  useEffect(() => {
    fetchRouteData();
    fetchHouses();
  }, [routeId]);

  useEffect(() => {
    if (nearbyHouses.length > 0) {
      const house = nearbyHouses[0];
      if (house.status === 'pending') {
        setSelectedHouse(house);
        showHouseCard();
      }
    }
  }, [nearbyHouses]);

  const fetchRouteData = () => {
    const data = mockRoutes.find(r => r.id === routeId);
    setRouteData(data);
  };

  const fetchHouses = () => {
    const data = mockHouses.filter(h => h.route_id === routeId);
    setHouses(data);
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

  const handleHouseStatus = async (status) => {
    if (!selectedHouse) return;

    // Update local state
    const updatedHouses = houses.map(h => 
      h.id === selectedHouse.id ? { ...h, status } : h
    );
    setHouses(updatedHouses);
    hideHouseCard();

    // Check if route is complete
    const isComplete = updatedHouses.every(h => h.status !== 'pending');
    if (isComplete) {
      navigation.navigate('RouteComplete', { routeId });
    }
  };

  const getProgressPercentage = () => {
    if (!houses.length) return 0;
    const completed = houses.filter(h => h.status !== 'pending').length;
    return (completed / houses.length) * 100;
  };

  return (
    <View style={styles.container}>
      <Map
        houses={houses}
        onHousePress={house => {
          setSelectedHouse(house);
          showHouseCard();
        }}
        showStreetView={isNavigating}
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

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            if (location) {
              mapRef.current?.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              });
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#fff" />
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
                onPress={() => handleHouseStatus('collect')}
                disabled={selectedHouse.status !== 'pending'}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Collect</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => handleHouseStatus('skip')}
                disabled={selectedHouse.status !== 'pending'}
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