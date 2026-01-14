import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScanHistoryList } from '../components';
import { useScans, useImagePicker } from '../hooks';
import type { RootStackParamList, Scan } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { scans, isLoading, deleteScan } = useScans();
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  const handleCapture = useCallback(async () => {
    const uri = await pickFromCamera();
    if (uri) {
      navigation.navigate('Scan', { imageUri: uri });
    }
  }, [pickFromCamera, navigation]);

  const handleGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    if (uri) {
      navigation.navigate('Scan', { imageUri: uri });
    }
  }, [pickFromGallery, navigation]);

  const handleScanPress = useCallback(
    (scan: Scan) => {
      navigation.navigate('ScanDetail', { scanId: scan.id });
    },
    [navigation]
  );

  const handleScanDelete = useCallback(
    (scanId: string) => {
      deleteScan(scanId);
    },
    [deleteScan]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OCR Scanner</Text>
        <Text style={styles.subtitle}>Extract and edit text from images</Text>
      </View>

      <View style={styles.captureSection}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <Text style={styles.captureIcon}>📷</Text>
          <Text style={styles.captureButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryButton} onPress={handleGallery}>
          <Text style={styles.galleryIcon}>🖼️</Text>
          <Text style={styles.galleryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        <ScanHistoryList
          scans={scans}
          onScanPress={handleScanPress}
          onScanDelete={handleScanDelete}
          isLoading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  captureSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  captureButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  captureIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  galleryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  galleryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
});
