import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PrivacyPolicyScreen = () => {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: February 9, 2024</Text>
          
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <Text style={styles.paragraph}>
            We collect location data only during active routes to provide navigation and route optimization services. This data is used solely for the purpose of improving your route efficiency and is not shared with third parties.
          </Text>

          <Text style={styles.sectionTitle}>Data Usage</Text>
          <Text style={styles.paragraph}>
            The app uses your location data to:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Provide turn-by-turn navigation</Text>
            <Text style={styles.bulletPoint}>• Optimize route sequences</Text>
            <Text style={styles.bulletPoint}>• Calculate estimated arrival times</Text>
            <Text style={styles.bulletPoint}>• Generate route analytics</Text>
          </View>

          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.paragraph}>
            Route data is stored securely on our servers and is accessible only to authorized personnel. Historical route data is retained for 30 days before being automatically deleted.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Access your data</Text>
            <Text style={styles.bulletPoint}>• Request data deletion</Text>
            <Text style={styles.bulletPoint}>• Opt out of data collection</Text>
            <Text style={styles.bulletPoint}>• Export your data</Text>
          </View>
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
  lastUpdated: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 24,
  },
  paragraph: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  bulletPoints: {
    marginLeft: 8,
    marginBottom: 16,
  },
  bulletPoint: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 28,
  },
});

export default PrivacyPolicyScreen; 
 
 
 
 
 