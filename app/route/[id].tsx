import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RouteScreen from '../../src/screens/RouteScreen';

export default function Route() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <RouteScreen 
        route={{ params: { routeId: id } }}
        navigation={{
          goBack: () => router.back(),
          navigate: (screen: string, params?: any) => {
            if (screen === 'RouteComplete') {
              router.push(`/route/${params.routeId}/complete`);
            } else if (screen === 'RouteDetails') {
              router.push(`/route/${params.routeId}/details`);
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 