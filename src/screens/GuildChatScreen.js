import React, { useEffect, useState, useContext, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import GuildService from '../services/GuildService';
import ReportService from '../services/ReportService';
import { AppContext } from '../context/AppState';

export default function GuildChatScreen({ route, navigation }) {
  const { guildId } = route.params;
  const { getCurrentUserProfile } = useContext(AppContext);
  const me = getCurrentUserProfile;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = GuildService.subscribeToGuildMessages(guildId, (msgs) => {
      setMessages(msgs);
      // Scroll to end when new messages arrive
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
    });
    return () => unsub && unsub();
  }, [guildId]);

  // Mark chat as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (me?.id) {
        GuildService.setGuildChatRead(guildId, me.id);
      }
      return () => {};
    }, [guildId, me?.id])
  );

  const send = async () => {
    if (!input.trim()) return;
    const payload = { userId: me?.id, userName: me?.name };
    const text = input;
    setInput('');
    await GuildService.sendGuildMessage(guildId, payload, text);
    // After sending, mark as read
    if (me?.id) {
      GuildService.setGuildChatRead(guildId, me.id);
    }
  };

  const handleDelete = async (messageId) => {
    if (!me?.id) return;
    const res = await GuildService.deleteGuildMessage(guildId, messageId, me.id);
    if (!res.success) {
      console.error('Failed to delete message:', res.message);
    }
  };

  const handleReport = async (item) => {
    Alert.alert(
      'Report Message',
      'Why are you reporting this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Spam', 
          onPress: () => submitReport(item, 'Spam')
        },
        { 
          text: 'Harassment', 
          onPress: () => submitReport(item, 'Harassment')
        },
        { 
          text: 'Inappropriate Content', 
          onPress: () => submitReport(item, 'Inappropriate Content')
        },
        { 
          text: 'Other', 
          onPress: () => submitReport(item, 'Other')
        }
      ]
    );
  };

  const submitReport = async (item, reason) => {
    const res = await ReportService.reportMessage({
      reporterId: me?.id,
      reporterName: me?.name || 'Unknown',
      reportedUserId: item.senderId,
      reportedUserName: item.senderName,
      messageId: item.id,
      messageText: item.text,
      chatType: 'guild',
      chatId: guildId,
      reason: reason,
      details: ''
    });

    if (res.success) {
      Alert.alert('Success', 'Report submitted. Thank you for helping keep our community safe.');
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleLongPress = (item) => {
    const isMe = item.senderId === me?.id;
    
    if (isMe) {
      // Show delete option for own messages
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => handleDelete(item.id)
          }
        ]
      );
    } else {
      // Show report option for others' messages
      handleReport(item);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === me?.id;
    return (
      <TouchableOpacity 
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
        style={[styles.msgRow, isMe ? styles.me : styles.them]}
      >
        {!isMe && (
          <Text style={styles.sender}>{item.senderName || 'Unknown'}</Text>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={globalStyles.container}>
      <Header title="Club Chat" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder="Message your club..."
            placeholderTextColor={theme.colors.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  msgRow: {
    marginVertical: 6,
    maxWidth: '80%'
  },
  me: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end'
  },
  them: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start'
  },
  sender: {
    color: theme.colors.muted,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '700'
  },
  bubble: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubbleMe: {
    backgroundColor: theme.colors.accent
  },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  msgText: {
    color: '#fff',
    fontSize: 14
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 14,
    color: theme.colors.text,
    height: 44
  },
  sendBtn: {
    marginLeft: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendText: {
    color: '#1a0f2e',
    fontWeight: '900'
  }
});
