import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import * as Location from 'expo-location';
import Map from '../components/Map';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Papa from 'papaparse';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import KeyboardAwareView from '../components/KeyboardAwareView';

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoicmVhZ2Fuc3RvY2siLCJhIjoiY204eHZ1bTQzMDdzOTJrcHRuY2l3em05NiJ9.yMm1TND_J6jZpYJlYmfhyQ";

// Simple coordinate mapping for Wylie, TX and surrounding areas
const CITY_COORDINATES = {
  'dallas': { lat: 32.7767, lng: -96.7970 },
  'plano': { lat: 33.0198, lng: -96.6989 },
  'wylie': { lat: 33.0151, lng: -96.5388 },
  'murphy': { lat: 33.0185, lng: -96.6131 },
  'sachse': { lat: 32.9787, lng: -96.5986 },
};

const parseCSV = (content) => {
  const lines = content.split('\n');
  const headers = lines[0].toLowerCase().split(',');
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map((line) => {
      const values = line.split(',');
      const house = {};
      headers.forEach((header, index) => {
        house[header.trim()] = values[index]?.trim();
      });
      return house;
    })
    .filter(house => house.address && house.city && house.state && house.zip);
};

const geocodeAddress = async (address) => {
  try {
    console.log(`[Mapbox Geocode] Attempting to geocode: "${address}"`);
    
    // Format the address to ensure it's URL-friendly
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    console.log(`[Mapbox Geocode] Making request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`[Mapbox Geocode] Response status: ${response.status}`);
    
    if (data.features && data.features.length > 0) {
      // Mapbox returns coordinates as [longitude, latitude]
      const [longitude, latitude] = data.features[0].center;
      
      console.log(`[Mapbox Geocode] Success for "${address}". Found at (${latitude}, ${longitude})`);
      
      return {
        lat: latitude.toString(),
        lng: longitude.toString(),
      };
    } else {
      console.warn(`[Mapbox Geocode] Failed for "${address}". No results found in response:`, JSON.stringify(data));
      return null;
    }
  } catch (error) {
    console.error('[Mapbox Geocode] Error:', error);
    return null;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'collect':
      return '#6B7280'; // grey
    case 'skip':
      return '#EF4444'; // red
    case 'new customer':
      return '#10B981'; // green
    case 'error':
      return '#EF4444'; // red for errors
    case 'pending':
    default:
      return '#3B82F6'; // blue
  }
};

const parseAddressList = (text) => {
  // Split by newlines and filter empty lines
  const addresses = text.split('\n')
    .map(line => line.trim())
    .filter(line => line);

  return addresses.map(address => {
    // Split by commas and trim each part
    const parts = address.split(',').map(part => part.trim());
    
    // Revert to expecting at least 4 parts: Street, City, State, Zip
    if (parts.length < 4) { 
      return {
        address,
        isValid: false,
        error: 'Invalid format. Required: Street, City, State, Zip'
      };
    }

    // Revert extraction to separate City, State
    const street = parts[0];
    const city = parts[1];
    const state = parts[2];
    const zip = parts[3];
    // Status is the 5th part (index 4), notes start from 6th (index 5)
    const statusPart = parts.length > 4 ? parts[4] : 'collect';
    const notes = parts.length > 5 ? parts.slice(5).join(', ').trim() : '';

    // Basic validation
    if (!street || street.length < 3) {
      return {
        address,
        isValid: false,
        error: 'Invalid street address'
      };
    }

    if (!city || city.length < 2) { // Revert city check
      return {
        address,
        isValid: false,
        error: 'Invalid City'
      };
    }
    
    // Re-add State check
    if (!state || state.length !== 2) {
      return {
        address,
        isValid: false,
        error: 'State should be 2 letters (e.g., TX)'
      };
    }

    if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) {
      return {
        address,
        isValid: false,
        error: 'Invalid ZIP code'
      };
    }

    // Process status explicitly
    const status = processHouseStatus(statusPart);
    console.log("Final status for", address, ":", status);

    return {
      address: `${street}, ${city}, ${state} ${zip}`,
      status: status,
      notes: notes,
      isValid: true,
      lat: null,
      lng: null
    };
  });
};

const processHouseStatus = (status) => {
  // Convert status to lowercase and trim
  const normalizedStatus = status ? status.toLowerCase().trim() : 'collect';
  
  console.log("Processing status:", status, "->", normalizedStatus);
  
  // Check if it's one of our valid statuses
  if (['skip', 'collect', 'new customer', 'pending'].includes(normalizedStatus)) {
    return normalizedStatus;
  }
  
  // Handle legacy or incorrect statuses
  switch (normalizedStatus) {
    case 'new':
      return 'new customer';
    case 'completed':
      return 'collect';
    case 'skipped':
      return 'skip';
    default:
      return 'collect';
  }
};

const RouteCreateScreen = React.forwardRef(({ isEditing = false, existingRoute = null, hideHeader = false, onRouteChange }, ref) => {
  const router = useRouter();
  const { user } = useAuth();
  const { driver_id, reusing, route_id } = useLocalSearchParams();
  const [name, setName] = useState(existingRoute?.name || '');
  const [date, setDate] = useState(existingRoute?.date ? new Date(existingRoute.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(driver_id || existingRoute?.driver_id || user?.id);
  const [uploading, setUploading] = useState(false);
  const [houses, setHouses] = useState(existingRoute?.houses || []);
  const [addressInput, setAddressInput] = useState('');
  const isAdmin = user?.user_metadata?.role === 'admin';
  const isOwner = user?.user_metadata?.role === 'owner';
  const [notes, setNotes] = useState(existingRoute?.notes || '');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loadingReusedRoute, setLoadingReusedRoute] = useState(!!reusing);
  
  // Scheduling options
  const [repeatFrequency, setRepeatFrequency] = useState('none');
  const [endDate, setEndDate] = useState(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showSchedulingOptions, setShowSchedulingOptions] = useState(false);

  // Add these new state variables for editing house data
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHouseIndex, setEditingHouseIndex] = useState(null);
  const [editingHouseAddress, setEditingHouseAddress] = useState('');
  const [editingHouseStatus, setEditingHouseStatus] = useState('');
  const [editingHouseNotes, setEditingHouseNotes] = useState('');

  useEffect(() => {
    fetchDrivers();
    // Check if this is the first time opening the screen
    checkFirstTimeUser();
    
    // If reusing a route, load its data
    if (reusing === 'true' && route_id) {
      loadReusedRoute(route_id);
    }
  }, [reusing, route_id]);

  const checkFirstTimeUser = async () => {
    try {
      const firstTimeKey = 'hasSeenRouteCreateInfo';
      const { data, error } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user?.id)
        .eq('key', firstTimeKey)
        .single();

      if (error || !data) {
        // Show the info modal for first-time users
        setShowInfoModal(true);
        // Save that user has seen the info
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user?.id,
            key: firstTimeKey,
            value: 'true'
          });
      }
    } catch (error) {
      console.error('Error checking first-time user:', error);
      // Show modal anyway if we can't verify
      setShowInfoModal(true);
    }
  };

  useEffect(() => {
    if (driver_id) {
      setSelectedDriver(driver_id);
    }
  }, [driver_id]);

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      console.log("Fetching drivers...");
      
      // Get the user's team ID - first try user.team_id, then fall back to profile
      let teamId = null;
      if (user?.team_id) {
        teamId = user.team_id;
      } else if (user?.profile?.team_id) {
        teamId = user.profile.team_id;
      }
      
      console.log("Current user team ID:", teamId);
      
      if (!teamId) {
        console.error("No team ID found for current user");
        setDrivers([]);
        return;
      }
      
      // Get active users with driver or admin role specifically in this team
      const { data, error } = await supabase
        .rpc('get_active_drivers', { team_id_param: teamId });
      
      // Backup query if RPC isn't available or fails
      if (error || !data) {
        console.log("RPC function failed or not available, using direct query:", error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('role', ['driver', 'admin', 'owner'])
          .eq('status', 'active')
          .eq('team_id', teamId);
        
        if (fallbackError) {
          console.error('Error fetching drivers:', fallbackError);
          setDrivers([]);
          return;
        }
        
        setDrivers(fallbackData || []);
        console.log(`Fetched ${fallbackData?.length || 0} drivers from direct query`);
      } else {
        setDrivers(data);
        console.log(`Fetched ${data.length} drivers from RPC`);
      }
    } catch (error) {
      console.error('Error in fetchDrivers:', error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddressPaste = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Error', 'Please enter at least one address');
      return;
    }

    try {
      setUploading(true);
      const newHousesInput = parseAddressList(addressInput);
      const successfullyGeocodedHouses = [];
      const failedAddresses = [];

      // Geocode each address using Mapbox
      for (const houseInput of newHousesInput) {
        if (!houseInput.isValid) {
          console.warn(`Skipping invalid address format: ${houseInput.address} (${houseInput.error})`);
          failedAddresses.push(`${houseInput.address} - ${houseInput.error}`);
          continue; // Skip invalidly formatted addresses
        }
        
        console.log(`Processing address: ${houseInput.address}`);
        
        // Add a slight delay between geocoding requests to avoid rate limits
        if (successfullyGeocodedHouses.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const coords = await geocodeAddress(houseInput.address);
        
        if (coords && coords.lat && coords.lng) {
          successfullyGeocodedHouses.push({
            ...houseInput,
            lat: coords.lat,
            lng: coords.lng,
          });
          console.log(`Successfully geocoded: ${houseInput.address} to ${coords.lat},${coords.lng}`);
        } else {
          console.warn(`Failed to geocode: ${houseInput.address}`);
          failedAddresses.push(houseInput.address);
        }
      }

      if (successfullyGeocodedHouses.length > 0) {
        setHouses(prevHouses => [...prevHouses, ...successfullyGeocodedHouses]);
        console.log(`Added ${successfullyGeocodedHouses.length} houses to the list`);
      }
      
      setAddressInput(''); // Clear input after adding

      if (failedAddresses.length > 0) {
        const message = failedAddresses.length === 1 
          ? `Failed to geocode: ${failedAddresses[0]}`
          : `Failed to geocode ${failedAddresses.length} addresses. The first failure was: ${failedAddresses[0]}`;
        
        Alert.alert('Geocoding Issues', message, [
          { text: 'OK' },
          { 
            text: 'Show All Failures', 
            onPress: () => Alert.alert('Failed Addresses', failedAddresses.join('\n\n'))
          }
        ]);
      }

    } catch (error) {
      console.error('Error processing addresses:', error);
      Alert.alert('Error', `Failed to process addresses: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCSV = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (result.type === 'success') {
        const fileContent = await FileSystem.readAsStringAsync(result.uri);
        const parsedHouses = parseCSV(fileContent);
        const successfullyGeocodedHouses = [];
        const failedAddresses = [];

        // Geocode each address using Mapbox
        for (const houseInput of parsedHouses) {
          console.log(`Processing address: ${houseInput.address}`);
          
          // Add a slight delay between geocoding requests to avoid rate limits
          if (successfullyGeocodedHouses.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const coords = await geocodeAddress(`${houseInput.address}, ${houseInput.city}, ${houseInput.state} ${houseInput.zip}`);
          
          if (coords && coords.lat && coords.lng) {
            successfullyGeocodedHouses.push({
              address: `${houseInput.address}, ${houseInput.city}, ${houseInput.state} ${houseInput.zip}`,
              status: processHouseStatus(houseInput.status),
              notes: houseInput.notes,
              lat: coords.lat,
              lng: coords.lng,
            });
            console.log(`Successfully geocoded: ${houseInput.address} to ${coords.lat},${coords.lng}`);
          } else {
            console.warn(`Failed to geocode: ${houseInput.address}`);
            failedAddresses.push(houseInput.address);
          }
        }

        if (successfullyGeocodedHouses.length > 0) {
          setHouses(prevHouses => [...prevHouses, ...successfullyGeocodedHouses]);
          console.log(`Added ${successfullyGeocodedHouses.length} houses to the list`);
          Alert.alert('Success', `Successfully imported ${successfullyGeocodedHouses.length} houses from CSV`);
        }
        
        if (failedAddresses.length > 0) {
          const message = failedAddresses.length === 1 
            ? `Failed to geocode: ${failedAddresses[0]}`
            : `Failed to geocode ${failedAddresses.length} addresses. The first failure was: ${failedAddresses[0]}`;
          
          Alert.alert('Geocoding Issues', message, [
            { text: 'OK' },
            { 
              text: 'Show All Failures', 
              onPress: () => Alert.alert('Failed Addresses', failedAddresses.join('\n\n'))
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      Alert.alert('Error', 'Failed to upload CSV file');
    } finally {
      setUploading(false);
    }
  };

  const removeHouse = (index) => {
    setHouses(prevHouses => prevHouses.filter((_, i) => i !== index));
  };

  const handleCreateRoute = async () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a route name.');
      return;
    }
    if (!selectedDriver) {
      Alert.alert('Error', 'Please select a driver.');
      return;
    }
    if (houses.length === 0) {
      Alert.alert('Error', 'Please add at least one house to the route.');
      return;
    }
    if (repeatFrequency !== 'none' && !endDate) {
      Alert.alert('Error', 'Please select an end date for recurring routes.');
      return;
    }

    // Get team_id from the logged-in user context
    let teamId = null;
    if (user?.team_id) {
      teamId = user.team_id;
    } else if (user?.profile?.team_id) {
      teamId = user.profile.team_id;
    }

    if (!teamId) {
       Alert.alert('Error', 'Could not determine your team. Please ensure you are assigned to a team.');
       console.error('User object missing team_id:', user);
       return; // Stop if team_id is missing
    }

    // Verify that the selected driver belongs to the same team
    const driverInTeam = drivers.some(driver => driver.id === selectedDriver);
    if (!driverInTeam) {
      Alert.alert('Error', 'The selected driver does not belong to your team.');
      return;
    }

    try {
      setUploading(true);

      if (repeatFrequency === 'none') {
        // Standard single route creation
        await createSingleRoute();
      } else {
        // Create recurring routes
        await createRecurringRoutes();
      }

      Alert.alert('Success', 'Route(s) created successfully');
      router.replace('/(tabs)'); // Use replace to prevent going back to create screen 
    } catch (error) {
      // Log the full error object
      console.error('Error in handleCreateRoute:', error);
      // Display a more informative error message
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while creating the route.';
      Alert.alert('Error Creating Route', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const createSingleRoute = async () => {
      // Format date in local timezone to prevent timezone offset issues
      // Get YYYY-MM-DD format in local timezone
      const localDate = new Date(date);
      // Add one day to compensate for timezone issue
      localDate.setDate(localDate.getDate() + 1);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

    // Get team ID
    let teamId = user?.team_id || user?.profile?.team_id;

      // Create route first
      console.log('Creating route with data:', {
         name: name.trim(),
         date: dateString, // Local date string with compensation for timezone
         driver_id: selectedDriver,
         status: 'pending',
         total_houses: houses.length,
         completed_houses: 0,
      team_id: teamId,
      notes: notes.trim()
      });
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: name.trim(),
        date: dateString,
          driver_id: selectedDriver,
          status: 'pending',
          total_houses: houses.length,
          completed_houses: 0,
        team_id: teamId,
        notes: notes.trim()
        })
      .select('id')
        .single();

      if (routeError) {
          console.error('Supabase route insert error:', routeError);
      throw new Error(`Database error creating route: ${routeError.message}`);
      }
      
      if (!route || !route.id) {
          throw new Error('Failed to get route ID after insert.');
      }

    await insertHousesForRoute(route.id);
  };

  const createRecurringRoutes = async () => {
    // Calculate all dates between start and end based on frequency
    const routeDates = getAllRouteDates();
    
    if (routeDates.length === 0) {
      throw new Error('No valid dates found for recurring routes');
    }
    
    console.log(`Creating ${routeDates.length} recurring routes`);
    
    // Get team ID
    let teamId = user?.team_id || user?.profile?.team_id;
    
    // Create base route data without specific dates
    const baseRouteData = routeDates.map(routeDate => {
      // Format each date in YYYY-MM-DD format
      const year = routeDate.getFullYear();
      const month = String(routeDate.getMonth() + 1).padStart(2, '0');
      const day = String(routeDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      return {
        name: name.trim(),
        date: dateString,
        driver_id: selectedDriver,
        status: 'pending',
        total_houses: houses.length,
        completed_houses: 0,
        team_id: teamId,
        notes: notes.trim()
      };
    });
    
    // Create all routes
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .insert(baseRouteData)
      .select('id');
      
    if (routesError) {
      console.error('Supabase routes insert error:', routesError);
      throw new Error(`Database error creating recurring routes: ${routesError.message}`);
    }
    
    if (!routes || routes.length === 0) {
      throw new Error('Failed to create recurring routes');
    }
    
    // Insert houses for each route
    for (const route of routes) {
      await insertHousesForRoute(route.id);
    }
  };
  
  const insertHousesForRoute = async (routeId) => {
      // Process houses data
    const housesData = houses.map((house) => ({
      route_id: routeId,
        address: house.address,
        status: processHouseStatus(house.status),
        notes: house.notes,
        is_new_customer: house.status === 'new customer' || house.status === 'new',
        lat: house.lat,
        lng: house.lng
      }));
      
    console.log(`Inserting ${housesData.length} houses for route ${routeId}`);

      // Insert houses
      const { error: housesError } = await supabase
        .from('houses')
        .insert(housesData);

      if (housesError) {
          console.error('Supabase houses insert error:', housesError);
      throw new Error(`Database error adding houses: ${housesError.message}`);
    }
  };
  
  const getAllRouteDates = () => {
    const dates = [];
    let currentDate = new Date(date);
    const endDateTime = endDate ? endDate.getTime() : null;
    
    // Safety check - limit to 100 routes max
    const MAX_ROUTES = 100;
    
    while ((!endDateTime || currentDate.getTime() <= endDateTime) && dates.length < MAX_ROUTES) {
      dates.push(new Date(currentDate));
      
      // Advance date based on frequency
      switch (repeatFrequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          return dates; // Safety for unexpected frequency
      }
    }
    
    return dates;
  };

  const loadReusedRoute = async (routeId) => {
    try {
      setLoadingReusedRoute(true);
      console.log("Loading route to reuse:", routeId);
      
      // Fetch the route and its houses
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          *,
          houses:houses(*)
        `)
        .eq('id', routeId)
        .single();
      
      if (routeError) {
        console.error('Error loading route to reuse:', routeError);
        Alert.alert('Error', 'Failed to load route data for reuse');
        return;
      }
      
      if (!routeData) {
        Alert.alert('Error', 'Route not found');
        return;
      }
      
      // Use the existing route name with "Copy" appended
      setName(`${routeData.name} (Copy)`);
      
      // Use the driver from the original route
      setSelectedDriver(routeData.driver_id || user?.id);
      
      // Keep any notes
      setNotes(routeData.notes || '');
      
      // Add houses but reset their status to 'pending'
      if (routeData.houses && routeData.houses.length > 0) {
        const reusedHouses = routeData.houses.map(house => ({
          address: house.address,
          lat: house.lat,
          lng: house.lng,
          status: house.is_new_customer ? 'new customer' : 'pending', // Keep new customer status but reset others
          notes: house.notes || '',
          sequence: house.sequence,
          priority: house.priority || 0
        }));
        
        setHouses(reusedHouses);
      }
      
      console.log(`Loaded ${routeData.houses?.length || 0} houses from route ${routeId} for reuse`);
    } catch (error) {
      console.error('Error in loadReusedRoute:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading the route');
    } finally {
      setLoadingReusedRoute(false);
    }
  };

  const openEditHouseModal = (index) => {
    const house = houses[index];
    setEditingHouseIndex(index);
    setEditingHouseAddress(house.address);
    setEditingHouseStatus(house.status || 'collect');
    setEditingHouseNotes(house.notes || '');
    setEditModalVisible(true);
  };

  const saveHouseEdits = () => {
    if (editingHouseIndex === null) return;
    
    const updatedHouses = [...houses];
    updatedHouses[editingHouseIndex] = {
      ...updatedHouses[editingHouseIndex],
      status: editingHouseStatus,
      notes: editingHouseNotes
    };
    
    setHouses(updatedHouses);
    setEditModalVisible(false);
    setEditingHouseIndex(null);
  };

  // Expose route data to parent
  React.useImperativeHandle(ref, () => ({
    getRouteData: () => {
      if (!name || !selectedDriver || houses.length === 0) {
        return null;
      }

      return {
        name,
        date,
        driver_id: selectedDriver,
        houses: houses.map(house => ({
          address: house.address,
          lat: house.lat,
          lng: house.lng,
          status: house.status || 'collect',
          notes: house.notes || '',
          is_new_customer: house.status === 'new customer' || false,
          estimated_time: house.estimated_time || 5.00,
          priority: house.priority || 0
        })),
        notes: notes || ''
      };
    }
  }));

  // Notify parent of changes
  React.useEffect(() => {
    if (onRouteChange) {
      const hasChanges = 
        name !== (existingRoute?.name || '') ||
        selectedDriver !== (existingRoute?.driver_id || '') ||
        houses.length !== (existingRoute?.total_houses || 0) ||
        notes !== (existingRoute?.notes || '');
      
      if (hasChanges) {
        onRouteChange();
      }
    }
  }, [name, selectedDriver, houses, notes, existingRoute, onRouteChange]);

  // Add this right after the removeHouse function
  const getStatusOptions = () => [
    { value: 'collect', label: 'Collect', color: '#6B7280' },
    { value: 'skip', label: 'Skip', color: '#EF4444' },
    { value: 'new customer', label: 'New Customer', color: '#10B981' },
    { value: 'collect', label: 'Collect', color: '#3B82F6' }
  ];

  return (
    <KeyboardAwareView
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      bounces={false}
    >
        {!hideHeader && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
                onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            </View>
            
            <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Route' : (reusing === 'true' ? 'Reuse Route' : 'Create Route')}
            </Text>
            </View>
            
            <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[
                  styles.saveButton,
                  (!name || !selectedDriver || houses.length === 0) && styles.saveButtonDisabled
              ]}
              onPress={handleCreateRoute}
                disabled={!name || !selectedDriver || houses.length === 0 || uploading || loadingReusedRoute}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                  <Text style={styles.saveButtonText}>
                  {isEditing ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView 
          style={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {loadingReusedRoute ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading route data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Route Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter route name"
                placeholderTextColor="#6B7280"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
                style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
                <Text style={styles.dateButtonText}>
                {date.toLocaleDateString()}
              </Text>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                  minimumDate={new Date()}
              />
            )}
          </View>
          
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Driver</Text>
              {drivers.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.driverList}
                >
                  {drivers.map(driver => (
                    <TouchableOpacity
                      key={driver.id}
                      style={[
                        styles.driverCard,
                        selectedDriver === driver.id && styles.driverCardSelected
                      ]}
                      onPress={() => setSelectedDriver(driver.id)}
                    >
                      {driver.avatar_url ? (
                        <Image
                          source={{ uri: driver.avatar_url }}
                          style={styles.driverAvatar}
                        />
                      ) : (
                        <View style={styles.driverAvatar}>
                          <Text style={styles.driverInitials}>
                            {driver.full_name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.driverName}>{driver.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noDriversContainer}>
                  <Text style={styles.noDriversText}>
                    No drivers available in your team. Add team members in the Team section.
                  </Text>
                  <TouchableOpacity 
                    style={styles.addTeamMemberButton}
                    onPress={() => router.navigate('/(tabs)/team')}
                  >
                    <Ionicons name="people-outline" size={16} color="#fff" />
                    <Text style={styles.addTeamMemberButtonText}>Go to Team</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Route Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter notes about this route here"
              placeholderTextColor="#6B7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Add Addresses</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.importButton}
                onPress={handleUploadCSV}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={20} color="#fff" />
                    <Text style={styles.importButtonText}>Upload CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.addressInputWrapper}>
              <Text style={styles.inputLabel}>Enter addresses below (one per line)</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="123 Main St, Dallas, TX, 75201, skip/collect/new customer, notes"
                placeholderTextColor="#6B7280"
                value={addressInput}
                onChangeText={setAddressInput}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !addressInput.trim() && styles.addButtonDisabled
                ]}
                onPress={handleAddressPaste}
                disabled={!addressInput.trim() || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add Addresses</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Format: address, city, state, zip, status, notes{'\n'}
                Status can be: collect, skip, or new customer
              </Text>
            </View>

            {houses.length > 0 && (
              <>
                  <Text style={[styles.inputLabel, {marginTop: 24}]}>Route Preview</Text>
                <View style={styles.mapContainer}>
                  <Map 
                    houses={houses}
                    onHousePress={(house) => {
                      Alert.alert(
                        house.address,
                        house.notes || 'No additional notes',
                        [{ text: 'OK' }]
                      );
                    }}
                    style={styles.map}
                      screenContext="routeCreate"
                  />
                </View>
              </>
            )}

            {houses.length > 0 && (
              <View style={styles.houseListContainer}>
                <Text style={styles.listTitle}>Added Addresses ({houses.length})</Text>
                {houses.map((house, index) => (
                  <View key={`house-${index}`} style={styles.houseItem}>
                    <View style={styles.houseItemContent}>
                      <Text style={styles.houseAddress}>{house.address}</Text>
                      {house.notes && (
                        <Text style={styles.houseNotes}>{house.notes}</Text>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(house.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(house.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(house.status) }]}>
                          {house.status?.charAt(0).toUpperCase() + house.status?.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.houseItemActions}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => openEditHouseModal(index)}
                      >
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.actionButtonGradient}
                        >
                          <Ionicons name="create-outline" size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                      onPress={() => removeHouse(index)}
                    >
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          style={styles.actionButtonGradient}
                        >
                          <Ionicons name="trash-outline" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
          </>
        )}
        </ScrollView>

      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <KeyboardAwareView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{flex: 1}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>How to Create a Route</Text>
                <TouchableOpacity 
                  onPress={() => setShowInfoModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalSubtitle}>Address Format</Text>
                <Text style={styles.modalText}>
                  Enter addresses in the following format:
                </Text>
                <Text style={styles.codeExample}>
                  address, city, state, zip, status, notes
                </Text>
                
                <Text style={styles.modalSubtitle}>Status Options:</Text>
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#6B7280' }]} />
                  <Text style={styles.statusItemText}>collect - Regular collection (default)</Text>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.statusItemText}>skip - Skip this house</Text>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.statusItemText}>new customer - New customer</Text>
                </View>

                <Text style={styles.modalSubtitle}>CSV Import Format</Text>
                <Text style={styles.modalText}>
                  Create a CSV file like this example:
                </Text>
                <View style={styles.csvExampleContainer}>
                  <View style={styles.csvRow}>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>address</Text>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>city</Text>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>state</Text>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>zip</Text>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>status</Text>
                    <Text style={[styles.csvCell, styles.csvHeaderCell]}>notes</Text>
                  </View>
                  <View style={[styles.csvRow, styles.csvDataRow]}>
                    <Text style={styles.csvCell}>123 Main St</Text>
                    <Text style={styles.csvCell}>Dallas</Text>
                    <Text style={styles.csvCell}>TX</Text>
                    <Text style={styles.csvCell}>75201</Text>
                    <Text style={[styles.csvCell, styles.csvSkipCell]}>skip</Text>
                    <Text style={styles.csvCell}>Customer away</Text>
                  </View>
                  <View style={[styles.csvRow, styles.csvDataRow]}>
                    <Text style={styles.csvCell}>456 Center Rd</Text>
                    <Text style={styles.csvCell}>Plano</Text>
                    <Text style={styles.csvCell}>TX</Text>
                    <Text style={styles.csvCell}>75023</Text>
                    <Text style={[styles.csvCell, styles.csvCollectCell]}>collect</Text>
                    <Text style={styles.csvCell}>Regular pickup</Text>
                  </View>
                  <View style={[styles.csvRow, styles.csvDataRow, styles.csvLastRow]}>
                    <Text style={styles.csvCell}>789 Oak Ave</Text>
                    <Text style={styles.csvCell}>Wylie</Text>
                    <Text style={styles.csvCell}>TX</Text>
                    <Text style={styles.csvCell}>75098</Text>
                    <Text style={[styles.csvCell, styles.csvNewCell]}>new customer</Text>
                    <Text style={styles.csvCell}>First service</Text>
                  </View>
                </View>

                <Text style={styles.modalText}>
                  Important:
                </Text>
                <Text style={styles.tipText}>• Create in Excel/Google Sheets and export as CSV</Text>
                <Text style={styles.tipText}>• All addresses are automatically geocoded</Text>
                <Text style={styles.tipText}>• Valid status values: collect, skip, new customer</Text>

                <Text style={styles.modalSubtitle}>Tips:</Text>
                <Text style={styles.tipText}>• You can add multiple addresses by entering one per line</Text>
                <Text style={styles.tipText}>• Status and notes are optional</Text>
                <Text style={styles.tipText}>• You'll receive notifications when approaching houses</Text>
                <Text style={styles.tipText}>• Special notifications appear for skipped houses or new customers</Text>
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.modalButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareView>
      </Modal>

      {/* Add this Edit House Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.editModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Address</Text>
                  <TouchableOpacity 
                    onPress={() => setEditModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.editModalBody}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <Text style={styles.editingAddressText}>{editingHouseAddress}</Text>

                  <Text style={[styles.inputLabel, {marginTop: 16}]}>Status</Text>
                  <View style={styles.statusOptionsContainer}>
                    {getStatusOptions().map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusOption,
                          editingHouseStatus === option.value && {
                            backgroundColor: `${option.color}40`,
                            borderColor: option.color
                          }
                        ]}
                        onPress={() => setEditingHouseStatus(option.value)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                        <Text 
                          style={[
                            styles.statusOptionText,
                            editingHouseStatus === option.value && { color: option.color, fontWeight: '600' }
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.inputLabel, {marginTop: 16}]}>Notes</Text>
                  <TextInput
                    style={styles.editNotesInput}
                    placeholder="Add notes about this address"
                    placeholderTextColor="#6B7280"
                    value={editingHouseNotes}
                    onChangeText={setEditingHouseNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </ScrollView>

                <View style={styles.editModalFooter}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveEditButton}
                    onPress={saveHouseEdits}
                  >
                    <Text style={styles.saveEditButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAwareView>
  );
});

export default RouteCreateScreen;

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
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#374151',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 12,
  },
  driverList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  driverCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 100,
  },
  driverCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#2C5282',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  driverInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  driverName: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  importButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  addressInputWrapper: {
    marginTop: 8,
  },
  addressInput: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  mapContainer: {
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  houseListContainer: {
    marginTop: 24,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  houseItem: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  houseItemContent: {
    flex: 1,
    marginRight: 12,
  },
  houseAddress: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  houseNotes: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  houseItemActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  actionButtonGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 8,
  },
  codeExample: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#D1D5DB',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusItemText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  tipText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 6,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noDriversContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  noDriversText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  addTeamMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  addTeamMemberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  editModalBody: {
    padding: 16,
    maxHeight: 400,
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  editingAddressText: {
    color: '#D1D5DB',
    fontSize: 15,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
  },
  statusOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: '48%',
  },
  statusOptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginLeft: 6,
  },
  editNotesInput: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cancelButton: {
    backgroundColor: '#4B5563',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveEditButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  saveEditButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  csvExampleContainer: {
    backgroundColor: '#2D3748',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  csvRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  csvCell: {
    color: '#E5E7EB',
    flex: 1,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  csvHeaderCell: {
    fontWeight: 'bold',
    color: '#60A5FA',
    fontSize: 13,
  },
  csvDataRow: {
    marginTop: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  csvLastRow: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  csvSkipCell: {
    color: '#EF4444',
    fontWeight: '500',
  },
  csvCollectCell: {
    color: '#6B7280',
    fontWeight: '500',
  },
  csvNewCell: {
    color: '#10B981',
    fontWeight: '500',
  },
});