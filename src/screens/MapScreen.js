import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Map from '../components/Map';
import { mockHouses } from '../lib/mockData';
import { useLocation } from '../hooks/useLocation';

const MapScreen = ({ navigation }) => {
  const [houses, setHouses] = useState([]);
  const { location } = useLocation();

  useEffect(() => {
    // Load all houses for the map view
    setHouses(mockHouses);
  }, []);

  const handleHousePress = (house) => {
    // Navigate to the route that contains this house
    navigation.navigate('Route', { routeId: house.route_id });
  };

  return (
    <View style={styles.container}>
      <Map
        houses={houses}
        onHousePress={handleHousePress}
        showStreetView={false}
      />

      {/* Top Navigation Bar */}
      <BlurView intensity={80} style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </BlurView>
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
});

export default MapScreen; 