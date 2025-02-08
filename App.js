import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import RouteScreen from './src/screens/RouteScreen';
import TeamScreen from './src/screens/TeamScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Team') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
};

// Main stack navigator
const App = () => {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Route" component={RouteScreen} />
        {/* Add other screens here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App; 