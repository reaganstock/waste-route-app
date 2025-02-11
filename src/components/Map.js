import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default to Wylie, TX coordinates
const DEFAULT_REGION = {
  latitude: 33.0151,
  longitude: -96.5388,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const Map = ({ houses = [], onHousePress, showStreetView = false }) => {
  const mapRef = useRef(null);
  const { location } = useLocation();
  const [mapType, setMapType] = useState('standard');

  useEffect(() => {
    if (houses.length > 0) {
      // Calculate the center point of all houses
      const lats = houses.map(h => parseFloat(h.lat));
      const lngs = houses.map(h => parseFloat(h.lng));
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      // Calculate the bounds to fit all markers
      const maxLat = Math.max(...lats);
      const minLat = Math.min(...lats);
      const maxLng = Math.max(...lngs);
      const minLng = Math.min(...lngs);

      const newRegion = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, LATITUDE_DELTA),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, LONGITUDE_DELTA),
      };

      mapRef.current?.animateToRegion(newRegion, 1000);
    } else if (location?.coords) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  }, [location, houses]);

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  const getMarkerColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'skip':
      case 'skipped':
        return '#EF4444'; // Red
      case 'collect':
      case 'completed':
        return '#10B981'; // Green
      case 'new customer':
        return '#3B82F6'; // Blue
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
        initialRegion={DEFAULT_REGION}
      >
        {houses?.map((house) => {
          const lat = parseFloat(house.lat);
          const lng = parseFloat(house.lng);
          if (isNaN(lat) || isNaN(lng)) return null;
          
          return (
            <Marker
              key={house.id || `${house.lat}-${house.lng}`}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              pinColor={getMarkerColor(house.status)}
              onPress={() => onHousePress?.(house)}
            />
          );
        })}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleMapType}
        >
          <Ionicons 
            name={mapType === 'standard' ? 'map' : 'map-outline'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>

        {showStreetView && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.streetViewButton]}
            onPress={() => {/* Implement street view toggle */}}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    top: 120,
    right: 20,
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#1F2937',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  streetViewButton: {
    backgroundColor: '#3B82F6',
  },
});

export default Map; 