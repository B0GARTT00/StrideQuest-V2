import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import * as ChatService from '../services/ChatService';
import ReportService from '../services/ReportService';
import { AppContext } from '../context/AppState';

export default function DirectChatScreen({ route, navigation }) {
  const { userId: otherUserId, userName } = route.params || {};
  const { getCurrentUserProfile } = useContext(AppContext);
  const me = getCurrentUserProfile;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!me?.id || !otherUserId) return;
    const unsub = ChatService.subscribePrivateChat(me.id, otherUserId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
    });
    
    // Mark messages as read when the chat is opened
    ChatService.markPrivateChatAsRead(me.id, otherUserId, me.id);
    
    return () => unsub && unsub();
  }, [me?.id, otherUserId]);

  const send = async () => {
    if (!input.trim() || !me?.id) return;
    const text = input;
    setInput('');
    await ChatService.sendPrivateMessage(me.id, otherUserId, me.name, text);
  };

  const handleDelete = async (messageId) => {
    if (!me?.id) return;
    const res = await ChatService.deletePrivateMessage(me.id, otherUserId, messageId, me.id);
    if (!res.success) {
      console.error('Failed to delete message:', res.error);
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
    const chatKey = [me.id, otherUserId].sort().join('_');
    const res = await ReportService.reportMessage({
      reporterId: me?.id,
      reporterName: me?.name || 'Unknown',
      reportedUserId: item.senderId,
      reportedUserName: item.senderName,
      messageId: item.id,
      messageText: item.text,
      chatType: 'private',
      chatId: chatKey,
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
      <Header title={userName || 'Chat'} showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${userName || 'user'}...`}
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
