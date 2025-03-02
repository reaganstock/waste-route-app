import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import RouteCreateScreen from './RouteCreateScreen';

const RouteEditScreen = ({ route }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const routeCreateRef = useRef(null);

  const handleDelete = () => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await supabase
                .from('routes')
                .delete()
                .eq('id', route.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    try {
      setLoading(true);
      
      // Get current route data from RouteCreateScreen
      const routeData = await routeCreateRef.current?.getRouteData();
      
      if (!routeData) {
        Alert.alert('Error', 'Unable to get route data');
        return;
      }

      if (!routeData.houses || routeData.houses.length === 0) {
        Alert.alert('Error', 'Route must have at least one house');
        return;
      }

      // Update route data with only essential fields
      const { error: routeError } = await supabase
        .from('routes')
        .update({
          name: routeData.name,
          date: routeData.date,
          driver_id: routeData.driver_id,
          total_houses: routeData.houses.length
        })
        .eq('id', route.id);

      if (routeError) throw routeError;

      // Delete existing houses
      const { error: deleteError } = await supabase
        .from('houses')
        .delete()
        .eq('route_id', route.id);

      if (deleteError) throw deleteError;

      // Insert new houses with only essential fields
      const { error: housesError } = await supabase
        .from('houses')
        .insert(routeData.houses.map(house => ({
          address: house.address,
          lat: house.lat,
          lng: house.lng,
          status: house.status || 'pending',
          route_id: route.id
        })));

      if (housesError) throw housesError;

      Alert.alert('Success', 'Route updated successfully', [
        {
          text: 'OK',
          onPress: () => router.push('/')
        }
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = () => {
    setHasChanges(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Route</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!hasChanges || loading) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!hasChanges || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[
                styles.saveButtonText,
                !hasChanges && styles.saveButtonTextDisabled
              ]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <RouteCreateScreen 
        ref={routeCreateRef}
        isEditing={true}
        existingRoute={route}
        hideHeader={true}
        onRouteChange={handleChange}
      />
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default RouteEditScreen; 