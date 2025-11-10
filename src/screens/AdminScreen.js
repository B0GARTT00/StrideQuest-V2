import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, FlatList, Modal } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { AppContext } from '../context/AppState';
import AdminService from '../services/AdminService';
import * as ChatService from '../services/ChatService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

export default function AdminScreen({ navigation }) {
  const { currentUser } = useContext(AppContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending', 'all'
  const [refreshing, setRefreshing] = useState(false);
  const [worldChatMessages, setWorldChatMessages] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWorldChat, setShowWorldChat] = useState(false);
  const [selectedTab, setSelectedTab] = useState('reports'); // 'reports' or 'worldchat'
  const [showBanModal, setShowBanModal] = useState(false);
  const [banSeverity, setBanSeverity] = useState('warning');
  const [banDuration, setBanDuration] = useState(1);

  // Check if user is admin on mount
  useEffect(() => {
    checkAdminStatus();
  }, [currentUser]);

  const checkAdminStatus = async () => {
    if (!currentUser?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const adminStatus = await AdminService.isAdmin(currentUser.uid);
    setIsAdmin(adminStatus);
    setLoading(false);

    if (adminStatus) {
      loadReports();
    }
  };

  // Subscribe to world chat for monitoring
  useEffect(() => {
    if (!isAdmin) return;
    
    const unsub = ChatService.subscribeWorldChat((messages) => {
      setWorldChatMessages(messages);
    });

    return () => unsub && unsub();
  }, [isAdmin]);

  // Reload reports when filter changes
  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [filter]);

  const loadReports = async () => {
    setRefreshing(true);
    let result;
    
    if (filter === 'pending') {
      result = await AdminService.getPendingReports();
    } else {
      result = await AdminService.getAllReports();
    }

    if (result.success) {
      setReports(result.data);
    }
    setRefreshing(false);
  };

  const handleResolveReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const resolveReport = async (resolution) => {
    if (!selectedReport) return;

    const res = await AdminService.resolveReport(currentUser.uid, selectedReport.id, resolution);
    if (res.success) {
      Alert.alert('Success', 'Report has been resolved');
      loadReports();
      setShowReportModal(false);
      setSelectedReport(null);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const dismissReport = async () => {
    if (!selectedReport) return;

    const res = await AdminService.dismissReport(currentUser.uid, selectedReport.id, 'No action needed');
    if (res.success) {
      Alert.alert('Success', 'Report has been dismissed');
      loadReports();
      setShowReportModal(false);
      setSelectedReport(null);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const deleteReportedMessage = async () => {
    if (!selectedReport || selectedReport.type !== 'message') return;

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await AdminService.deleteMessageAsAdmin(
              currentUser.uid,
              selectedReport.messageId,
              selectedReport.chatType,
              selectedReport.chatId
            );
            if (res.success) {
              Alert.alert('Success', 'Message deleted');
              await resolveReport('Message deleted by admin');
            } else {
              Alert.alert('Error', res.message);
            }
          }
        }
      ]
    );
  };

  const banReportedUser = async () => {
    if (!selectedReport) return;
    setShowBanModal(true);
  };

  const executeBan = async () => {
    if (!selectedReport) return;

    const res = await AdminService.banUser(
      currentUser.uid,
      selectedReport.reportedUserId,
      selectedReport.reason,
      banSeverity,
      banDuration
    );
    
    if (res.success) {
      Alert.alert('Success', res.message);
      setShowBanModal(false);
      await resolveReport(res.message);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const renderReport = ({ item }) => {
    const isMessage = item.type === 'message';
    const statusColor = item.status === 'pending' ? '#ff9800' : item.status === 'resolved' ? '#4caf50' : '#9e9e9e';

    return (
      <TouchableOpacity
        style={[styles.reportCard, { borderLeftColor: statusColor }]}
        onPress={() => handleResolveReport(item)}
      >
        <View style={styles.reportHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportType}>
              {isMessage ? '💬 Message Report' : '👤 User Report'}
            </Text>
            <Text style={styles.reportReason}>{item.reason}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.reportBody}>
          <Text style={styles.reportLabel}>Reported User:</Text>
          <Text style={styles.reportValue}>{item.reportedUserName}</Text>

          {isMessage && (
            <>
              <Text style={[styles.reportLabel, { marginTop: 8 }]}>Message:</Text>
              <Text style={styles.reportMessage}>{item.messageText}</Text>
              <Text style={[styles.reportLabel, { marginTop: 4 }]}>
                Chat: {item.chatType}
              </Text>
            </>
          )}

          <Text style={[styles.reportLabel, { marginTop: 8 }]}>Reported by:</Text>
          <Text style={styles.reportValue}>{item.reporterName}</Text>

          <Text style={[styles.reportLabel, { marginTop: 4 }]}>
            {new Date(item.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderWorldChatMessage = ({ item }) => {
    const messageDate = new Date(item.timestamp);
    const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.chatMessageCard}>
        <View style={styles.chatMessageHeader}>
          <Text style={styles.chatUsername}>{item.username}</Text>
          <Text style={styles.chatTime}>{timeString}</Text>
        </View>
        <Text style={styles.chatMessageText}>{item.text}</Text>
        <TouchableOpacity
          style={styles.deleteMessageButton}
          onPress={() => handleDeleteWorldMessage(item)}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#f44336" />
          <Text style={styles.deleteMessageText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleDeleteWorldMessage = (message) => {
    Alert.alert(
      'Delete Message',
      `Delete message from ${message.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await AdminService.deleteMessageAsAdmin(
              currentUser.uid,
              message.id,
              'world',
              null
            );
            if (res.success) {
              Alert.alert('Success', 'Message deleted from World Chat');
            } else {
              Alert.alert('Error', res.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <Header title="Admin Panel" showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={globalStyles.container}>
        <Header title="Admin Panel" showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="shield-lock" size={64} color={theme.colors.muted} />
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            Access Denied
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            You don't have permission to access the Admin Panel
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Header title="Admin Panel" showBack onBack={() => navigation.goBack()} />

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'reports' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('reports')}
        >
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={20} 
            color={selectedTab === 'reports' ? '#fff' : theme.colors.muted} 
          />
          <Text style={[styles.tabText, selectedTab === 'reports' && styles.tabTextActive]}>
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'worldchat' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('worldchat')}
        >
          <MaterialCommunityIcons 
            name="earth" 
            size={20} 
            color={selectedTab === 'worldchat' ? '#fff' : theme.colors.muted} 
          />
          <Text style={[styles.tabText, selectedTab === 'worldchat' && styles.tabTextActive]}>
            World Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports Tab */}
      {selectedTab === 'reports' && (
        <>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All Reports
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderReport}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadReports} tintColor={theme.colors.accent} />
            }
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.muted }}>No reports to display</Text>
              </View>
            }
          />
        </>
      )}

      {/* World Chat Tab */}
      {selectedTab === 'worldchat' && (
        <View style={{ flex: 1 }}>
          <View style={styles.worldChatHeader}>
            <MaterialCommunityIcons name="eye" size={20} color={theme.colors.accent} />
            <Text style={styles.worldChatHeaderText}>
              Monitoring {worldChatMessages.length} messages
            </Text>
          </View>
          <FlatList
            data={worldChatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderWorldChatMessage}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <MaterialCommunityIcons name="chat-outline" size={48} color={theme.colors.muted} />
                <Text style={{ color: theme.colors.muted, marginTop: 12 }}>No messages in World Chat</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Report Detail Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Type:</Text>
                <Text style={styles.modalValue}>
                  {selectedReport.type === 'message' ? 'Message Report' : 'User Report'}
                </Text>

                <Text style={[styles.modalLabel, { marginTop: 12 }]}>Reason:</Text>
                <Text style={styles.modalValue}>{selectedReport.reason}</Text>

                <Text style={[styles.modalLabel, { marginTop: 12 }]}>Reported User:</Text>
                <Text style={styles.modalValue}>{selectedReport.reportedUserName}</Text>

                {selectedReport.type === 'message' && (
                  <>
                    <Text style={[styles.modalLabel, { marginTop: 12 }]}>Message:</Text>
                    <Text style={[styles.modalValue, { fontStyle: 'italic' }]}>
                      "{selectedReport.messageText}"
                    </Text>
                  </>
                )}

                <Text style={[styles.modalLabel, { marginTop: 12 }]}>Reported By:</Text>
                <Text style={styles.modalValue}>{selectedReport.reporterName}</Text>

                <View style={styles.actionButtons}>
                  {selectedReport.type === 'message' && (
                    <TouchableOpacity style={styles.actionButton} onPress={deleteReportedMessage}>
                      <MaterialCommunityIcons name="delete" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Delete Message</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f44336' }]} onPress={banReportedUser}>
                    <MaterialCommunityIcons name="account-cancel" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Ban User</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4caf50' }]} onPress={() => resolveReport('Reviewed - No action taken')}>
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.muted }]} onPress={dismissReport}>
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Ban Options Modal */}
      <Modal
        visible={showBanModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ban User</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReport && (
                <>
                  <Text style={styles.modalLabel}>User to ban:</Text>
                  <Text style={styles.modalValue}>{selectedReport.reportedUserName}</Text>

                  <Text style={[styles.modalLabel, { marginTop: 16 }]}>Ban Severity:</Text>
                  
                  <TouchableOpacity
                    style={[styles.banOption, banSeverity === 'warning' && styles.banOptionSelected]}
                    onPress={() => setBanSeverity('warning')}
                  >
                    <MaterialCommunityIcons name="alert" size={24} color="#ff9800" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.banOptionTitle}>⚠️ Warning</Text>
                      <Text style={styles.banOptionDesc}>Issue a warning (no ban)</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.banOption, banSeverity === 'hours' && styles.banOptionSelected]}
                    onPress={() => setBanSeverity('hours')}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={24} color="#2196f3" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.banOptionTitle}>🕐 Temporary (Hours)</Text>
                      <Text style={styles.banOptionDesc}>Ban for {banDuration} hour(s)</Text>
                    </View>
                  </TouchableOpacity>

                  {banSeverity === 'hours' && (
                    <View style={styles.durationContainer}>
                      <Text style={styles.durationLabel}>Hours:</Text>
                      <View style={styles.durationButtons}>
                        {[1, 6, 12, 24].map(h => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.durationButton, banDuration === h && styles.durationButtonActive]}
                            onPress={() => setBanDuration(h)}
                          >
                            <Text style={[styles.durationButtonText, banDuration === h && styles.durationButtonTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.banOption, banSeverity === 'days' && styles.banOptionSelected]}
                    onPress={() => setBanSeverity('days')}
                  >
                    <MaterialCommunityIcons name="calendar" size={24} color="#ff9800" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.banOptionTitle}>📅 Temporary (Days)</Text>
                      <Text style={styles.banOptionDesc}>Ban for {banDuration} day(s)</Text>
                    </View>
                  </TouchableOpacity>

                  {banSeverity === 'days' && (
                    <View style={styles.durationContainer}>
                      <Text style={styles.durationLabel}>Days:</Text>
                      <View style={styles.durationButtons}>
                        {[1, 3, 7, 14, 30].map(d => (
                          <TouchableOpacity
                            key={d}
                            style={[styles.durationButton, banDuration === d && styles.durationButtonActive]}
                            onPress={() => setBanDuration(d)}
                          >
                            <Text style={[styles.durationButtonText, banDuration === d && styles.durationButtonTextActive]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.banOption, banSeverity === 'months' && styles.banOptionSelected]}
                    onPress={() => setBanSeverity('months')}
                  >
                    <MaterialCommunityIcons name="calendar-month" size={24} color="#f44336" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.banOptionTitle}>📆 Long-term (Months)</Text>
                      <Text style={styles.banOptionDesc}>Ban for {banDuration} month(s)</Text>
                    </View>
                  </TouchableOpacity>

                  {banSeverity === 'months' && (
                    <View style={styles.durationContainer}>
                      <Text style={styles.durationLabel}>Months:</Text>
                      <View style={styles.durationButtons}>
                        {[1, 3, 6, 12].map(m => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.durationButton, banDuration === m && styles.durationButtonActive]}
                            onPress={() => setBanDuration(m)}
                          >
                            <Text style={[styles.durationButtonText, banDuration === m && styles.durationButtonTextActive]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.banOption, banSeverity === 'permanent' && styles.banOptionSelected]}
                    onPress={() => setBanSeverity('permanent')}
                  >
                    <MaterialCommunityIcons name="cancel" size={24} color="#d32f2f" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.banOptionTitle}>🚫 Permanent Ban</Text>
                      <Text style={styles.banOptionDesc}>Permanent account suspension</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, { marginTop: 24, backgroundColor: '#f44336' }]} 
                    onPress={executeBan}
                  >
                    <MaterialCommunityIcons name="gavel" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Execute Ban</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  logoutContainer: {
    padding: 12,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0f0d12',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0f0d12',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 12,
  },
  reportCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportType: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  reportReason: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reportBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  reportLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  reportValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  reportMessage: {
    color: theme.colors.text,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.dark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  worldChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 8,
  },
  worldChatHeaderText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chatMessageCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatUsername: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  chatTime: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  chatMessageText: {
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
  deleteMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  deleteMessageText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '700',
  },
  banOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0f0d12',
    borderRadius: 10,
    marginTop: 10,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  banOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  banOptionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  banOptionDesc: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  durationContainer: {
    marginTop: 10,
    marginLeft: 36,
    marginBottom: 8,
  },
  durationLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0f0d12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  durationButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  durationButtonText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
});
