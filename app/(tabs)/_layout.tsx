import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'owner';
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#1F2937',
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackground: () => (
          <LinearGradient
            colors={['#1F2937', '#111827']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
        headerShown: false,
      }}
    >
      {/* Redirect index to routes */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide this tab
        }}
        redirect
      />
      
      <Tabs.Screen
        name="routes"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
