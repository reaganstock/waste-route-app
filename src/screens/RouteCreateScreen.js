import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import Map from '../components/Map';
import { mockTeamMembers } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';

// Google OAuth2 credentials - you'll need to replace these with your own
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_REDIRECT_URI = 'YOUR_REDIRECT_URI';

// Simple coordinate mapping for Wylie, TX and surrounding areas
const CITY_COORDINATES = {
  'wylie': { lat: 33.0151, lng: -96.5388 },
  'murphy': { lat: 33.0185, lng: -96.6131 },
  'sachse': { lat: 32.9787, lng: -96.5986 },
  'plano': { lat: 33.0198, lng: -96.6989 },
  'dallas': { lat: 32.7767, lng: -96.7970 },
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
    .filter(house => house.address && house.lat && house.lng);
};

const geocodeAddress = async (address) => {
  try {
    // Parse the address to get city
    const parts = address.split(',').map(part => part.trim().toLowerCase());
    const city = parts[1]; // Assuming format: "street, city, state, zip"
    
    // Get base coordinates for the city, default to Wylie if city not found
    const baseCoords = CITY_COORDINATES[city] || CITY_COORDINATES['wylie'];
    
    // Add small random offset to spread out pins within the city
    // This creates a more realistic distribution of addresses
    const latOffset = (Math.random() - 0.5) * 0.02; // About 1-2 miles
    const lngOffset = (Math.random() - 0.5) * 0.02;
    
    return {
      lat: (baseCoords.lat + latOffset).toString(),
      lng: (baseCoords.lng + lngOffset).toString(),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Default to Wylie center coordinates if parsing fails
    return {
      lat: '33.0151',
      lng: '-96.5388',
    };
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
    case 'pending':
    default:
      return '#3B82F6'; // blue
  }
};

const AddressCard = ({ house, onRemove }) => (
  <View style={[styles.addressCard, { borderLeftColor: getStatusColor(house.status) }]}>
    <View style={styles.addressContent}>
      <Text style={styles.addressText}>{house.address}</Text>
      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(house.status)}20` }]}>
        <Text style={[styles.statusText, { color: getStatusColor(house.status) }]}>
          {house.status}
        </Text>
      </View>
      {house.notes && (
        <Text style={styles.notesText}>{house.notes}</Text>
      )}
    </View>
    <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
      <Ionicons name="close-circle" size={24} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

const parseAddressList = (text) => {
  // Split by newlines and filter empty lines
  const addresses = text.split('\n')
    .map(line => line.trim())
    .filter(line => line);

  return addresses.map(address => {
    // Split by commas and trim each part
    const parts = address.split(',').map(part => part.trim());
    
    // Need at least address, city, state, zip
    if (parts.length < 4) return null;

    // Format: "123 Address, City, State, Zip Code, status, notes"
    const [street, city, state, zip, status = 'pending', ...noteParts] = parts;
    const notes = noteParts.join(',').trim(); // Join remaining parts as notes

    return {
      address: `${street}, ${city}, ${state} ${zip}`,
      status: processHouseStatus(status),
      notes: notes,
      lat: null,
      lng: null
    };
  }).filter(Boolean);
};

const parseGoogleSheetData = (values) => {
  // Skip header row and filter out empty rows
  return values.slice(1)
    .filter(row => row.length > 0)
    .map(row => ({
      address: row[0] || '',
      lat: row[1] || '',
      lng: row[2] || '',
      notes: row[3] || ''
    }))
    .filter(house => house.address && house.lat && house.lng);
};

const processHouseStatus = (status) => {
  // Convert status to lowercase and trim
  const normalizedStatus = status?.toLowerCase().trim();
  
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
      return 'pending';
  }
};

const RouteCreateScreen = React.forwardRef(({ isEditing = false, existingRoute = null, hideHeader = false, onRouteChange }, ref) => {
  const router = useRouter();
  const { user } = useAuth();
  const { driver } = useLocalSearchParams();
  const [name, setName] = useState(existingRoute?.name || '');
  const [date, setDate] = useState(existingRoute?.date ? new Date(existingRoute.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(driver || null);
  const [uploading, setUploading] = useState(false);
  const [houses, setHouses] = useState(existingRoute?.houses || []);
  const [addressInput, setAddressInput] = useState('');
  const [isLoadingGoogleSheet, setIsLoadingGoogleSheet] = useState(false);
  const isAdmin = user?.user_metadata?.role === 'admin';
  const [notes, setNotes] = useState(existingRoute?.notes || '');

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (driver) {
      setSelectedDriver(driver);
    }
  }, [driver]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .in('role', ['driver', 'admin'])
        .eq('status', 'active');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      Alert.alert('Error', 'Failed to load drivers');
    }
  };

  const handleAddressPaste = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Error', 'Please enter at least one address');
      return;
    }

    try {
      setUploading(true);
      const newHouses = parseAddressList(addressInput);
      
      // Geocode each address
      const geocodedHouses = await Promise.all(
        newHouses.map(async (house) => {
          const coords = await geocodeAddress(house.address);
          return {
            ...house,
            lat: coords.lat,
            lng: coords.lng,
          };
        })
      );

      setHouses(prevHouses => [...prevHouses, ...geocodedHouses]);
      setAddressInput(''); // Clear input after adding
    } catch (error) {
      console.error('Error processing addresses:', error);
      Alert.alert('Error', 'Failed to process addresses. Please check the format.');
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
        setHouses(prevHouses => [...prevHouses, ...parsedHouses]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload CSV file');
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleSheetImport = async () => {
    try {
      setIsLoadingGoogleSheet(true);
      
      // Construct Google OAuth2 URL
      const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets.readonly');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=token&scope=${scope}`;
      
      // Open web browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_REDIRECT_URI);
      
      if (result.type === 'success') {
        // Extract access token from URL
        const accessToken = result.url.match(/access_token=([^&]*)/)[1];
        
        // Show sheet picker (you'll need to implement this UI)
        const sheetId = await new Promise((resolve) => {
          Alert.prompt(
            'Enter Sheet ID',
            'Please enter the Google Sheet ID',
            [
              {
                text: 'Cancel',
                onPress: () => resolve(null),
                style: 'cancel',
              },
              {
                text: 'OK',
                onPress: (sheetId) => resolve(sheetId),
              },
            ],
            'plain-text'
          );
        });

        if (!sheetId) return;

        // Fetch sheet data
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:D`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = await response.json();
        
        if (data.values) {
          const parsedHouses = parseGoogleSheetData(data.values);
          setHouses(prevHouses => [...prevHouses, ...parsedHouses]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import from Google Sheets');
      console.error(error);
    } finally {
      setIsLoadingGoogleSheet(false);
    }
  };

  const removeHouse = (index) => {
    setHouses(prevHouses => prevHouses.filter((_, i) => i !== index));
  };

  const handleCreateRoute = async () => {
    try {
      setUploading(true);

      // Create route first
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: name.trim(),
          date: date.toISOString(),
          driver_id: selectedDriver,
          status: 'pending',
          start_time: new Date().toISOString(),
          total_houses: houses.length,
          completed_houses: 0
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Process houses data with proper status handling
      const housesData = houses.map(house => ({
        route_id: route.id,
        address: house.address,
        status: processHouseStatus(house.status),
        notes: house.notes,
        is_new_customer: house.status === 'new customer' || house.status === 'new',
        lat: house.lat,
        lng: house.lng
      }));

      // Insert houses
      const { error: housesError } = await supabase
        .from('houses')
        .insert(housesData);

      if (housesError) throw housesError;

      Alert.alert('Success', 'Route created successfully');
      router.push('/');
    } catch (error) {
      console.error('Error creating route:', error);
      Alert.alert('Error', 'Failed to create route');
    } finally {
      setUploading(false);
    }
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
          status: 'pending',
          notes: '',
          is_new_customer: house.status === 'new' || false,
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

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Route' : 'Create Route'}
          </Text>
          <TouchableOpacity 
            style={[
              styles.createButton, 
              (!name || !selectedDriver || houses.length === 0) && styles.createButtonDisabled
            ]}
            onPress={handleCreateRoute}
            disabled={!name || !selectedDriver || houses.length === 0 || uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>
                {isEditing ? 'Save' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Route Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="map-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Route Name"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />
          </View>

          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.dateText}>
              {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}

          {isAdmin && (
            <View style={styles.driverSection}>
              <Text style={styles.sectionSubtitle}>Assign Driver</Text>
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
            </View>
          )}
        </View>

        {/* Houses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Houses</Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleGoogleSheetImport}
                disabled={isLoadingGoogleSheet}
              >
                {isLoadingGoogleSheet ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#3B82F6" />
                    <Text style={styles.uploadButtonText}>Import Sheet</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleUploadCSV}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#3B82F6" />
                    <Text style={styles.uploadButtonText}>Upload CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.addressInputContainer}>
            <TextInput
              style={styles.addressInput}
              placeholder="Paste addresses here (one per line)"
              placeholderTextColor="#6B7280"
              value={addressInput}
              onChangeText={setAddressInput}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[
                styles.pasteButton,
                !addressInput.trim() && styles.pasteButtonDisabled
              ]}
              onPress={handleAddressPaste}
              disabled={!addressInput.trim()}
            >
              <Text style={styles.pasteButtonText}>Add Addresses</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            CSV format: address,lat,lng,notes{'\n'}
            Or simply paste addresses, one per line
          </Text>

          {houses.length > 0 && (
            <>
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
                />
              </View>

              <View style={styles.housesList}>
                {houses.map((house, index) => (
                  <AddressCard key={`house-${index}`} house={house} onRemove={() => removeHouse(index)} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
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
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 16,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  driverSection: {
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 12,
  },
  driverList: {
    flexDirection: 'row',
  },
  driverCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  driverCardSelected: {
    borderColor: '#3B82F6',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  driverInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  driverName: {
    color: '#fff',
    fontSize: 14,
  },
  mapContainer: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  housesList: {
    gap: 12,
  },
  addressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 6,
    padding: 8,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
  },
  addressContent: {
    flex: 1,
    gap: 2,
  },
  addressText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    lineHeight: 12,
  },
  notesText: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 14,
  },
  removeButton: {
    marginLeft: 8,
    padding: 2,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  uploadButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressInputContainer: {
    marginBottom: 16,
  },
  addressInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  pasteButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  pasteButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  pasteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
}); 