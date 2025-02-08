import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-elements';
import { updateRouteStatus } from '../lib/supabase';

const RouteDetails = ({ route, houses = [], onRouteUpdate }) => {
  const stats = useMemo(() => {
    const total = houses.length;
    const collected = houses.filter(h => h.status === 'collect').length;
    const skipped = houses.filter(h => h.status === 'skip').length;
    const pending = total - collected - skipped;
    const progress = total > 0 ? ((collected + skipped) / total) * 100 : 0;

    return {
      total,
      collected,
      skipped,
      pending,
      progress: Math.round(progress),
    };
  }, [houses]);

  const handleCompleteRoute = async () => {
    try {
      const updatedRoute = await updateRouteStatus(route.id, 'completed');
      onRouteUpdate(updatedRoute);
    } catch (error) {
      console.error('Error completing route:', error);
    }
  };

  return (
    <Card containerStyle={styles.card}>
      <Card.Title>{route.name}</Card.Title>
      <Card.Divider />

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon
            name="home"
            type="material"
            color="#2196F3"
            size={24}
          />
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>

        <View style={styles.statItem}>
          <Icon
            name="check-circle"
            type="material"
            color="green"
            size={24}
          />
          <Text style={styles.statLabel}>Collected</Text>
          <Text style={styles.statValue}>{stats.collected}</Text>
        </View>

        <View style={styles.statItem}>
          <Icon
            name="cancel"
            type="material"
            color="red"
            size={24}
          />
          <Text style={styles.statLabel}>Skipped</Text>
          <Text style={styles.statValue}>{stats.skipped}</Text>
        </View>

        <View style={styles.statItem}>
          <Icon
            name="pending"
            type="material"
            color="orange"
            size={24}
          />
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{stats.pending}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Progress: {stats.progress}%</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${stats.progress}%` }
            ]} 
          />
        </View>
      </View>

      {stats.pending === 0 && route.status !== 'completed' && (
        <Button
          title="Complete Route"
          icon={
            <Icon
              name="check"
              type="material"
              color="white"
              size={20}
              style={styles.buttonIcon}
            />
          }
          onPress={handleCompleteRoute}
          buttonStyle={styles.completeButton}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    margin: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginTop: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
});

export default RouteDetails; 