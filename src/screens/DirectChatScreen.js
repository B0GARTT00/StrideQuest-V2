import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import * as ChatService from '../services/ChatService';
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
    return () => unsub && unsub();
  }, [me?.id, otherUserId]);

  const send = async () => {
    if (!input.trim() || !me?.id) return;
    const text = input;
    setInput('');
    await ChatService.sendPrivateMessage(me.id, otherUserId, me.name, text);
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === me?.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.me : styles.them]}>
        {!isMe && (
          <Text style={styles.sender}>{item.senderName || 'Unknown'}</Text>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      <Header title={userName || 'Chat'} showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
