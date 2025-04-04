import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Map from '../components/Map';
import { useLocation } from '../hooks/useLocation';
import { useRoutes } from '../hooks/useRoutes';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const RouteMapCard = ({ route, activeRouteId, onSelect }) => {
  const isActive = route.id === activeRouteId;
  
  const getStatusColor = () => {
    switch(route.status) {
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      default: return '#F59E0B';
    }
  };
  
  const getStatusName = () => {
    switch(route.status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Pending';
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.routeCard,
        isActive && styles.routeCardActive
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(route);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          isActive 
            ? ['rgba(59, 130, 246, 0.9)', 'rgba(37, 99, 235, 0.85)'] 
            : ['rgba(30, 41, 59, 0.75)', 'rgba(15, 23, 42, 0.7)']
        }
        style={styles.routeCardGradient}
      >
        <View style={styles.routeCardTopRow}>
          <Text style={styles.routeName} numberOfLines={1}>{route.name}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        </View>
        
        <View style={styles.routeCardBottomRow}>
          <View style={styles.routeStat}>
            <Ionicons name="location-outline" size={14} color="#94A3B8" />
            <Text style={styles.routeStatText}>{route.total_houses || 0} stops</Text>
          </View>
          
          <View style={styles.routeStat}>
            <Ionicons name="checkmark-outline" size={14} color="#94A3B8" />
            <Text style={styles.routeStatText}>
              {Math.round(((route.completed_houses || 0) / (route.total_houses || 1)) * 100)}%
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const MapScreen = ({ navigation }) => {
  const { location } = useLocation();
  const { routes, loading, error, fetchRoutes } = useRoutes();
  const { user } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [houses, setHouses] = useState([]);
  const [visibleHouses, setVisibleHouses] = useState([]);
  const [showRoutesPanel, setShowRoutesPanel] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const routesListRef = useRef(null);

  // Filter routes based on user role - only include active and upcoming routes
  const filteredRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return [];
    
    return routes.filter(route => {
      // Only show active (in_progress) and pending routes, not completed ones
      if (route.status === 'completed') return false;
      
      // Make sure the route has a valid status - must be either in_progress or pending
      if (route.status !== 'in_progress' && route.status !== 'pending') return false;
      
      const userRole = user?.user_metadata?.role || user?.profile?.role;
      // Owners and admins can see all routes from their team
      if (userRole === 'admin' || userRole === 'owner') {
        return true; // Already filtered by team_id in useRoutes hook
      }
      // Drivers can only see routes assigned to them
      return route.driver_id === user?.id;
    });
  }, [routes, user]);

  // Load houses for selected route or all visible routes
  useEffect(() => {
    const loadHouses = async () => {
      try {
        if (!mapReady) return; // Wait until map is ready
        
        if (selectedRoute) {
          // Show only houses from selected route
          const routeHouses = selectedRoute.houses || [];
          setHouses(routeHouses);
          setVisibleHouses(routeHouses);
        } else {
          // Show houses from all active and upcoming routes
          const allHouses = filteredRoutes.flatMap(route => route.houses || []);
          setHouses(allHouses);
          setVisibleHouses(allHouses);
        }
      } catch (error) {
        console.error('Error loading houses:', error);
      }
    };

    loadHouses();
  }, [selectedRoute, filteredRoutes, mapReady]);

  const handleSelectRoute = useCallback((route) => {
    if (selectedRoute && selectedRoute.id === route.id) {
      // Deselect if tapping the already selected route
      setSelectedRoute(null);
    } else {
      setSelectedRoute(route);
      
      // Find the index of the selected route to scroll to it
      const index = filteredRoutes.findIndex(r => r.id === route.id);
      if (index !== -1 && routesListRef.current) {
        routesListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5
        });
      }
    }
  }, [selectedRoute, filteredRoutes]);

  const handleHousePress = useCallback((house, internalNavigation = false) => {
    // If this is part of internal map navigation, don't navigate away from map
    if (internalNavigation) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    
    // Otherwise handle external navigation to route screen if needed
    if (house && house.route_id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('Route', { routeId: house.route_id });
    }
  }, [navigation]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  if (loading && !mapReady) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="map-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Could not load map data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRoutes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Map
        houses={visibleHouses}
        onHousePress={handleHousePress}
        showStreetView={false}
        selectedRoute={selectedRoute}
        initialRegion={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        } : undefined}
        onMapReady={handleMapReady}
      />

      {/* Top Navigation Bar */}
      <BlurView intensity={80} style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.navTitle}>
          {selectedRoute ? selectedRoute.name : 'All Routes'}
        </Text>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowRoutesPanel(!showRoutesPanel);
          }}
        >
          <Ionicons 
            name={showRoutesPanel ? "chevron-down" : "chevron-up"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </BlurView>
      
      {/* Routes Panel */}
      {showRoutesPanel && (
        <BlurView intensity={60} style={styles.routesPanel}>
          <View style={styles.routesPanelHeader}>
            <Text style={styles.routesPanelTitle}>Routes</Text>
            <Text style={styles.routesPanelSubtitle}>
              {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'} available
            </Text>
          </View>
          
          {filteredRoutes.length > 0 ? (
            <FlatList
              ref={routesListRef}
              data={filteredRoutes}
              renderItem={({ item }) => (
                <RouteMapCard 
                  route={item} 
                  activeRouteId={selectedRoute?.id}
                  onSelect={handleSelectRoute}
                />
              )}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routesList}
              onScrollToIndexFailed={() => {}}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          ) : (
            <View style={styles.emptyRoutesContainer}>
              <Ionicons name="map-outline" size={40} color="#64748B" />
              <Text style={styles.emptyRoutesText}>No active or upcoming routes</Text>
              <TouchableOpacity 
                style={styles.createRouteButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('CreateRoute');
                }}
              >
                <Text style={styles.createRouteButtonText}>Create Route</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      )}
      
      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Reset selection and view all routes
            setSelectedRoute(null);
          }}
        >
          <Ionicons name="layers-outline" size={24} color="#fff" />
        </TouchableOpacity>
        
        {selectedRoute && (
          <TouchableOpacity 
            style={[styles.mapControlButton, styles.mapControlButtonPrimary]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Route', { routeId: selectedRoute.id });
            }}
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
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  routesPanel: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 16,
  },
  routesPanelHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  routesPanelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routesPanelSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  routesList: {
    paddingHorizontal: 12,
  },
  routeCard: {
    width: 160,
    height: 90,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  routeCardActive: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  routeCardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  routeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  routeCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStatText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    alignItems: 'center',
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapControlButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyRoutesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyRoutesText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  createRouteButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createRouteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default memo(MapScreen); 