import AssignRouteScreen from '../../../src/screens/AssignRouteScreen.js';
import { useLocalSearchParams } from 'expo-router';

export default function Page() {
  const { id } = useLocalSearchParams();
  return <AssignRouteScreen memberId={id as string} />;
} 