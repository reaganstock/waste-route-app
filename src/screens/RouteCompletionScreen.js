import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const MetricCard = ({ icon, title, value, subtitle, borderColor }) => (
  <View style={[styles.metricCard, { borderLeftColor: borderColor }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${borderColor}20` }]}>
      <Ionicons name={icon} size={20} color={borderColor} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </View>
);

const RouteCompletionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const summary = JSON.parse(params.summary);

  const duration = Math.round((new Date(summary.endTime) - new Date(summary.startTime)) / (1000 * 60));
  const efficiency = Math.round((summary.completed / summary.total) * 100);
  const binsPerHour = duration === 0 ? "180" : Math.round((summary.completed / (duration / 60)) * 10) / 10;

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
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Route Complete</Text>
          <Text style={styles.headerSubtitle}>
            {new Date(summary.endTime).toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
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
              icon="trash"
              title="Total Bins"
              value={summary.total}
              borderColor="#3B82F6"
            />
            <MetricCard
              icon="checkmark-circle"
              title="Collected"
              value={summary.completed}
              subtitle={`${efficiency}% complete`}
              borderColor="#10B981"
            />
            <View style={styles.performanceSection}>
              <Text style={styles.performanceTitle}>Performance</Text>
              <View style={styles.performanceRow}>
                <View style={styles.skippedContainer}>
                  <Text style={styles.skippedText}>1</Text>
                  <Text style={styles.skippedLabel}>Skipped</Text>
                </View>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationValue}>{duration} min</Text>
                  <Text style={styles.durationLabel}>Duration</Text>
                </View>
              </View>
              <View style={styles.efficiencyContainer}>
                <Text style={styles.efficiencyTitle}>Efficiency %   </Text>
                <Text style={styles.efficiencyValue}>{efficiency}%</Text>
              </View>
              <View style={styles.efficiencyBar}>
                <View 
                  style={[
                    styles.efficiencyFill,
                    { width: `${efficiency}%` }
                  ]} 
                />
              </View>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={[styles.metricIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>1</Text>
              <View style={styles.binsPerHourContainer}>
                <Ionicons name="game-controller" size={16} color="#10B981" />
                <Text style={styles.binsPerHourValue}>{binsPerHour}</Text>
              </View>
              <Text style={styles.binsPerHourLabel}>Bins/Hour</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.newRouteButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.newRouteText}>Start New Route</Text>
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
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 13,
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
});

export default RouteCompletionScreen; 
 
 