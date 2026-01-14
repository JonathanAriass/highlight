import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useImagePicker } from '../hooks';

interface ImageCaptureProps {
  onImageCaptured: (uri: string) => void;
}

export function ImageCapture({ onImageCaptured }: ImageCaptureProps) {
  const { isLoading, error, pickFromCamera, pickFromGallery } = useImagePicker();

  const handleCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) {
      onImageCaptured(uri);
    }
  };

  const handleGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      onImageCaptured(uri);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture or Select Image</Text>
      <Text style={styles.subtitle}>
        Take a photo or choose from your gallery to extract text
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleCamera}>
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleGallery}>
          <Text style={styles.buttonIcon}>🖼️</Text>
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 20,
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
});
