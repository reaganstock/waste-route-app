const EditRouteScreen = () => {
  // ... existing code ...

  const hasChanges = () => {
    return (
      route.date !== originalRoute.date ||
      route.start_time !== originalRoute.start_time ||
      route.end_time !== originalRoute.end_time ||
      route.driver_id !== originalRoute.driver_id ||
      route.notes !== originalRoute.notes ||
      route.status !== originalRoute.status
    );
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      Alert.alert('No Changes', 'No changes have been made to save.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('routes')
        .update({
          date: route.date,
          start_time: route.start_time,
          end_time: route.end_time,
          driver_id: route.driver_id,
          notes: route.notes,
          status: route.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', route.id);

      if (error) throw error;

      Alert.alert('Success', 'Route updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating route:', error);
      Alert.alert('Error', 'Failed to update route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component
}; 