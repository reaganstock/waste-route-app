import React, { useState } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-elements';
import { updateHouseStatus, addRouteHistory } from '../lib/supabase';

const HouseCard = ({ house, onStatusUpdate }) => {
  const [notes, setNotes] = useState(house.notes || '');
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      
      // Update house status
      const updatedHouse = await updateHouseStatus(house.id, newStatus, notes);
      
      // Add to route history
      await addRouteHistory({
        route_id: house.route_id,
        house_id: house.id,
        status: newStatus,
      });

      onStatusUpdate(updatedHouse);
    } catch (error) {
      console.error('Error updating house status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card containerStyle={styles.card}>
      <Card.Title>{house.address}</Card.Title>
      <Card.Divider />
      
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Status: </Text>
        <Text style={[styles.status, styles[house.status]]}>
          {house.status.toUpperCase()}
        </Text>
      </View>

      <TextInput
        style={styles.notes}
        placeholder="Add notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Collect"
          icon={
            <Icon
              name="check"
              type="material"
              color="white"
              size={20}
              style={styles.buttonIcon}
            />
          }
          onPress={() => handleStatusUpdate('collect')}
          loading={loading}
          disabled={loading || house.status === 'collect'}
          buttonStyle={[styles.button, styles.collectButton]}
        />
        <Button
          title="Skip"
          icon={
            <Icon
              name="close"
              type="material"
              color="white"
              size={20}
              style={styles.buttonIcon}
            />
          }
          onPress={() => handleStatusUpdate('skip')}
          loading={loading}
          disabled={loading || house.status === 'skip'}
          buttonStyle={[styles.button, styles.skipButton]}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    margin: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pending: {
    color: 'orange',
  },
  collect: {
    color: 'green',
  },
  skip: {
    color: 'red',
  },
  notes: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    minHeight: 80,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonIcon: {
    marginRight: 10,
  },
  collectButton: {
    backgroundColor: 'green',
  },
  skipButton: {
    backgroundColor: 'red',
  },
});

export default HouseCard; 