import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

/** iOS-style switch — ON = cyan track, white knob. */
export function Toggle({ value, onValueChange }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 19] });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.stroke, colors.accentCyan],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 29,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
});
