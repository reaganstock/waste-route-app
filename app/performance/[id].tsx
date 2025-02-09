import { useLocalSearchParams } from 'expo-router';
import PerformanceScreen from '../../src/screens/PerformanceScreen';

export default function Performance() {
  const { id } = useLocalSearchParams();
  return <PerformanceScreen memberId={id as string} />;
} 
 
 