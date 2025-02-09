import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../../src/screens/HomeScreen';

export default function Index() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            if (screen === 'route') {
              router.push(`/route/${params.id}`);
            } else if (screen === 'settings') {
              router.push('/settings');
            } else if (screen === 'route-create') {
              router.push('/route-create');
            } else if (screen === 'map') {
              router.push('/map');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
});

