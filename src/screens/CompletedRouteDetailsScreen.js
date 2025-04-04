import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import Map from '../components/Map';

const { width } = Dimensions.get('window');

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'collect':
      return '#6B7280'; // grey
    case 'skipped':
    case 'skip':
      return '#EF4444'; // red
    case 'new customer':
      return '#10B981'; // green
    default:
      return '#3B82F6'; // blue for pending/other
  }
};

const CompletedRouteDetailsScreen = () => {
  const router = useRouter();
  const { id: routeId } = useLocalSearchParams();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [showAllHouses, setShowAllHouses] = useState(false);

  useEffect(() => {
    fetchRouteDetails();
  }, [routeId]);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      
      if (!routeId) {
        Alert.alert("Error", "Route ID is missing");
        return;
      }
      
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          houses:houses(*)
        `)
        .eq('id', routeId)
        .single();
      
      if (error) {
        console.error('Error fetching route details:', error);
        Alert.alert('Error', 'Failed to load route details');
        return;
      }
      
      // Process houses to ensure they have proper status format
      if (data.houses) {
        data.houses = data.houses.map(house => ({
          ...house,
          status: house.status || 'pending'
        }));
      }
      
      setRoute(data);
    } catch (error) {
      console.error('Error in fetchRouteDetails:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReuseRoute = () => {
    Alert.alert(
      "Reuse Route",
      "Would you like to reuse this route for a future date?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          onPress: () => {
            router.push({
              pathname: '/routes/create',
              params: { 
                reusing: 'true',
                route_id: routeId
              }
            });
          }
        }
      ]
    );
  };

  const handleHousePress = (house) => {
    setSelectedHouse(house);
  };

  const handleToggleHouseView = () => {
    setShowAllHouses(!showAllHouses);
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

  const completionRate = route.total_houses > 0 
    ? Math.round((route.completed_houses / route.total_houses) * 100) 
    : 0;
  
  const collectHouses = route.houses?.filter(h => h.status?.toLowerCase() === 'completed' || h.status?.toLowerCase() === 'collect').length || 0;
  const skippedHouses = route.houses?.filter(h => h.status?.toLowerCase() === 'skipped' || h.status?.toLowerCase() === 'skip').length || 0;
  const newCustomerHouses = route.houses?.filter(h => h.status?.toLowerCase() === 'new customer').length || 0;

  // Filter houses for display on the map based on the toggle
  const housesToDisplay = !showAllHouses 
    ? route.houses 
    : route.houses?.filter(h => 
        h.status?.toLowerCase() === 'completed' || 
        h.status?.toLowerCase() === 'collect' ||
        h.status?.toLowerCase() === 'new customer'
      );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#121212', '#000000']}
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
        <TouchableOpacity 
          onPress={handleReuseRoute}
          style={styles.reuseButton}
        >
          <Ionicons name="repeat" size={22} color="#10B981" />
        </TouchableOpacity>
      </BlurView>

      <View style={styles.mapContainer}>
        <Map
          houses={housesToDisplay || []}
          onHousePress={handleHousePress}
          style={styles.map}
          screenContext="completedRoute"
        />
        
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleToggleHouseView}
          >
            <Ionicons 
              name={showAllHouses ? "eye-outline" : "filter-outline"} 
              size={22} 
              color="#fff" 
            />
            <Text style={styles.mapControlText}>
              {showAllHouses ? "All Houses" : "Collected Only"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeInfoCard}>
          <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeDate}>
              {new Date(route.date).toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
          </Text>
        </View>

        <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
                <Ionicons name="home" size={24} color="#3B82F6" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{route.total_houses || 0}</Text>
                <Text style={styles.metricLabel}>Total Houses</Text>
              </View>
            </View>
            
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, {backgroundColor: 'rgba(107, 114, 128, 0.15)'}]}>
                <Ionicons name="checkmark-circle" size={24} color="#6B7280" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{collectHouses}</Text>
                <Text style={styles.metricLabel}>Collected</Text>
              </View>
            </View>
        </View>

        <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, {backgroundColor: 'rgba(239, 68, 68, 0.15)'}]}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{skippedHouses}</Text>
                <Text style={styles.metricLabel}>Skipped</Text>
              </View>
        </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, {backgroundColor: 'rgba(16, 185, 129, 0.15)'}]}>
                <Ionicons name="person-add" size={24} color="#10B981" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{newCustomerHouses}</Text>
                <Text style={styles.metricLabel}>New Customers</Text>
              </View>
            </View>
          </View>

          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Completion</Text>
              <Text style={styles.completionValue}>{completionRate}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${completionRate}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.housesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Houses</Text>
          </View>

          {housesToDisplay && housesToDisplay.length > 0 ? (
            housesToDisplay.map((house) => (
              <TouchableOpacity 
                key={house.id} 
                style={styles.houseItem}
                onPress={() => handleHousePress(house)}
              >
                <View style={styles.houseItemContent}>
                  <Text style={styles.addressText}>{house.address}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(house.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {house.status?.toLowerCase() === 'completed' ? 'Collect' : 
                        house.status?.toLowerCase() === 'collect' ? 'Collect' : 
                        house.status?.toLowerCase() === 'skipped' ? 'Skip' : 
                        house.status?.toLowerCase() === 'skip' ? 'Skip' : 
                        house.status}
                    </Text>
                  </View>
                </View>
                {house.notes && (
                  <View style={styles.notesContainer}>
                    <Ionicons name="document-text-outline" size={14} color="#999" />
                    <Text style={styles.notesText}>{house.notes}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No houses to display</Text>
          )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  reuseButton: {
    padding: 8,
  },
  mapContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 5,
  },
  mapControlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mapControlText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  routeInfoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  routeHeader: {
    marginBottom: 24,
  },
  routeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 14,
    color: '#aaa',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 12,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  completionSection: {
    marginTop: 16,
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  completionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  housesContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  houseItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  houseItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addressText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  notesText: {
    fontSize: 13,
    color: '#aaa',
    marginLeft: 6,
    flex: 1,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
});

export default CompletedRouteDetailsScreen; 