import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import AllRoutesScreen from '../../src/screens/AllRoutesScreen';

export default function AllRoutes() {
  const params = useLocalSearchParams();
  
  // Handle the filter param, ensuring it's a string
  const filter = params.filter ? 
    (Array.isArray(params.filter) ? params.filter[0] : params.filter) : 
    undefined;
    
  return <AllRoutesScreen initialFilter={filter} />;
} 