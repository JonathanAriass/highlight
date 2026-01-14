import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { TextBlock, BoundingBox, Size } from '../types';

interface TextBlockOverlayProps {
  block: TextBlock;
  imageSize: Size;
  displaySize: Size;
  onPress: (block: TextBlock) => void;
  isSelected?: boolean;
  isDimmed?: boolean;
}

function scaleBox(
  box: BoundingBox,
  imageSize: Size,
  displaySize: Size
): { left: number; top: number; width: number; height: number } {
  const scaleX = displaySize.width / imageSize.width;
  const scaleY = displaySize.height / imageSize.height;

  return {
    left: box.x * scaleX,
    top: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

export function TextBlockOverlay({
  block,
  imageSize,
  displaySize,
  onPress,
  isSelected = false,
  isDimmed = false,
}: TextBlockOverlayProps) {
  const scaledBox = scaleBox(block.boundingBox, imageSize, displaySize);
  const isCorrected = !!block.correctedText;

  // Determine highlight color based on state
  const getBackgroundColor = () => {
    if (isDimmed) {
      return 'rgba(128, 128, 128, 0.2)'; // Gray when dimmed
    }
    if (isSelected) {
      return 'rgba(255, 204, 0, 0.5)'; // Yellow for selected
    }
    if (isCorrected) {
      return 'rgba(52, 199, 89, 0.4)'; // Green for corrected
    }
    return 'rgba(0, 122, 255, 0.3)'; // Blue for default
  };

  const getBorderColor = () => {
    if (isDimmed) {
      return '#888'; // Gray when dimmed
    }
    if (isSelected) {
      return '#FFcc00';
    }
    if (isCorrected) {
      return '#34C759';
    }
    return '#007AFF';
  };

  return (
    <TouchableOpacity
      style={[
        styles.overlay,
        {
          left: scaledBox.left,
          top: scaledBox.top,
          width: scaledBox.width,
          height: scaledBox.height,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
      onPress={() => onPress(block)}
      activeOpacity={0.7}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
});
