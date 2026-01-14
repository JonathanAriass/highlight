import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import type { BoundingBox, Size } from '../types';

interface SelectionOverlayProps {
  imageSize: Size;
  displaySize: Size;
  onSelectionComplete: (region: BoundingBox) => void;
  isActive: boolean;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function SelectionOverlay({
  imageSize,
  displaySize,
  onSelectionComplete,
  isActive,
}: SelectionOverlayProps) {
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const selectionRef = useRef<SelectionRect | null>(null);
  const isActiveRef = useRef(isActive);
  const imageSizeRef = useRef(imageSize);
  const displaySizeRef = useRef(displaySize);
  const onSelectionCompleteRef = useRef(onSelectionComplete);

  // Keep refs in sync with props
  isActiveRef.current = isActive;
  imageSizeRef.current = imageSize;
  displaySizeRef.current = displaySize;
  onSelectionCompleteRef.current = onSelectionComplete;

  const convertToImageCoordinates = (rect: SelectionRect): BoundingBox => {
    const scaleX = imageSizeRef.current.width / displaySizeRef.current.width;
    const scaleY = imageSizeRef.current.height / displaySizeRef.current.height;

    // Normalize to ensure positive width/height
    const left = Math.min(rect.startX, rect.endX);
    const top = Math.min(rect.startY, rect.endY);
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);

    return {
      x: left * scaleX,
      y: top * scaleY,
      width: width * scaleX,
      height: height * scaleY,
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        if (!isActiveRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const newSelection = {
          startX: locationX,
          startY: locationY,
          endX: locationX,
          endY: locationY,
        };
        selectionRef.current = newSelection;
        setSelection(newSelection);
      },
      onPanResponderMove: (evt) => {
        if (!isActiveRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        if (selectionRef.current) {
          const updatedSelection = {
            ...selectionRef.current,
            endX: locationX,
            endY: locationY,
          };
          selectionRef.current = updatedSelection;
          setSelection(updatedSelection);
        }
      },
      onPanResponderRelease: () => {
        if (!isActiveRef.current) return;
        if (selectionRef.current) {
          const rect = selectionRef.current;
          const width = Math.abs(rect.endX - rect.startX);
          const height = Math.abs(rect.endY - rect.startY);

          // Only complete if selection is large enough (at least 20x20 pixels)
          if (width >= 20 && height >= 20) {
            const imageRegion = convertToImageCoordinates(rect);
            onSelectionCompleteRef.current(imageRegion);
          }
        }
      },
    })
  ).current;

  if (!isActive) {
    return null;
  }

  // Calculate display rectangle
  const getSelectionStyle = () => {
    if (!selection) return null;

    const left = Math.min(selection.startX, selection.endX);
    const top = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);

    return {
      left,
      top,
      width,
      height,
    };
  };

  const selectionStyle = getSelectionStyle();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {selectionStyle && (
        <View
          style={[
            styles.selectionRect,
            {
              left: selectionStyle.left,
              top: selectionStyle.top,
              width: selectionStyle.width,
              height: selectionStyle.height,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  selectionRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderRadius: 4,
  },
});
