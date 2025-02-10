import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mockRoutes } from '../lib/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';

const RouteCard = ({ route, onPress }) => {
  const date = new Date(route.date);
  const efficiency = Math.round((route.completed_houses / route.houses.length) * 100);
  const specialHouses = route.houses.filter(h => h.status === 'skip' || h.notes).length;
  const duration = route.duration || '2.5'; // This would come from your backend

  return (
    <TouchableOpacity style={styles.routeCard} onPress={onPress}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.routeGradient}
      >
        <View style={styles.routeHeader}>
          <View>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeDate}>
              {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.efficiencyBadge, { 
            backgroundColor: efficiency >= 90 ? 'rgba(16, 185, 129, 0.2)' : 
                           efficiency >= 70 ? 'rgba(245, 158, 11, 0.2)' : 
                           'rgba(239, 68, 68, 0.2)'
          }]}>
            <Text style={[styles.efficiencyText, {
              color: efficiency >= 90 ? '#10B981' : 
                     efficiency >= 70 ? '#F59E0B' : 
                     '#EF4444'
            }]}>{efficiency}% Efficient</Text>
          </View>
        </View>

        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Ionicons name="home" size={16} color="#3B82F6" />
            <Text style={styles.routeStatText}>
              {route.completed_houses}/{route.houses.length} Houses
            </Text>
          </View>
          {specialHouses > 0 && (
            <View style={styles.routeStat}>
              <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
              <Text style={styles.routeStatText}>
                {specialHouses} Special
              </Text>
            </View>
          )}
          <View style={styles.routeStat}>
            <Ionicons name="time" size={16} color="#F59E0B" />
            <Text style={styles.routeStatText}>{duration} hrs</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${efficiency}%`,
                backgroundColor: efficiency >= 90 ? '#10B981' : 
                               efficiency >= 70 ? '#F59E0B' : 
                               '#EF4444'
              }
            ]} 
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const CompletedRoutesScreen = () => {
  const router = useRouter();
  const [routes, setRoutes] = useState([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, [startDate, endDate]);

  const fetchRoutes = () => {
    // Filter routes by date range and completed status
    const filteredRoutes = mockRoutes.filter(route => {
      const routeDate = new Date(route.date);
      return route.status === 'completed' && 
             routeDate >= startDate && 
             routeDate <= endDate;
    });
    
    // Sort by date, newest first
    filteredRoutes.sort((a, b) => new Date(b.date) - new Date(a.date));
    setRoutes(filteredRoutes);
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
        <Text style={styles.headerTitle}>Completed Routes</Text>
        <View style={styles.placeholder} />
      </BlurView>

      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowStartPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          <Text style={styles.dateText}>
            {startDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>to</Text>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowEndPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          <Text style={styles.dateText}>
            {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routesList}>
          {routes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onPress={() => router.push(`/route/${route.id}/details`)}
            />
          ))}
          {routes.length === 0 && (
            <Text style={styles.noRoutesText}>
              No completed routes found in this date range
            </Text>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  routesList: {
    padding: 20,
    gap: 16,
  },
  routeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  routeGradient: {
    padding: 20,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  efficiencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeStatText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  noRoutesText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
});

export default CompletedRoutesScreen; 
 
 
 