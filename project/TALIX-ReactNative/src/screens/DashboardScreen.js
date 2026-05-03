// TALIX React Native — DashboardScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const THEME = { primary: '#1B4FBE', accent: '#F5A623' };

export default function DashboardScreen() {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const medals = ['🥇','🥈','🥉'];

  useEffect(() => {
    const uq = query(collection(db, 'users'), orderBy('swaps', 'desc'));
    const unsub1 = onSnapshot(uq, snap => setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    const iq = collection(db, 'items');
    const unsub2 = onSnapshot(iq, snap => setItems(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); };
  }, []);

  const totalCO2 = users.reduce((s,u) => s + (u.co2||0), 0).toFixed(1);
  const totalSwaps = users.reduce((s,u) => s + (u.swaps||0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🌿 Impacto Ambiental</Text>
        <Text style={styles.subtitle}>Tu contribución a la sostenibilidad USIL</Text>

        {/* My banner */}
        <View style={[styles.banner, { backgroundColor: THEME.primary }]}>
          <View>
            <Text style={styles.bannerLabel}>MI IMPACTO PERSONAL</Text>
            <Text style={styles.bannerValue}>{userData?.co2 || 0} kg</Text>
            <Text style={styles.bannerSub}>CO₂ ahorrado · {userData?.swaps || 0} trueques</Text>
          </View>
          <Text style={styles.bannerIcon}>🌳</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon:'♻️', val:totalSwaps, label:'Trueques' },
            { icon:'🌿', val:`${totalCO2}kg`, label:'CO₂ total' },
            { icon:'👥', val:users.length, label:'Usuarios' },
            { icon:'📦', val:items.length, label:'Artículos' },
          ].map((s,i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statVal, { color: THEME.primary }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Ranking */}
        <Text style={styles.sectionTitle}>🏆 Ranking de Sostenibilidad</Text>
        <View style={styles.rankingCard}>
          {users.slice(0,7).map((u,i) => {
            const pct = (u.swaps||0) / Math.max(users[0]?.swaps||1, 1) * 100;
            const isMe = u.id === userData?.uid;
            return (
              <View key={u.id} style={[styles.rankRow, isMe && { backgroundColor:`${THEME.primary}10` }]}>
                <Text style={[styles.rankPos, i < 3 && { fontSize:20 }]}>{i < 3 ? medals[i] : `#${i+1}`}</Text>
                <View style={[styles.rankAvatar, { backgroundColor: u.avatarColor || THEME.primary }]}>
                  <Text style={styles.rankAvatarText}>{(u.displayName||'U').split(' ').map(w=>w[0]).join('').slice(0,2)}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Text style={styles.rankName}>{u.displayName}</Text>
                    {isMe && <View style={[styles.meBadge, { backgroundColor: THEME.primary }]}><Text style={styles.meBadgeText}>TÚ</Text></View>}
                  </View>
                  <Text style={styles.rankSub}>{u.faculty} · {u.swaps||0} trueques</Text>
                  <View style={styles.rankBar}>
                    <View style={[styles.rankBarFill, { width:`${pct}%`, backgroundColor: i===0?THEME.accent:THEME.primary }]} />
                  </View>
                </View>
                <Text style={[styles.rankCO2, { color: THEME.primary }]}>{((u.swaps||0)*2.4).toFixed(1)}kg</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#F0F4FA' },
  container: { padding:20, paddingBottom:100 },
  title: { fontSize:24, fontWeight:'800', color:'#1C2B2B', letterSpacing:-0.5 },
  subtitle: { fontSize:13, color:'#888', marginBottom:20 },
  banner: { borderRadius:22, padding:24, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:20 },
  bannerLabel: { fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:'600', letterSpacing:1, marginBottom:4 },
  bannerValue: { fontSize:40, fontWeight:'800', color:'#fff', letterSpacing:-1 },
  bannerSub: { fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:4 },
  bannerIcon: { fontSize:56 },
  statsRow: { flexDirection:'row', gap:10, marginBottom:24 },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:18, padding:14, alignItems:'center', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6, elevation:2 },
  statIcon: { fontSize:24, marginBottom:6 },
  statVal: { fontSize:20, fontWeight:'800', letterSpacing:-0.5 },
  statLabel: { fontSize:11, color:'#888', marginTop:2 },
  sectionTitle: { fontSize:17, fontWeight:'700', color:'#1C2B2B', marginBottom:12 },
  rankingCard: { backgroundColor:'#fff', borderRadius:22, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  rankRow: { flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#F5F5F5', gap:12 },
  rankPos: { width:28, textAlign:'center', fontSize:14, fontWeight:'700', color:'#CCC' },
  rankAvatar: { width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center', flexShrink:0 },
  rankAvatarText: { fontSize:13, fontWeight:'700', color:'#fff' },
  rankInfo: { flex:1 },
  rankName: { fontSize:14, fontWeight:'600', color:'#1C2B2B' },
  rankSub: { fontSize:11, color:'#888', marginTop:2 },
  rankBar: { height:5, backgroundColor:'#F0F0F0', borderRadius:100, marginTop:6 },
  rankBarFill: { height:'100%', borderRadius:100 },
  rankCO2: { fontSize:14, fontWeight:'700', flexShrink:0 },
  meBadge: { paddingHorizontal:8, paddingVertical:2, borderRadius:100 },
  meBadgeText: { color:'#fff', fontSize:9, fontWeight:'700' },
});
