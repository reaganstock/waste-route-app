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
  
  // Default data in case params.summary is undefined
  const defaultSummary = {
    total: 0,
    completed: 0,
    houses: [],
    completed_houses: 0,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  };

  // Safely parse summary with fallback to default
  const summary = params.summary ? JSON.parse(params.summary) : defaultSummary;

  const duration = Math.round((new Date(summary.endTime) - new Date(summary.startTime)) / (1000 * 60));
  const completionRate = summary.completed / (summary.total || 1);
  const housesPerHour = duration === 0 ? 0 : (summary.completed / (duration / 60));
  const speedEfficiency = Math.min(housesPerHour / 60, 1); // Cap at 100%
  const efficiency = Math.round((0.6 * completionRate + 0.4 * speedEfficiency) * 100);
  const binsPerHour = duration === 0 ? 0 : Math.round((summary.completed / (duration / 60)) * 10) / 10;

  const handleShare = async () => {
    try {
      const message = `Route Summary\n\n` +
        `Total Bins: ${summary.total}\n` +
        `Collected: ${summary.completed}\n` +
        `Duration: ${duration} minutes\n` +
        `Efficiency: ${efficiency}%\n` +
        `Bins/Hour: ${binsPerHour}`;

      const result = await Share.share({
        message,
        title: 'Route Summary',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
          onPress={() => router.push('/')} 
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
        scrollEnabled={true}
        bounces={false}
        overScrollMode="never"
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
              title="Houses Collected"
              value={summary.completed}
              borderColor="#10B981"
            />
            <MetricCard
              icon="time-outline"
              title="Duration"
              value={`${duration} min`}
              borderColor="#F59E0B"
            />
            <MetricCard
              icon="alert-circle"
              title={
                <View style={styles.titleWithInfo}>
                  <Text style={styles.metricTitle}>Special Houses</Text>
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => Alert.alert(
                      'Special Houses',
                      'Includes houses marked as:\n• Skip\n• New Customer\n• Special Instructions'
                    )}
                  >
                    <Ionicons name="information-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              }
              value={summary.special_houses || 0}
              borderColor="#8B5CF6"
            />
            <MetricCard
              icon="trending-up"
              title="Efficiency"
              value={`${efficiency}%`}
              borderColor="#8B5CF6"
            />
            <MetricCard
              icon="speedometer"
              title="Bins/Hr"
              value={binsPerHour}
              borderColor="#EC4899"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.newRouteButton}
          onPress={() => router.push('/route-create')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.newRouteText}>Create New Route</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  efficiencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  efficiencyTitle: {
    color: '#fff',
    fontSize: 13,
  },
  efficiencyValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  efficiencyBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  efficiencyFill: {
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
  newRouteText: {
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
});

export { RouteCompletionScreen };
export default RouteCompletionScreen; 
 
 
 