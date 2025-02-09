import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const HelpScreen = () => {
  const router = useRouter();

  const supportEmail = 'support@wasteroute.com';
  const supportPhone = '+1 (555) 123-4567';

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${supportEmail}`);
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${supportPhone}`);
  };

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          
          <TouchableOpacity 
            style={styles.contactOption}
            onPress={handleEmailSupport}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={24} color="#fff" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactInfo}>{supportEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactOption}
            onPress={handleCallSupport}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={24} color="#fff" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactTitle}>Phone Support</Text>
              <Text style={styles.contactInfo}>{supportPhone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>FAQs</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I start a new route?</Text>
            <Text style={styles.answer}>
              To start a new route, tap the "+" button on the home screen and follow the prompts to enter your destinations.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>Can I modify a route in progress?</Text>
            <Text style={styles.answer}>
              Yes, you can add or remove stops during an active route by tapping the "Edit Route" button in the navigation view.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I view my route history?</Text>
            <Text style={styles.answer}>
              Access your route history by tapping the "History" tab in the bottom navigation bar. Here you can view details of past routes.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>What do I do if the app crashes?</Text>
            <Text style={styles.answer}>
              If the app crashes, please try restarting it. If the issue persists, contact our support team with details about what you were doing when the crash occurred.
            </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginTop: 24,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  contactInfo: {
    color: '#6B7280',
    fontSize: 14,
  },
  faqItem: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  question: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  answer: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HelpScreen; 
 
 