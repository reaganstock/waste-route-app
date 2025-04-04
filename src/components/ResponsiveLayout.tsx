import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { DeviceInfo } from '../../app/_layout';

type ResponsiveLayoutProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Responsive layout component that adapts the UI for iPad and iPhone
 * On iPad, it centers content with appropriate max widths
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  style 
}) => {
  if (!DeviceInfo.isTablet) {
    // On phones, just render children with provided styles
    return (
      <View style={[styles.container, style]}>
        {children}
      </View>
    );
  }

  // On tablets, apply a centered layout with max width
  return (
    <View style={styles.tabletContainer}>
      <View style={[styles.tabletContent, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabletContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#000',
  },
  tabletContent: {
    flex: 1,
    width: '85%',
    maxWidth: 800,
  },
});

export default ResponsiveLayout; 