import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoutes } from '../hooks/useRoutes';

const MetricCard = ({ icon, title, value, subtitle, borderColor }) => (
  <View style={[styles.metricCard, borderColor && { borderColor }]}>
    <View style={styles.metricIcon}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <View style={styles.metricContent}>
      {typeof title === 'string' ? (
        <Text style={styles.metricTitle}>{title}</Text>
      ) : (
        title
      )}
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const RouteCompletionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchRoutes } = useRoutes();
  
  // Add debugging to check what summary data is being received
  console.log("Route completion params:", params);
  
  // Default data in case params.summary is undefined
  const defaultSummary = {
    total: 0,
    completed: 0,
    route_name: "Route",
    route_id: null,
  };

  // Safely parse summary with fallback to default
  let summary = defaultSummary;
  try {
    if (params.summary) {
      summary = JSON.parse(params.summary);
      console.log("Successfully parsed route summary:", summary);
    } else {
      console.warn("No summary data found in params");
    }
  } catch (error) {
    console.error("Error parsing route summary:", error);
    Alert.alert("Error", "There was a problem loading the route summary data.");
  }

  // Calculate basic metrics from summary data
  const completion = Math.round((summary.completed / (summary.total || 1)) * 100);

  const handleShare = async () => {
    try {
      const message = `Route Summary\n\n` +
        `Route: ${summary.route_name}\n` +
        `Total Bins: ${summary.total}\n` +
        `Collected: ${summary.completed}\n` +
        `Completion: ${completion}%`;

      const result = await Share.share({
        message,
        title: 'Route Summary',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleReuseRoute = () => {
    if (!summary.route_id) {
      Alert.alert("Error", "Route ID not available for reuse.");
      return;
    }
    
    // Ask for confirmation
    Alert.alert(
      "Reuse Route",
      "Would you like to reuse this route for a future date?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          onPress: () => {
            // Navigate to route creation screen with pre-filled data from this route
            router.push({
              pathname: '/routes/create',
              params: { 
                reusing: 'true',
                route_id: summary.route_id
              }
            });
          }
        }
      ]
    );
  };

  const handleNavigateHome = () => {
    // Fetch updated routes data before navigating home
    console.log("Refreshing routes data before navigating home");
    fetchRoutes().then(() => {
      router.push('/(tabs)');
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity 
          onPress={handleNavigateHome} 
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Complete</Text>
        <TouchableOpacity 
          onPress={handleShare} 
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color="#10B981" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.congratsSection}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.congratsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.congratsIcon}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.congratsTitle}>Great job!</Text>
            <Text style={styles.congratsText}>
              You've completed {summary.completed} out of {summary.total} bins
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Summary</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="home"
              title="Total Houses"
              value={summary.total}
              borderColor="#3B82F6"
            />
            <MetricCard
              icon="checkmark-circle"
              title="Houses Completed"
              value={summary.completed}
              borderColor="#10B981"
            />
            <MetricCard
              icon="trending-up"
              title="Completion"
              value={`${completion}%`}
              borderColor="#8B5CF6"
            />
          </View>
        </View>
        
        {summary.route_id && (
          <TouchableOpacity 
            style={styles.reuseButton}
            onPress={handleReuseRoute}
          >
            <Ionicons name="repeat" size={20} color="#fff" />
            <Text style={styles.reuseButtonText}>Reuse This Route</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.newRouteButton}
          onPress={() => router.push('/route-create')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.newRouteButtonText}>Create New Route</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeButton}
          onPress={handleNavigateHome}
        >
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  congratsSection: {
    padding: 20,
  },
  congratsGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
  },
  congratsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
  performanceSection: {
    width: '48%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  performanceTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skippedContainer: {
    flex: 1,
  },
  skippedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  skippedLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  durationContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  durationValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  durationLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  completionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    color: '#fff',
    fontSize: 13,
  },
  completionValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  completionBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 1.5,
  },
  binsPerHourContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  binsPerHourValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  binsPerHourLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  newRouteButton: {
    backgroundColor: '#10B981',
    margin: 20,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  newRouteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoButton: {
    padding: 2,
  },
  homeButton: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  reuseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  reuseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default RouteCompletionScreen; 
 
 
 