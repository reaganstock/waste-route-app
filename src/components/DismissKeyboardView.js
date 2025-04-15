import React from 'react';
import { TouchableWithoutFeedback, Keyboard, View, StyleSheet } from 'react-native';

/**
 * A wrapper component that dismisses the keyboard when tapped
 * outside of input elements
 */
const DismissKeyboardView = ({ children, style, ...props }) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, style]} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DismissKeyboardView; 