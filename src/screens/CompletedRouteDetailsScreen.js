import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mockRoutes } from '../lib/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

const MetricCard = ({ icon, title, value, subtitle, color, showInfo, infoText }) => (
  <View style={[styles.metricCard, { borderColor: color }]}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {showInfo && (
        <TouchableOpacity 
          onPress={() => Alert.alert(title, infoText)}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle" size={20} color={color} />
        </TouchableOpacity>
      )}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </View>
);

const AddressItem = ({ house }) => (
  <View style={styles.addressItem}>
    <View style={styles.addressHeader}>
      <View style={[
        styles.statusBadge,
        { backgroundColor: getStatusColor(house.status) }
      ]}>
        <Text style={styles.statusText}>{house.status}</Text>
      </View>
      {house.isNewCustomer && (
        <View style={[styles.statusBadge, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.statusText}>New Customer</Text>
        </View>
      )}
      {house.notes && (
        <View style={styles.notesBadge}>
          <Ionicons name="document-text" size={12} color="#3B82F6" />
          <Text style={styles.notesText}>Has Notes</Text>
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
    case 'completed':
    case 'collect':
      return '#10B981';
    case 'skipped':
    case 'skip':
      return '#F59E0B';
    case 'failed':
      return '#EF4444';
    case 'new':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
};

const CompletedRouteDetailsScreen = ({ routeId }) => {
  const router = useRouter();
  const route = mockRoutes.find(r => r.id === routeId);

  if (!route) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Route not found</Text>
      </View>
    );
  }

  const completionRate = Math.round((route.completed_houses / route.houses.length) * 100);
  const duration = route.duration || '2.5'; // hours
  const collectedHouses = route.houses.filter(h => h.status === 'collect' || h.status === 'completed').length;
  const specialHouses = route.houses.filter(h => h.notes || h.isNewCustomer).length;
  const binsPerHour = Math.round(collectedHouses / parseFloat(duration));

  const initialRegion = {
    latitude: parseFloat(route.houses[0]?.lat || '37.7749'),
    longitude: parseFloat(route.houses[0]?.lng || '-122.4194'),
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
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
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="home"
            title="Total Houses"
            value={route.houses.length}
            color="#6B7280"
          />
          <MetricCard
            icon="checkmark-circle"
            title="Collected Houses"
            value={collectedHouses}
            color="#10B981"
          />
          <MetricCard
            icon="alert-circle"
            title="Special Houses"
            value={specialHouses}
            color="#8B5CF6"
            showInfo
            infoText="Houses with special notes or new customers that required additional attention"
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="stats-chart"
            title="Efficiency"
            value={`${completionRate}%`}
            color="#3B82F6"
          />
          <MetricCard
            icon="time"
            title="Duration"
            value={duration}
            subtitle="hours"
            color="#F59E0B"
          />
          <MetricCard
            icon="speedometer"
            title="Bins/Hour"
            value={binsPerHour}
            color="#EF4444"
          />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={initialRegion}
          >
            {route.houses.map((house, index) => (
              <Marker
                key={house.id}
                coordinate={{
                  latitude: parseFloat(house.lat),
                  longitude: parseFloat(house.lng),
                }}
                title={house.address}
                description={house.notes || (house.isNewCustomer ? 'New Customer' : '')}
              />
            ))}
          </MapView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          {route.houses.map((house) => (
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
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  metricSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  mapContainer: {
    margin: 20,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
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
  notesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notesText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
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
  metricHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
});

export default CompletedRouteDetailsScreen; 