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
            if (screen === 'settings') {
              router.push('/(tabs)/settings');
            } else if (screen.startsWith('/')) {
              router.push(screen);
            } else {
              switch (screen) {
                case 'Route':
                  router.push(`/route/${params.routeId}`);
                  break;
                case 'route-create':
                  router.push('/route-create');
                  break;
                case 'map':
                  router.push('/map');
                  break;
                default:
                  router.push(`/${screen.toLowerCase()}`);
              }
            }
          }
        }} 
      />
    </View>
  );
}
