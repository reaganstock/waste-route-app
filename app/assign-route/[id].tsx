import { useLocalSearchParams } from 'expo-router';
import AssignRouteScreen from '../../src/screens/AssignRouteScreen';

export default function AssignRoute() {
  const { id } = useLocalSearchParams();
  return <AssignRouteScreen memberId={id as string} />;
} 
 
 
 
 
 