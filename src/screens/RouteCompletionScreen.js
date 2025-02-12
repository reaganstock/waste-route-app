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
  
  const defaultSummary = {
    route_name: '',
    total: 0,
    completed: 0,
    special_houses: 0,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  };

  const summary = params.summary ? JSON.parse(params.summary) : defaultSummary;
  const duration = Math.round((new Date(summary.endTime) - new Date(summary.startTime)) / (1000 * 60));
  
  const calculateEfficiency = () => {
    const durationHours = duration / 60; // Convert minutes to hours
    const completionRate = summary.completed / summary.total;
    const housesPerHour = durationHours > 0 ? (summary.completed / durationHours) : 0;
    const speedEfficiency = housesPerHour / 60; // No cap
    
    // Final efficiency (60/40 formula)
    const efficiency = (0.6 * completionRate + 0.4 * speedEfficiency) * 100;
    
    return Number(efficiency.toFixed(2)); // Round to 2 decimal places
  };

  const formatDuration = (minutes) => {
    const hours = minutes / 60; // Convert to hours
    return `${hours.toFixed(2)} hrs`;  // Show to nearest hundredth
  };

  const formatHousesPerHour = () => {
    if (duration === 0) return '0.00';
    const housesPerHour = (summary.completed / (duration / 60));
    return housesPerHour.toFixed(2); // Round to nearest hundredth
  };

  const handleShare = async () => {
    try {
      const message = `Route Summary\n\n` +
        `Total Houses: ${summary.total}\n` +
        `Collected: ${summary.completed}\n` +
        `Duration: ${formatDuration(duration)}\n` +
        `Efficiency: ${calculateEfficiency()}%\n` +
        `Houses/Hr: ${formatHousesPerHour()}`;

      const result = await Share.share({
        message,
        title: 'Route Summary',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const metrics = [
    {
      icon: 'home',
      label: 'Total Houses',
      value: summary.total,
      color: '#6B7280',
      info: 'Total number of houses in the route'
    },
    {
      icon: 'checkmark-circle',
      label: 'Completed',
      value: summary.completed,
      color: '#10B981',
      info: 'Number of houses serviced'
    },
    {
      icon: 'flag',
      label: 'Special Houses',
      value: summary.special_houses,
      color: '#8B5CF6',
      info: 'Houses that were skipped or marked as new customers'
    },
    {
      icon: 'time',
      label: 'Duration',
      value: formatDuration(duration),
      color: '#F59E0B',
      info: 'Total time spent on route'
    },
    {
      icon: 'flash',
      label: 'Houses/Hr',
      value: formatHousesPerHour(),
      color: '#14B8A6',
      info: 'Average number of houses serviced per hour'
    },
    {
      icon: 'trending-up',
      label: 'Efficiency',
      value: `${calculateEfficiency()}%`,
      color: '#3B82F6',
      info: 'Based on 60% completion rate and 40% speed (target: 60 houses/hour)'
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
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
      >
        <Text style={styles.timestamp}>
          {new Date(summary.endTime).toLocaleString()}
        </Text>

        <View style={styles.congratsSection}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.congratsGradient}
          >
            <View style={styles.congratsIcon}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.congratsTitle}>Great job!</Text>
            <Text style={styles.routeName}>{summary.route_name}</Text>
            <Text style={styles.congratsText}>
              {summary.completed === summary.total 
                ? `You've completed all ${summary.total} houses!`
                : `You've completed ${summary.completed} out of ${summary.total} houses`}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Summary</Text>
          <View style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <MetricCard
                key={index}
                icon={metric.icon}
                title={(
                  <View style={styles.titleWithInfo}>
                    <Text style={styles.metricTitle}>{metric.label}</Text>
                    <TouchableOpacity 
                      style={styles.infoButton}
                      onPress={() => Alert.alert(metric.label, metric.info)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}
                value={metric.value}
                borderColor={metric.color}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.newRouteButton}
          onPress={() => router.push('/route/create')}
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
    padding: 4,
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
  timestamp: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'left',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  routeName: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 12,
    opacity: 0.8,
  },
});

export default RouteCompletionScreen; 
 
 
 