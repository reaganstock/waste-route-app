import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import RouteEditScreen from '../../../src/screens/RouteEditScreen';
import { useRoute } from '../../../src/hooks/useRoute';

export default function RouteEdit() {
  const { id } = useLocalSearchParams();
  const { route, loading, error } = useRoute(id as string);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load route</Text>
      </View>
    );
  }

  return <RouteEditScreen route={route} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
}); 