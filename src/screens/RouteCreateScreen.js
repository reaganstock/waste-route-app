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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Map from '../components/Map';
import { mockTeamMembers } from '../lib/mockData';

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

const parseAddressList = (text) => {
  // Split by newlines and filter empty lines
  const addresses = text.split('\n')
    .map(line => line.trim())
    .filter(line => line);

  // For demo purposes, generate random coordinates near San Francisco
  return addresses.map(address => ({
    address,
    // Generate coordinates within San Francisco area
    lat: (37.7749 + (Math.random() - 0.5) * 0.1).toString(),
    lng: (-122.4194 + (Math.random() - 0.5) * 0.1).toString(),
    notes: ''
  }));
};

const RouteCreateScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [houses, setHouses] = useState([]);
  const [addressInput, setAddressInput] = useState('');

  useEffect(() => {
    // Filter only drivers from mock team members
    const mockDrivers = mockTeamMembers.filter(member => member.role === 'driver');
    setDrivers(mockDrivers);
  }, []);

  const handleAddressPaste = () => {
    if (!addressInput.trim()) {
      Alert.alert('Error', 'Please enter at least one address');
      return;
    }

    const newHouses = parseAddressList(addressInput);
    setHouses(prevHouses => [...prevHouses, ...newHouses]);
    setAddressInput(''); // Clear input after adding
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

  const removeHouse = (index) => {
    setHouses(prevHouses => prevHouses.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name || !selectedDriver || houses.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would create the route in the database
      const newRoute = {
        id: Date.now().toString(),
        name,
        date,
        driver_id: selectedDriver,
        status: 'pending',
        houses: houses.map(house => ({
          ...house,
          status: 'pending',
        })),
      };

      // Navigate to the route details screen
      navigation.replace(`route/${newRoute.id}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Route</Text>
        <TouchableOpacity 
          style={[
            styles.createButton, 
            (!name || !selectedDriver || houses.length === 0) && styles.createButtonDisabled
          ]}
          onPress={handleCreate}
          disabled={!name || !selectedDriver || houses.length === 0}
        >
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

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
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>
                      {driver.full_name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <Text style={styles.driverName}>{driver.full_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Houses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Houses</Text>
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
                <Map houses={houses} />
              </View>

              <View style={styles.housesList}>
                {houses.map((house, index) => (
                  <View key={index} style={styles.houseItem}>
                    <View style={styles.houseItemContent}>
                      <Text style={styles.houseAddress}>{house.address}</Text>
                      {house.notes && (
                        <Text style={styles.houseNotes}>{house.notes}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeHouse(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#111',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
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
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  housesList: {
    gap: 12,
  },
  houseItem: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  houseItemContent: {
    flex: 1,
  },
  houseAddress: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  houseNotes: {
    color: '#6B7280',
    fontSize: 14,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  removeButton: {
    padding: 8,
  },
});

export default RouteCreateScreen; 