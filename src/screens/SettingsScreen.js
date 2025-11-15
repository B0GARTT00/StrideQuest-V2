import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TermsAgreementModal from '../components/TermsAgreementModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { theme } from '../theme/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapDownloadService from '../services/MapDownloadService';

import { deleteAccount } from '../services/FirebaseService';
import AdminService from '../services/AdminService';

import getAppVersion from '../utils/getAppVersion';

export default function SettingsScreen({ onLogout, accountInfo }) {
  const navigation = useNavigation();
  const [showTerms, setShowTerms] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [mapsDownloaded, setMapsDownloaded] = React.useState(false);
  const [isDownloadingMaps, setIsDownloadingMaps] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [mapDownloadInfo, setMapDownloadInfo] = React.useState(null);

  // Check admin status
  React.useEffect(() => {
    const checkAdmin = async () => {
      if (accountInfo?.id) {
        const adminStatus = await AdminService.isAdmin(accountInfo.id);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [accountInfo?.id]);

  // Check map download status
  React.useEffect(() => {
    const checkMapStatus = async () => {
      const info = await MapDownloadService.getDownloadInfo();
      setMapsDownloaded(info.isDownloaded);
      setMapDownloadInfo(info);
    };
    checkMapStatus();
  }, []);

  const appVersion = getAppVersion();

  const handleDownloadMaps = async () => {
    Alert.alert(
      'Download Offline Maps',
      `Download maps for Davao City (~${MapDownloadService.getEstimatedSize()} MB)? This will allow you to use map activities offline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setIsDownloadingMaps(true);
            setDownloadProgress(0);

            const result = await MapDownloadService.downloadDavaoMaps((progress) => {
              setDownloadProgress(progress.percentage);
            });

            setIsDownloadingMaps(false);

            if (result.success) {
              setMapsDownloaded(true);
              Alert.alert('Success', 'Offline maps downloaded successfully!');
            } else {
              Alert.alert('Error', 'Failed to download maps. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMaps = async () => {
    Alert.alert(
      'Delete Offline Maps',
      'Are you sure you want to delete downloaded maps? You will need internet to use map activities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await MapDownloadService.clearMaps();
            if (result.success) {
              setMapsDownloaded(false);
              Alert.alert('Success', 'Offline maps deleted.');
            } else {
              Alert.alert('Error', 'Failed to delete maps.');
            }
          }
        }
      ]
    );
  };

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
        <Text style={styles.sectionTitle}>Offline Maps</Text>
        
        {isDownloadingMaps && (
          <View style={styles.downloadProgress}>
            <Text style={styles.progressText}>Downloading... {downloadProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>
          </View>
        )}

        {mapsDownloaded ? (
          <>
            <View style={styles.mapStatus}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4ade80" />
              <Text style={styles.mapStatusText}>
                Maps downloaded {mapDownloadInfo?.downloadDate && 
                  `(${new Date(mapDownloadInfo.downloadDate).toLocaleDateString()})`}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleDeleteMaps} 
              style={[styles.button, { backgroundColor: '#ff6b6b' }]}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Delete Offline Maps</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.mapStatus}>
              <MaterialCommunityIcons name="cloud-download" size={24} color="#c77dff" />
              <Text style={styles.mapStatusText}>
                No offline maps downloaded (~{MapDownloadService.getEstimatedSize()} MB)
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleDownloadMaps} 
              style={[styles.button, { backgroundColor: '#c77dff', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
              disabled={isDownloadingMaps}
            >
              {isDownloadingMaps ? (
                <ActivityIndicator color="#0f0d12" />
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={20} color="#0f0d12" style={{ marginRight: 8 }} />
                  <Text style={[styles.buttonText, { color: '#0f0d12' }]}>Download Maps for Davao City</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.purpleCard}>
        {isAdmin && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Admin')} 
            style={[styles.button, { backgroundColor: '#ff9800', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
          >
            <MaterialCommunityIcons name="shield-crown" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.buttonText, { color: '#fff' }]}>Admin Panel</Text>
          </TouchableOpacity>
        )}
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
  mapStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    borderRadius: 8,
  },
  mapStatusText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
    flex: 1,
  },
  downloadProgress: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#c77dff',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c77dff',
    borderRadius: 4,
  },
});
