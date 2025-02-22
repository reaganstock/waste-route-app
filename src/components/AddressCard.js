import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'skip':
      return '#EF4444';
    case 'new customer':
      return '#10B981';
    case 'collect':
      return '#6B7280';
    case 'pending':
    default:
      return '#3B82F6';
  }
};

const AddressCard = ({ house, onRemove, onEdit, hasError }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAddress, setEditedAddress] = useState(house.address);
  
  const handleEdit = () => {
    if (isEditing) {
      onEdit(editedAddress);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setEditedAddress(house.address);
    setIsEditing(false);
  };

  // Get the display status - show Error if hasError is true
  const displayStatus = hasError ? 'Error' : house.status;
  const statusColor = hasError ? '#EF4444' : getStatusColor(house.status);

  return (
    <View 
      style={[
        styles.addressCard,
        { borderLeftColor: statusColor },
        hasError && styles.errorCard
      ]}
    >
      <View style={styles.addressContent}>
        {isEditing ? (
          <TextInput
            style={styles.addressInput}
            value={editedAddress}
            onChangeText={setEditedAddress}
            autoFocus
            multiline
          />
        ) : (
          <>
            <Text style={styles.addressText}>{house.address}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {displayStatus}
              </Text>
            </View>
            {hasError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>
                  {house.error || 'Error geocoding address'}
                </Text>
              </View>
            )}
            {house.notes && (
              <Text style={styles.notesText}>{house.notes}</Text>
            )}
          </>
        )}
      </View>
      <View style={styles.actions}>
        {hasError && (
          <TouchableOpacity 
            onPress={handleEdit}
            style={styles.editButton}
          >
            <Ionicons 
              name={isEditing ? "checkmark-circle" : "create-outline"} 
              size={24} 
              color={isEditing ? "#10B981" : "#3B82F6"} 
            />
          </TouchableOpacity>
        )}
        {isEditing && (
          <TouchableOpacity 
            onPress={handleCancel}
            style={styles.cancelButton}
          >
            <Ionicons name="close-circle" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  addressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 6,
    padding: 8,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
  },
  errorCard: {
    backgroundColor: '#1F293780',
  },
  addressContent: {
    flex: 1,
    gap: 2,
  },
  addressText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  addressInput: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: '#374151',
    borderRadius: 4,
    padding: 8,
    minHeight: 60,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    lineHeight: 12,
  },
  notesText: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButton: {
    padding: 2,
  },
  cancelButton: {
    padding: 2,
  },
  removeButton: {
    padding: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default AddressCard; 