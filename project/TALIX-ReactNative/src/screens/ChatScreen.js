// TALIX React Native — ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const THEME = { primary: '#1B4FBE', accent: '#F5A623' };

export default function ChatScreen({ route, navigation }) {
  const { conversationId, otherUser, itemTitle } = route.params;
  const { user, userData } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const flatRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => setMsgs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [conversationId]);

  const send = async () => {
    if (!input.trim()) return;
    const msg = { text: input, fromId: user.uid, fromName: userData?.displayName || user.displayName, fromColor: userData?.avatarColor || '#1B4FBE', createdAt: new Date().toISOString(), read: false };
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), msg);
    await updateDoc(doc(db, 'conversations', conversationId), { lastMsg: input, lastTime: new Date().toISOString() });
    setInput('');
  };

  const renderMsg = ({ item }) => {
    const isMe = item.fromId === user.uid;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: item.fromColor || '#6DBE7E' }]}>
            <Text style={styles.avatarText}>{(item.fromName || 'U').split(' ').map(w=>w[0]).join('').slice(0,2)}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? { backgroundColor: THEME.primary } : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && { color:'#fff' }]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMe && { color:'rgba(255,255,255,0.6)' }]}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' }) : ''}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: otherUser?.avatarColor || '#6DBE7E' }]}>
          <Text style={styles.headerAvatarText}>{(otherUser?.displayName || 'U').split(' ').map(w=>w[0]).join('').slice(0,2)}</Text>
        </View>
        <View>
          <Text style={styles.headerName}>{otherUser?.displayName || 'Usuario'}</Text>
          {itemTitle && <Text style={styles.headerSub}>📦 {itemTitle}</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={msgs}
        renderItem={renderMsg}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput style={styles.textInput} placeholder="Escribe un mensaje..." value={input} onChangeText={setInput} onSubmitEditing={send} placeholderTextColor="#AAA" returnKeyType="send" />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: THEME.primary }]}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#F9FAF8' },
  header: { flexDirection:'row', alignItems:'center', gap:12, padding:16, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#EEE' },
  back: { padding:4 },
  backText: { fontSize:22, color:'#1C2B2B' },
  headerAvatar: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  headerAvatarText: { fontSize:14, fontWeight:'700', color:'#fff' },
  headerName: { fontSize:15, fontWeight:'700', color:'#1C2B2B' },
  headerSub: { fontSize:12, color:'#888' },
  list: { padding:16, gap:10 },
  msgRow: { flexDirection:'row', alignItems:'flex-end', gap:8 },
  msgRowMe: { justifyContent:'flex-end' },
  msgRowOther: { justifyContent:'flex-start' },
  avatar: { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  avatarText: { fontSize:10, fontWeight:'700', color:'#fff' },
  bubble: { maxWidth:'70%', padding:12, borderRadius:18, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  bubbleOther: { borderBottomLeftRadius:4 },
  bubbleText: { fontSize:14, color:'#1C2B2B', lineHeight:20 },
  bubbleTime: { fontSize:10, color:'#AAA', marginTop:4, textAlign:'right' },
  inputRow: { flexDirection:'row', alignItems:'center', padding:12, paddingBottom:24, backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#EEE', gap:10 },
  textInput: { flex:1, backgroundColor:'#F4F6F0', borderRadius:100, paddingHorizontal:18, paddingVertical:12, fontSize:14, color:'#1C2B2B' },
  sendBtn: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  sendIcon: { fontSize:18, color:'#fff' },
});
