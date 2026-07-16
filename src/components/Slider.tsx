import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import { colors } from '@/theme';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

/** Minimal draggable slider — cyan fill, `text` knob. Persists on change. */
export function Slider({ value, min, max, step = 1, onChange }: SliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const clampToStep = (raw: number) => {
    const clamped = Math.max(min, Math.min(max, raw));
    return Math.round(clamped / step) * step;
  };

  const fromX = (x: number) => {
    if (widthRef.current === 0) return value;
    const ratio = Math.max(0, Math.min(1, x / widthRef.current));
    return clampToStep(min + ratio * (max - min));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChange(fromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChange(fromX(e.nativeEvent.locationX)),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const pct = max > min ? (value - min) / (max - min) : 0;
  const knobX = pct * width;

  return (
    <View style={styles.hit} onLayout={onLayout} {...pan.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={[styles.knob, { left: knobX - 9 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 22, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.stroke, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accentCyan, borderRadius: 3 },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
});
