import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { AppContext } from '../context/AppState';
import ChatService from '../services/ChatService';

export default function WorldChatScreen() {
  const { currentUser, getCurrentUserProfile } = useContext(AppContext);
  const me = getCurrentUserProfile || { id: currentUser?.uid, name: 'You' };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = ChatService.subscribeWorldChat(setMessages);
    return () => unsub && unsub();
  }, []);

  const send = async () => {
    if (!currentUser?.uid) return; // optionally navigate to login
    const name = me?.name || 'Unknown';
    const res = await ChatService.sendWorldMessage(currentUser.uid, name, input);
    if (res.success) setInput('');
  };

  const renderItem = ({ item }) => {
    const mine = item.userId === currentUser?.uid;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={styles.name}>{mine ? 'You' : item.userName || 'User'}</Text>
          <Text style={styles.text}>{item.text}</Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      <Header title="World Chat" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.muted }}>No messages yet. Say hi 👋</Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message the world..."
            placeholderTextColor={theme.colors.muted}
            value={input}
            onChangeText={setInput}
            maxLength={500}
          />
          <TouchableOpacity style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]} onPress={send} disabled={!input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 88 },
  bubbleRow: { marginVertical: 6, flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1
  },
  bubbleMine: {
    backgroundColor: 'rgba(199, 125, 255, 0.15)',
    borderColor: 'rgba(199, 125, 255, 0.35)'
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)'
  },
  name: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  time: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginBottom: 72
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text
  },
  sendBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  sendText: {
    color: '#fff',
    fontWeight: '900'
  }
});
