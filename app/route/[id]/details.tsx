import { useLocalSearchParams } from 'expo-router';
import CompletedRouteDetailsScreen from '../../../src/screens/CompletedRouteDetailsScreen';

export default function RouteDetails() {
  const { id } = useLocalSearchParams();
  return <CompletedRouteDetailsScreen routeId={id as string} />;
} 