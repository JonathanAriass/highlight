import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { TextBlock } from '../types';

interface EditModalProps {
  visible: boolean;
  block: TextBlock | null;
  onSave: (blockId: string, correctedText: string) => void;
  onClose: () => void;
}

export function EditModal({ visible, block, onSave, onClose }: EditModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (block) {
      setText(block.correctedText ?? block.text);
    }
  }, [block]);

  const handleSave = () => {
    if (block && text.trim()) {
      onSave(block.id, text.trim());
    }
    onClose();
  };

  const handleReset = () => {
    if (block) {
      setText(block.text);
    }
  };

  if (!block) return null;

  const hasChanges = text !== block.text;
  const isCurrentlyCorrected = !!block.correctedText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Text</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Original Text:</Text>
            <View style={styles.originalTextContainer}>
              <Text style={styles.originalText}>{block.text}</Text>
            </View>

            <Text style={styles.label}>
              {isCurrentlyCorrected ? 'Corrected Text:' : 'Enter Correction:'}
            </Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              placeholder="Enter corrected text..."
              placeholderTextColor="#999"
            />

            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>OCR Confidence:</Text>
              <Text
                style={[
                  styles.confidenceValue,
                  {
                    color:
                      block.confidence > 0.8
                        ? '#34C759'
                        : block.confidence > 0.5
                          ? '#FFcc00'
                          : '#FF3B30',
                  },
                ]}
              >
                {Math.round(block.confidence * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            {hasChanges && (
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  originalTextContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  originalText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 'auto',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
