import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Animated, Alert, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Custom map style for dark mode
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#263c3f" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9a76" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f2835" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2f3948" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

// Default to Wylie, TX coordinates
const DEFAULT_REGION = {
  latitude: 33.0151,
  longitude: -96.5388,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

// Custom marker component with animation
const AnimatedMarker = memo(({ house, isActive, onPress, isNextHouse, isPreviousHouse }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isActive || isNextHouse) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isActive, isNextHouse]);
  
  const lat = parseFloat(house.lat);
  const lng = parseFloat(house.lng);
  if (isNaN(lat) || isNaN(lng)) return null;
  
  let markerColor = '#6B7280'; // default gray
  
  if (isActive) {
    markerColor = '#3B82F6'; // blue for active
  } else if (isNextHouse) {
    markerColor = '#F59E0B'; // orange for next
  } else if (isPreviousHouse) {
    markerColor = '#8B5CF6'; // purple for previous
  } else if (house.status?.toLowerCase() === 'completed') {
    markerColor = '#10B981'; // green for completed
  } else if (house.status?.toLowerCase() === 'skipped') {
    markerColor = '#EF4444'; // red for skipped
  }
  
  return (
    <Marker
      coordinate={{
        latitude: lat,
        longitude: lng
      }}
      onPress={() => onPress?.(house)}
    >
      <Animated.View style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim
      }}>
        <View style={[
          styles.customMarker,
          { backgroundColor: markerColor },
          (isActive || isNextHouse) && styles.highlightedMarker
        ]}>
          <Text style={styles.markerText}>{house.sequence || ''}</Text>
        </View>
        {(isActive || isNextHouse) && (
          <View style={styles.markerPointer} />
        )}
      </Animated.View>
    </Marker>
  );
});

