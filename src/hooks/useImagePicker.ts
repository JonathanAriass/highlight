import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

interface UseImagePickerReturn {
  imageUri: string | null;
  isLoading: boolean;
  error: string | null;
  pickFromCamera: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
  clearImage: () => void;
}

export function useImagePicker(): UseImagePickerReturn {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required to take photos');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Media library permission is required to select photos');
      return false;
    }
    return true;
  };

  const pickFromCamera = useCallback(async (): Promise<string | null> => {
    setError(null);
    setIsLoading(true);

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setIsLoading(false);
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        setIsLoading(false);
        return null;
      }

      const uri = result.assets[0].uri;
      setImageUri(uri);
      setIsLoading(false);
      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture image';
      setError(message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    setError(null);
    setIsLoading(true);

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      setIsLoading(false);
      return null;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        setIsLoading(false);
        return null;
      }

      const uri = result.assets[0].uri;
      setImageUri(uri);
      setIsLoading(false);
      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select image';
      setError(message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageUri(null);
    setError(null);
  }, []);

  return {
    imageUri,
    isLoading,
    error,
    pickFromCamera,
    pickFromGallery,
    clearImage,
  };
}
