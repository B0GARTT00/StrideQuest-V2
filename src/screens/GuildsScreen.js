import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import Header from '../components/Header';
import Card from '../components/Card';
import GuildService from '../services/GuildService';

export default function GuildsScreen({ navigation }) {
  const { getCurrentUserId, getCurrentUserProfile, loadUserData } = useContext(AppContext);
  const [guilds, setGuilds] = useState([]);
  const [myGuild, setMyGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState('⚔️');
  const [creating, setCreating] = useState(false);

  const emblems = ['⚔️', '🛡️', '👑', '🔥', '⚡', '🌟', '💎', '🏆', '🦅', '🐉', '🦁', '🐺'];

  // Reload guilds when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadGuilds();
    }, [])
  );

  useEffect(() => {
    loadGuilds();
  }, []);

  const loadGuilds = async () => {
    setLoading(true);
    
    try {
      // Get all guilds
      const result = await GuildService.getAllGuilds();
      if (result.success) {
        setGuilds(result.data || []);
      } else {
        console.log('Failed to load guilds:', result.message);
        setGuilds([]);
      }

      // Get user's guild if they have one
      const userProfile = getCurrentUserProfile; // It's already an object, not a function
      if (userProfile?.guildId) {
        const guildResult = await GuildService.getGuild(userProfile.guildId);
        if (guildResult.success) {
          setMyGuild(guildResult.data);
        } else {
          setMyGuild(null);
        }
      } else {
        setMyGuild(null);
      }
    } catch (error) {
      console.error('Error loading guilds:', error);
      setGuilds([]);
      setMyGuild(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuild = async () => {
    if (!guildName.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    setCreating(true);
    const result = await GuildService.createGuild(
      {
        name: guildName.trim(),
        description: guildDescription.trim(),
        emblem: selectedEmblem
      },
      getCurrentUserId
    );

    setCreating(false);

    if (result.success) {
      Alert.alert('Success', result.message);
      setShowCreateModal(false);
      setGuildName('');
      setGuildDescription('');
      setSelectedEmblem('⚔️');
      
      // Refresh user data to get the new guildId
      await loadUserData(getCurrentUserId);
      
      // Reload guilds to show the newly created guild
      await loadGuilds();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleJoinGuild = async (guildId) => {
    Alert.alert(
      'Join Club',
      'Are you sure you want to join this club?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            const result = await GuildService.joinGuild(guildId, getCurrentUserId);
            if (result.success) {
              Alert.alert('Success', result.message);
              
              // Refresh user data to get the new guildId
              await loadUserData(getCurrentUserId);
              
              // Reload guilds
              await loadGuilds();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  const handleLeaveGuild = async () => {
    Alert.alert(
      'Leave Club',
      'Are you sure you want to leave your club?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const result = await GuildService.leaveGuild(myGuild.id, getCurrentUserId);
            if (result.success) {
              Alert.alert('Success', result.message);
              setMyGuild(null);
              
              // Refresh user data to clear the guildId
              await loadUserData(getCurrentUserId);
              
              // Reload guilds
              await loadGuilds();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={globalStyles.container}>
      <Header title="Clubs" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Create section only when user has no guild */}
        {!myGuild && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create Your Club</Text>
            <TouchableOpacity 
              style={styles.createGuildButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createGuildButtonText}>+ Create New Club</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All Guilds Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Clubs</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} />
          ) : guilds.length === 0 ? (
            <Text style={styles.emptyText}>No clubs yet. Be the first to create one!</Text>
          ) : (
            guilds.map((guild) => (
              <Card key={guild.id} style={styles.guildCard}>
                <View style={styles.guildHeader}>
                  <Text style={styles.guildEmblem}>{guild.emblem}</Text>
                  <View style={styles.guildInfo}>
                    <Text style={styles.guildName}>{guild.name}</Text>
                    <Text style={styles.guildMeta}>
                      {guild.memberCount} members • {guild.totalXP.toLocaleString()} XP
                    </Text>
                  </View>
                </View>
                {guild.description && (
                  <Text style={styles.guildDescription} numberOfLines={2}>{guild.description}</Text>
                )}
                <View style={styles.guildActions}>
                  <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('GuildDetail', { guildId: guild.id })}
                  >
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  {!myGuild && (
                    <TouchableOpacity 
                      style={styles.joinButton}
                      onPress={() => handleJoinGuild(guild.id)}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Guild Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <TouchableWithoutFeedback>
                <ScrollView 
                  style={styles.modalContent}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
            <Text style={styles.modalTitle}>Create New Club</Text>

            <Text style={styles.label}>Club Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter club name..."
              placeholderTextColor={theme.colors.muted}
              value={guildName}
              onChangeText={setGuildName}
              maxLength={30}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your club..."
              placeholderTextColor={theme.colors.muted}
              value={guildDescription}
              onChangeText={setGuildDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <Text style={styles.label}>Choose Emblem</Text>
            <View style={styles.emblemGrid}>
              {emblems.map((emblem) => (
                <TouchableOpacity
                  key={emblem}
                  style={[
                    styles.emblemOption,
                    selectedEmblem === emblem && styles.emblemSelected
                  ]}
                  onPress={() => setSelectedEmblem(emblem)}
                >
                  <Text style={styles.emblemText}>{emblem}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleCreateGuild}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create Club</Text>
                )}
              </TouchableOpacity>
            </View>
                </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  myGuildCard: {
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    borderColor: '#c77dff',
    borderWidth: 2
  },
  guildCard: {
    marginBottom: 12
  },
  guildHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  guildEmblem: {
    fontSize: 48,
    marginRight: 12
  },
  guildInfo: {
    flex: 1
  },
  guildName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4
  },
  guildMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  guildDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20
  },
  guildActions: {
    flexDirection: 'row',
    gap: 8
  },
  viewButton: {
    flex: 1,
    backgroundColor: 'rgba(199, 125, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c77dff',
    alignItems: 'center'
  },
  viewButtonText: {
    color: '#e0aaff',
    fontWeight: '700',
    fontSize: 14
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#c77dff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  leaveButton: {
    flex: 1,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
    alignItems: 'center'
  },
  leaveButtonText: {
    color: '#f44336',
    fontWeight: '700',
    fontSize: 14
  },
  createGuildButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  createGuildButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900'
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#1a0f2e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#c77dff'
  },
  modalScrollContent: {
    padding: 24
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center'
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(199, 125, 255, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  emblemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  emblemOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(199, 125, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  emblemSelected: {
    borderColor: '#c77dff',
    backgroundColor: 'rgba(199, 125, 255, 0.2)'
  },
  emblemText: {
    fontSize: 28
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14
  },
  createButton: {
    flex: 1,
    backgroundColor: '#c77dff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  }
});
