import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MapScreen from '../src/screens/MapScreen';

export default function Map() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <MapScreen 
        navigation={{
          goBack: () => router.back(),
          navigate: (screen: string, params?: any) => {
            if (screen === 'Route') {
              router.push(`/route/${params.routeId}`);
            } else if (screen === 'CreateRoute') {
              router.push('/routes/create');
            } else {
              // Map specific screen names to valid routes
              const routeMap: Record<string, string> = {
                'home': '/(tabs)',
                'team': '/(tabs)/team',
                'settings': '/settings',
                'profile': '/profile-details',
                'support': '/support',
                'map': '/map'
              };
              
              // Use the map or default to the lowercase screen name
              const routePath = routeMap[screen.toLowerCase()] || `/${screen.toLowerCase()}`;
              router.push(routePath as any);
            }
          }
        }} 
      />
    </View>
  );
} 