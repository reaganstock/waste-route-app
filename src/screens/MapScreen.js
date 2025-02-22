import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Map from '../components/Map';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'skip':
      return '#EF4444'; // Red
    case 'new customer':
      return '#10B981'; // Green
    case 'collect':
      return '#6B7280'; // Grey
    case 'pending':
    default:
      return '#3B82F6'; // Blue
  }
};

const MapScreen = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { location } = useLocation();

  useEffect(() => {
    fetchAllRoutes();
  }, []);

  const fetchAllRoutes = async () => {
    try {
      setLoading(true);
      
      // Fetch all active and upcoming routes with their houses
      const { data: routesData, error: routesError } = await supabase
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
            route_id
          )
        `)
        .in('status', ['pending', 'in_progress']);

      if (routesError) throw routesError;

      setRoutes(routesData || []);
      
      // Combine all houses from all routes
      const allHouses = routesData?.reduce((acc, route) => {
        const housesWithRoute = route.houses.map(house => ({
          ...house,
          route_name: route.name,
          route_status: route.status
        }));
        return [...acc, ...housesWithRoute];
      }, []);

      setHouses(allHouses || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      Alert.alert('Error', 'Failed to load routes and houses');
    } finally {
      setLoading(false);
    }
  };

  const handleHousePress = (house) => {
    Alert.alert(
      house.address,
      `Route: ${house.route_name}\nStatus: ${house.status}${house.notes ? `\nNotes: ${house.notes}` : ''}`,
      [
        { 
          text: 'View Route',
          onPress: () => navigation.navigate('Route', { routeId: house.route_id })
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Map
        houses={houses}
        onHousePress={handleHousePress}
        showStreetView={false}
        markerColors={getStatusColor}
        initialRegion={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        } : undefined}
      />

      {/* Top Navigation Bar */}
      <BlurView intensity={80} style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>All Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

      {loading && (
        <BlurView intensity={80} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </BlurView>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});

export default MapScreen; 