const Map = React.forwardRef(({ 
  houses = [], 
  onHousePress, 
  showStreetView = false,
  selectedRoute = null,
  initialRegion = null,
  onMapReady = () => {},
  requestLocationPermission,
  style,
  activeHouseId,
  onActiveHouseChange,
  screenContext = 'default'
}, ref) => {
  const mapRef = useRef(null);
  const { location } = useLocation();
  const [mapType, setMapType] = useState('standard');
  const [mapReady, setMapReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeHouseIndex, setActiveHouseIndex] = useState(-1);
  const [showDirections, setShowDirections] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [userHeading, setUserHeading] = useState(0);
  const [followUser, setFollowUser] = useState(false);
  const [processedHouses, setProcessedHouses] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  
  // Get screen dimensions for responsive layout
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = SCREEN_WIDTH < 360;
  
  // Process houses when they change
  useEffect(() => {
    if (!houses || houses.length === 0) {
      setProcessedHouses([]);
      return;
    }
    
    const processed = houses.map((house, index) => ({
      ...house,
      sequence: house.sequence || (index + 1)
    })).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    setProcessedHouses(processed);
  }, [houses]);
  
  // Calculate route path for polyline
  useEffect(() => {
    if (!showDirections || !processedHouses || processedHouses.length === 0) {
      setRoutePath([]);
      return;
    }
    
    const path = optimizedRoute.length > 0 
      ? optimizedRoute 
      : processedHouses.map(house => ({
          latitude: parseFloat(house.lat),
          longitude: parseFloat(house.lng)
        })).filter(coord => !isNaN(coord.latitude) && !isNaN(coord.longitude));
        
    setRoutePath(path);
  }, [processedHouses, showDirections, optimizedRoute]);

  // Get currently active, next, and previous houses
  const activeHouse = activeHouseIndex >= 0 && activeHouseIndex < processedHouses.length 
    ? processedHouses[activeHouseIndex] 
    : null;
    
  const nextHouse = activeHouseIndex >= 0 && activeHouseIndex < processedHouses.length - 1 
    ? processedHouses[activeHouseIndex + 1] 
    : null;
    
  const previousHouse = activeHouseIndex > 0 
    ? processedHouses[activeHouseIndex - 1] 
    : null;

  // Initialize the map and watch position
  useEffect(() => {
    let isMounted = true;
    let watchId = null;
    
    const initializeMap = async () => {
      if (!mapReady) return;
      
      try {
        // Start watching user's location with high accuracy
        watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 5000, // Or every 5 seconds
          },
          (newLocation) => {
            if (!isMounted) return;
            
            // Update heading
            if (newLocation.coords.heading) {
              setUserHeading(newLocation.coords.heading);
            }
            
            // If following user, animate to new position
            if (followUser && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005
              }, 500);
            }
          }
        );
        
        // Initial region setup
        if (processedHouses.length > 0) {
          fitMapToMarkers();
        } else if (initialRegion) {
          mapRef.current?.animateToRegion(initialRegion, 500);
        } else if (location?.coords) {
          mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }, 500);
        }
      } catch (error) {
        console.log('Map initialization error:', error);
      }
      
      // Notify parent that map is ready
      onMapReady();
    };
    
    initializeMap();
    
    return () => {
      isMounted = false;
      if (watchId) {
        watchId.remove();
      }
    };
  }, [mapReady, location, initialRegion, followUser]);
  
  // Update only when route changes (prevent constant re-rendering)
  useEffect(() => {
    if (!mapReady || !selectedRoute || processedHouses.length === 0) return;
    
    fitMapToMarkers();
    // Set the first un-completed house as active
    const firstUncompletedIndex = processedHouses.findIndex(
      h => h.status?.toLowerCase() !== 'completed'
    );
    setActiveHouseIndex(firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0);
  }, [selectedRoute, mapReady, processedHouses]);

  // Fit map to show all markers
  const fitMapToMarkers = useCallback(() => {
    if (!mapRef.current || processedHouses.length === 0) return;
    
    try {
      const validHouses = processedHouses.filter(
        h => !isNaN(parseFloat(h.lat)) && !isNaN(parseFloat(h.lng))
      );
      
      if (validHouses.length === 0) return;
      
      const coordinates = validHouses.map(h => ({
        latitude: parseFloat(h.lat),
        longitude: parseFloat(h.lng)
      }));
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true
      });
    } catch (error) {
      console.log('Error fitting to markers:', error);
    }
  }, [processedHouses]);

  // Move to the next house
  const goToNextHouse = useCallback(() => {
    if (activeHouseIndex < processedHouses.length - 1) {
      const newIndex = activeHouseIndex + 1;
      setActiveHouseIndex(newIndex);
      
      const house = processedHouses[newIndex];
      if (house && mapRef.current) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          
          mapRef.current.animateToRegion({
            latitude: parseFloat(house.lat),
            longitude: parseFloat(house.lng),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          }, 1000);
          
          // Don't navigate away from map when moving to next house
          // Just send house data to parent for display purposes
          if (onHousePress) {
            // Call with second parameter to indicate internal navigation (no route push)
            onHousePress(house, true);
          }
        } catch (error) {
          console.log('Error navigating to next house:', error);
        }
      }
    } else {
      // Alert if this is the last house
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Route Complete", 
          "You've reached the last house on this route!",
          [{ text: "OK" }]
        );
      } catch (error) {
        console.log('Alert error:', error);
      }
    }
  }, [activeHouseIndex, processedHouses, onHousePress]);

  // Move to the previous house
  const goToPreviousHouse = useCallback(() => {
    if (activeHouseIndex > 0) {
      const newIndex = activeHouseIndex - 1;
      setActiveHouseIndex(newIndex);
      
      const house = processedHouses[newIndex];
      if (house && mapRef.current) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          mapRef.current.animateToRegion({
            latitude: parseFloat(house.lat),
            longitude: parseFloat(house.lng),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          }, 1000);
          
          // Don't navigate away from map when moving to previous house
          // Just send house data to parent for display purposes
          if (onHousePress) {
            // Call with second parameter to indicate internal navigation (no route push)
            onHousePress(house, true);
          }
        } catch (error) {
          console.log('Error navigating to previous house:', error);
        }
      }
    }
  }, [activeHouseIndex, processedHouses, onHousePress]);

  // Handle map ready event
  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  // Toggle map type (standard/satellite)
  const toggleMapType = useCallback(() => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptic error:', error);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptic error:', error);
    }
  }, []);

  // Toggle route path visibility
  const toggleRoutePath = useCallback(() => {
    setShowDirections(prev => !prev);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptic error:', error);
    }
  }, []);

  // Toggle follow user mode
  const toggleFollowUser = useCallback(async () => {
    try {
      let permissionGranted = true;
      
      // If requestLocationPermission is provided, use it
      if (typeof requestLocationPermission === 'function') {
        permissionGranted = await requestLocationPermission();
      } 
      // Otherwise request permission directly
      else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionGranted = status === 'granted';
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location permission is needed to track your position on the map and optimize your route.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
      
      if (!permissionGranted) {
        return;
      }
      
      // Toggle follow mode
      const newFollowMode = !followUser;
      setFollowUser(newFollowMode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (newFollowMode) {
        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        if (currentLocation && mapRef.current) {
          // Animate to user's location with appropriate zoom level
          mapRef.current.animateToRegion({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.005,  // Close zoom for navigation
            longitudeDelta: 0.005
          }, 1000);
        }
      }
    } catch (error) {
      console.log('Error toggling follow mode:', error);
      Alert.alert('Error', 'Could not access your location');
    }
  }, [followUser, requestLocationPermission]);

  // Handle marker press - set as active but don't navigate away from map
  const handleMarkerPress = useCallback((house) => {
    const index = processedHouses.findIndex(h => h.id === house.id);
    if (index !== -1) {
      setActiveHouseIndex(index);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Zoom to the selected house
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: parseFloat(house.lat),
            longitude: parseFloat(house.lng),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          }, 1000);
        }
        
        // Just pass the house to parent but don't navigate
        if (onHousePress) {
          onHousePress(house);
        }
      } catch (error) {
        console.log('Error on marker press:', error);
      }
    }
  }, [processedHouses, onHousePress]);

  // Return to overview of all stops
  const handleOverview = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      fitMapToMarkers();
      setFollowUser(false);
    } catch (error) {
      console.log('Error returning to overview:', error);
    }
  }, [fitMapToMarkers]);

  // Get the appropriate control style based on screenContext
  const getControlStyle = useCallback(() => {
    let baseStyle;
    let smallScreenStyle;
    
    switch(screenContext) {
      case 'routeCreate':
        baseStyle = styles.routeCreateControls;
        smallScreenStyle = styles.routeCreateControlsSmall;
        break;
      case 'completedRoute':
        baseStyle = styles.completedRouteControls;
        smallScreenStyle = styles.completedRouteControlsSmall;
        break;
      default:
        baseStyle = styles.controls;
        smallScreenStyle = styles.controlsSmall;
    }
    
    // Apply small screen styles if needed
    if (isSmallScreen) {
      return [baseStyle, smallScreenStyle];
    }
    
    return baseStyle;
  }, [screenContext, isSmallScreen]);

  // Forward the ref to the internal mapRef
  useEffect(() => {
    if (ref) {
      ref.current = mapRef.current;
    }
  }, [ref]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={true}
        pitchEnabled={true}
        initialRegion={DEFAULT_REGION}
        onMapReady={handleMapReady}
        zoomEnabled={true}
        zoomControlEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor="#3B82F6"
        loadingBackgroundColor="#0F172A"
      >
        {processedHouses.map((house, index) => (
          <AnimatedMarker
            key={house.id || `${house.lat}-${house.lng}-${index}`}
            house={house}
            isActive={index === activeHouseIndex}
            isNextHouse={index === activeHouseIndex + 1}
            isPreviousHouse={index === activeHouseIndex - 1}
            onPress={handleMarkerPress}
          />
        ))}
        
        {showDirections && routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeWidth={4}
            strokeColor="rgba(59, 130, 246, 0.8)"
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Navigation Controls */}
      {processedHouses.length > 0 && (
        <View style={styles.navigationControls}>
          <BlurView intensity={80} style={[styles.navigationPanel, isSmallScreen && styles.navigationPanelSmall]}>
            <TouchableOpacity 
              style={[styles.navButton, activeHouseIndex <= 0 && styles.navButtonDisabled]}
              onPress={goToPreviousHouse}
              disabled={activeHouseIndex <= 0}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.navStatusContainer}>
              <Text style={styles.navStatusText}>
                {activeHouseIndex + 1} of {processedHouses.length}
              </Text>
              {activeHouse?.address && (
                <Text style={styles.navAddressText} numberOfLines={1}>
                  {activeHouse.address}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[
                styles.navButton, 
                styles.navButtonNext,
                activeHouseIndex >= processedHouses.length - 1 && styles.navButtonDisabled
              ]}
              onPress={goToNextHouse}
              disabled={activeHouseIndex >= processedHouses.length - 1}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      {/* Map Controls */}
      <View style={getControlStyle()}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleMapType}
        >
          <Ionicons 
            name={mapType === 'standard' ? 'earth' : 'map'} 
            size={28} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleOverview}
        >
          <Ionicons name="expand-outline" size={28} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, followUser && styles.activeControlButton]}
          onPress={toggleFollowUser}
        >
          <Ionicons name="locate-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  highlightedMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -4,
    alignSelf: 'center',
    transform: [{ rotate: '180deg' }]
  },
  controls: {
    position: 'absolute',
    top: 160,
    bottom: 'auto',
    right: 12,
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeControlButton: {
    backgroundColor: '#3B82F6',
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  streetViewButton: {
    backgroundColor: '#3B82F6',
  },
  navigationControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navigationPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 50,
    padding: 8,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 10,
  },
  navButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  navButtonNext: {
    backgroundColor: 'rgba(16, 185, 129, 0.7)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
    opacity: 0.6,
  },
  navStatusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navStatusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  navAddressText: {
    color: '#F3F4F6',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
    maxWidth: '90%',
  },
  controlsSmall: {
    top: 130,
    bottom: 'auto',
    right: 10,
    gap: 8,
  },
  routeCreateControls: {
    position: 'absolute',
    top: 80, // Higher position for RouteCreateScreen
    bottom: 'auto',
    right: 12,
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  completedRouteControls: {
    position: 'absolute',
    top: 100, // Different position for CompletedRouteDetailsScreen
    bottom: 'auto',
    right: 12,
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  routeCreateControlsSmall: {
    top: 60,
    bottom: 'auto',
    right: 10,
    gap: 8,
  },
  completedRouteControlsSmall: {
    top: 80,
    bottom: 'auto',
    right: 10,
    gap: 8,
  },
  navigationPanelSmall: {
    width: '95%',
    padding: 4,
  },
});

export default Map; 