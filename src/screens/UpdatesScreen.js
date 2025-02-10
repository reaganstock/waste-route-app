import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const UpdateCard = ({ version, date, features, type }) => (
  <View style={styles.updateCard}>
    <View style={styles.updateHeader}>
      <View>
        <Text style={styles.updateVersion}>Version {version}</Text>
        <Text style={styles.updateDate}>{date}</Text>
      </View>
      <View style={[
        styles.updateBadge,
        type === 'major' && styles.majorBadge,
        type === 'minor' && styles.minorBadge,
        type === 'patch' && styles.patchBadge,
      ]}>
        <Text style={styles.updateBadgeText}>{type}</Text>
      </View>
    </View>
    <View style={styles.featuresList}>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  </View>
);

const UpdatesScreen = () => {
  const router = useRouter();
  
  const updates = [
    {
      version: '2.1.0',
      date: 'February 9, 2024',
      type: 'minor',
      features: [
        'Added Google Sheets integration for route creation',
        'Improved route optimization algorithm',
        'Enhanced driver assignment interface',
      ],
    },
    {
      version: '2.0.0',
      date: 'January 15, 2024',
      type: 'major',
      features: [
        'Complete UI redesign with dark mode',
        'New analytics dashboard',
        'Real-time route tracking',
        'Team management features',
      ],
    },
    {
      version: '1.9.5',
      date: 'December 28, 2023',
      type: 'patch',
      features: [
        'Fixed CSV import issues',
        'Performance improvements',
        'Bug fixes in route creation',
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Updates</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's New</Text>
          {updates.map((update, index) => (
            <UpdateCard key={index} {...update} />
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
    paddingTop: 60,
    backgroundColor: '#111',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: {
    width: 70,
  },
  content: {
    flex: 1,
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
  updateCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  updateVersion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  updateDate: {
    color: '#6B7280',
    fontSize: 14,
  },
  updateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  majorBadge: {
    backgroundColor: '#DC2626',
  },
  minorBadge: {
    backgroundColor: '#3B82F6',
  },
  patchBadge: {
    backgroundColor: '#10B981',
  },
  updateBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
});

export default UpdatesScreen; 
 
 
 