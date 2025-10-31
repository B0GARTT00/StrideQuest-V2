import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import TermsAgreementModal from '../components/TermsAgreementModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { theme } from '../theme/ThemeProvider';

import { deleteAccount } from '../services/FirebaseService';
import { Alert } from 'react-native';

import getAppVersion from '../utils/getAppVersion';

export default function SettingsScreen({ navigation, onLogout, accountInfo }) {
  const [showTerms, setShowTerms] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);

  const appVersion = getAppVersion();

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accountInfo?.id) return;
            const result = await deleteAccount(accountInfo.id);
            if (result.success) {
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              onLogout && onLogout();
            } else {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.purpleCard}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{accountInfo?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{accountInfo?.email || 'Unknown'}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{accountInfo?.id ? accountInfo.id.substring(0, 12) + '...' : 'Unknown'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.purpleCard}>
        <TouchableOpacity onPress={() => setShowTerms(true)} style={styles.button}>
          <Text style={styles.buttonText}>View Terms & Agreement</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPrivacy(true)} style={[styles.button, { backgroundColor: '#6c47a6' }]}> 
          <Text style={styles.buttonText}>View Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={[styles.button, styles.logoutButton]}> 
          <Text style={[styles.buttonText, { color: '#fff' }]}>Logout</Text>
        </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAccount} style={[styles.button, { backgroundColor: '#ff3b3b' }]}> 
            <Text style={[styles.buttonText, { color: '#fff' }]}>Delete Account</Text>
          </TouchableOpacity>
      </View>

      <TermsAgreementModal visible={showTerms} onClose={() => setShowTerms(false)} reviewMode={true} />
      <PrivacyPolicyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
        <Text style={styles.versionText}>App Version: {appVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12041a',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#e0aaff',
    textAlign: 'center',
  },
  purpleCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderColor: '#c77dff',
    borderWidth: 2,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e0aaff',
  },
  infoCard: {
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.muted,
    flex: 1,
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#9b59b6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
  },
    versionText: {
      color: '#c77dff',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 18,
      letterSpacing: 1,
    },
});
