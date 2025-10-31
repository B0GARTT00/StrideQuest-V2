import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const TERMS_TEXT = `
Stride Quest Terms & Agreement

1. Acceptance of Terms
By using this app, you agree to abide by all rules and policies outlined herein.

2. User Conduct
You agree not to misuse the app or engage in prohibited activities.

3. Privacy
Your data is handled according to our privacy policy.

4. Liability
Stride Quest is not liable for any damages resulting from app usage.

5. Changes
Terms may be updated. Continued use means acceptance of changes.

For full details, contact support.
`;

export default function TermsAgreementModal({ visible, onClose, reviewMode }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Terms & Agreement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll}>
            <Text style={styles.text}>{TERMS_TEXT}</Text>
          </ScrollView>
          <TouchableOpacity style={[styles.button, reviewMode ? styles.buttonSecondary : null]} onPress={onClose}>
            <Text style={styles.buttonText}>{reviewMode ? 'Close' : 'Agree & Continue'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    backgroundColor: '#1a0f2e',
    borderRadius: 12,
    padding: 18,
    maxHeight: '84%',
    borderWidth: 2,
    borderColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e0aaff',
    fontFamily: 'SoloLevel',
    letterSpacing: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: '#e0aaff',
    fontSize: 18,
  },
  scroll: {
    marginBottom: 14,
    maxHeight: 420,
  },
  text: {
    fontSize: 15,
    color: '#e8dfff',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#c77dff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
