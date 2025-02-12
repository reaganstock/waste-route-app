import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

const MetricCard = ({ icon, title, value, borderColor, infoText }) => (
  <TouchableOpacity 
    style={[styles.metricCard, { borderColor }]}
    onPress={() => infoText && Alert.alert(title, infoText)}
    activeOpacity={0.7}
  >
    <View style={styles.metricHeader}>
      <View style={[styles.metricIcon, { backgroundColor: `${borderColor}20` }]}>
        <Ionicons name={icon} size={24} color={borderColor} />
      </View>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </TouchableOpacity>
);

const AddressItem = ({ house }) => (
  <View style={styles.addressItem}>
    <View style={styles.addressHeader}>
      <View style={[
        styles.statusBadge,
        { backgroundColor: getStatusColor(house.status) }
      ]}>
        <Text style={styles.statusText}>{formatStatus(house.status)}</Text>
      </View>
      {house.is_new_customer && (
        <View style={[styles.statusBadge, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.statusText}>New Customer</Text>
        </View>
      )}
    </View>
    <Text style={styles.addressText}>{house.address}</Text>
    {house.notes && (
      <Text style={styles.notesContent}>{house.notes}</Text>
    )}
  </View>
);

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'skip':
      return '#EF4444'; // Red
    case 'collect':
      return '#6B7280'; // Grey
    case 'pending':
      return '#3B82F6'; // Blue
    case 'new customer':
      return '#10B981'; // Green
    default:
      return '#6B7280'; // Grey as default
  }
};

const formatStatus = (status) => {
  return status?.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const CompletedRouteDetailsScreen = ({ routeId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(null);

  useEffect(() => {
    fetchRouteDetails();
  }, [routeId]);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          *,
          houses (
            id,
            address,
            status,
            notes,
            is_new_customer,
            lat,
            lng
          ),
          driver:profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', routeId)
        .single();

      if (routeError) throw routeError;
      setRoute(routeData);
    } catch (error) {
      console.error('Error fetching route details:', error);
      Alert.alert('Error', 'Failed to load route details');
    } finally {
      setLoading(false);
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
      <View style={styles.container}>
        <Text style={styles.errorText}>Route not found</Text>
      </View>
    );
  }

  const completionRate = Math.round((route.completed_houses / route.total_houses) * 100);
  const collectedHouses = route.houses?.filter(h => h.status === 'collect').length || 0;
  const specialHouses = route.houses?.filter(h => h.status === 'skip' || h.status === 'new customer').length || 0;
  const binsPerHour = route.duration ? Math.round(collectedHouses / route.duration) : 0;

  // Add initial region calculation
  const getInitialRegion = () => {
    if (!route?.houses?.length) return null;

    const lats = route.houses.map(h => parseFloat(h.lat));
    const lngs = route.houses.map(h => parseFloat(h.lng));
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate deltas to show all markers with padding
    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.0922),
      longitudeDelta: Math.max(lngDelta, 0.0421),
    };
  };

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
        <Text style={styles.headerTitle}>Route Details</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <ScrollView style={styles.content}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeDate}>
            {new Date(route.date).toLocaleDateString()}
          </Text>
          {route.driver && (
            <View style={styles.driverInfo}>
              <View style={[styles.driverAvatar, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.driverInitials}>
                  {route.driver.full_name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <Text style={styles.driverName}>{route.driver.full_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="home-outline"
            title="Total Houses"
            value={route.total_houses}
            borderColor="#6B7280"
            infoText="Total number of houses assigned to this route"
          />
          <MetricCard
            icon="checkmark-circle-outline"
            title="Houses Collected"
            value={collectedHouses}
            borderColor="#10B981"
            infoText="Number of houses successfully serviced on this route"
          />
          <MetricCard
            icon="alert-circle-outline"
            title="Special Houses"
            value={specialHouses}
            borderColor="#8B5CF6"
            infoText="Houses that were either skipped or marked as new customers"
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="pie-chart-outline"
            title="Efficiency"
            value={`${completionRate}%`}
            borderColor="#3B82F6"
            infoText="Percentage of total houses that were successfully collected"
          />
          <MetricCard
            icon="time-outline"
            title="Duration"
            value={route.duration || 0}
            borderColor="#F59E0B"
            infoText="Total number of hours spent on this route"
          />
          <MetricCard
            icon="speedometer-outline"
            title="Houses/Hr"
            value={binsPerHour}
            borderColor="#EF4444"
            infoText="Average number of houses serviced per hour"
          />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={getInitialRegion()}
            mapType="mutedStandard"
          >
            {route.houses?.map((house) => (
              <Marker
                key={house.id}
                coordinate={{
                  latitude: parseFloat(house.lat),
                  longitude: parseFloat(house.lng),
                }}
                title={house.address}
                description={house.notes || (house.is_new_customer ? 'New Customer' : '')}
                pinColor={getStatusColor(house.status)}
              />
            ))}
          </MapView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          {route.houses?.map((house) => (
            <AddressItem key={house.id} house={house} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
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
  routeInfo: {
    padding: 20,
  },
  routeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  routeDate: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  metricHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  addressItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  addressText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  notesContent: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  mapContainer: {
    margin: 20,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default CompletedRouteDetailsScreen; 