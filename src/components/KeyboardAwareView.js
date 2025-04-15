import React from 'react';
import { 
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StyleSheet,
  View
} from 'react-native';
import { useKeyboardManager } from '../hooks/useKeyboardManager';

/**
 * A component that handles keyboard interactions consistently across the app.
 * It provides keyboard avoidance, dismisses the keyboard when tapping outside inputs,
 * and can scroll to the focused input.
 */
const KeyboardAwareView = ({ 
  children, 
  style, 
  contentContainerStyle,
  scrollEnabled = true,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height', 
  keyboardVerticalOffset = 0,
  bounces = false,
  dismissKeyboardOnScroll = false,
  ...props 
}) => {
  const { keyboardHeight, dismissKeyboard } = useKeyboardManager();

  // If scrolling is enabled, use a ScrollView
  if (scrollEnabled) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {dismissKeyboardOnScroll ? (
          <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
            <ScrollView
              bounces={bounces}
              contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              {...props}
            >
              {children}
              {/* Add extra padding at the bottom to ensure content is not covered by keyboard */}
              <View style={{ height: keyboardHeight > 0 ? keyboardHeight * 0.5 : 0 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        ) : (
          <ScrollView
            bounces={bounces}
            contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...props}
          >
            {children}
            {/* Add extra padding at the bottom to ensure content is not covered by keyboard */}
            <View style={{ height: keyboardHeight > 0 ? keyboardHeight * 0.5 : 0 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    );
  }

  // If scrolling is disabled, use a simple View
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default KeyboardAwareView; 