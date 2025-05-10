import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import ActiveRoutesScreen from '../../src/screens/ActiveRoutesScreen';

export default function ActiveRoutesTab() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <ActiveRoutesScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            router.push(screen.toLowerCase());
          }
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
}); 