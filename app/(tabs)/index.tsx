import { View } from 'react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../../src/screens/HomeScreen';

export default function Index() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            if (screen === 'Route') {
              router.push(`/route/${params.routeId}`);
            } else if (screen === 'Settings') {
              router.push('/settings');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
}
