import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const InputField = ({ label, value, onChangeText, editable, icon }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[
      styles.inputWrapper,
      !editable && styles.inputWrapperDisabled
    ]}>
      <Ionicons name={icon} size={20} color="#6B7280" style={styles.inputIcon} />
      {editable ? (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#6B7280"
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  </View>
);

const ProfileDetailsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    preferredRegion: '',
    startDate: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setFormData({
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
        preferredRegion: data.preferred_region || '',
        startDate: data.start_date ? new Date(data.start_date).toLocaleDateString() : '',
      });
      setProfileImage(data.avatar_url || 'https://via.placeholder.com/150');
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        setLoading(true);
        const file = {
          uri: result.assets[0].uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        };

        // Upload image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${user.id}/avatar.jpg`, file, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${user.id}/avatar.jpg`);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setProfileImage(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to update profile picture');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          preferred_region: formData.preferredRegion,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <TouchableOpacity 
          style={[styles.editButton, isEditing && styles.saveButton]}
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <LinearGradient
            colors={isEditing ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editButtonGradient}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileImageContainer}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
            {isEditing && (
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
                style={styles.imageOverlay}
              >
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={handleImagePick}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <InputField
            label="Full Name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            editable={isEditing}
            icon="person-outline"
          />
          <InputField
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            editable={isEditing}
            icon="mail-outline"
          />
          <InputField
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            editable={isEditing}
            icon="call-outline"
          />
          <InputField
            label="Role"
            value={formData.role}
            editable={false}
            icon="briefcase-outline"
          />
          <InputField
            label="Preferred Region"
            value={formData.preferredRegion}
            onChangeText={(text) => setFormData({ ...formData, preferredRegion: text })}
            editable={isEditing}
            icon="location-outline"
          />
          <InputField
            label="Start Date"
            value={formData.startDate}
            editable={false}
            icon="calendar-outline"
          />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  editButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  imageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    alignItems: 'center',
    gap: 8,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapperDisabled: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
    paddingRight: 16,
  },
  fieldValue: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16,
    paddingRight: 16,
  },
});

export default ProfileDetailsScreen; 
 
 
 
 