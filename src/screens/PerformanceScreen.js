import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mockTeamMembers } from '../lib/mockData';

const MetricCard = ({ title, value, icon, trend, trendValue }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={24} color="#3B82F6" />
      </View>
      <View style={styles.trendContainer}>
        <Ionicons 
          name={trend === 'up' ? 'arrow-up' : 'arrow-down'} 
          size={16} 
          color={trend === 'up' ? '#10B981' : '#EF4444'} 
        />
        <Text style={[
          styles.trendText,
          { color: trend === 'up' ? '#10B981' : '#EF4444' }
        ]}>
          {trendValue}%
        </Text>
      </View>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </View>
);

const PerformanceScreen = ({ memberId }) => {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    const memberData = mockTeamMembers.find(m => m.id === memberId);
    if (memberData) {
      setMember(memberData);
    }
  }, [memberId]);

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  if (!member) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Member not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.role) }]}>
          <Text style={styles.avatarText}>
            {member.full_name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          <Text style={styles.memberRole}>{member.role}</Text>
        </View>
      </View>

      <View style={styles.periodSelector}>
        {periods.map(period => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              selectedPeriod === period.id && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period.id)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.id && styles.periodButtonTextActive
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Routes Completed"
            value="45"
            icon="checkmark-circle-outline"
            trend="up"
            trendValue="12"
          />
          <MetricCard
            title="Average Rating"
            value="4.8"
            icon="star-outline"
            trend="up"
            trendValue="5"
          />
          <MetricCard
            title="Hours Driven"
            value={member.hours_driven || 0}
            icon="time-outline"
            trend="up"
            trendValue="8"
          />
          <MetricCard
            title="Efficiency"
            value="92%"
            icon="trending-up-outline"
            trend="up"
            trendValue="5"
          />
          <MetricCard
            title="Houses Serviced"
            value="328"
            icon="home-outline"
            trend="up"
            trendValue="8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.timeline}>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Completed Route #{index + 1}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(Date.now() - index * 86400000).toLocaleDateString()}
                  </Text>
                  <Text style={styles.timelineMetrics}>
                    15 houses • 4.9 rating • On time
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.insightText}>
              Performance has improved by 15% compared to last {selectedPeriod}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.insightText}>
              Consistently maintains high customer satisfaction ratings
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const getAvatarColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '#3B82F6';
    case 'driver':
      return '#10B981';
    case 'manager':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
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
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#374151',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  timelineMetrics: {
    color: '#6B7280',
    fontSize: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PerformanceScreen; 
 
 
 