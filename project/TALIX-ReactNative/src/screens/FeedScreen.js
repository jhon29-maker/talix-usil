// TALIX React Native — FeedScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView
} from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const THEME = { primary: '#1B4FBE', accent: '#F5A623', bg: '#F0F4FA' };
const CATS = ['Todos', 'Libros', 'Tecnología', 'Ropa', 'Accesorios'];
const EMOJI = { Libros:'📚', Tecnología:'💻', Ropa:'👕', Accesorios:'🎒' };

export default function FeedScreen({ navigation }) {
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = items.filter(i =>
    (cat === 'Todos' || i.category === cat) &&
    i.title?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ItemDetail', { item })}>
      <View style={[styles.cardImage, { backgroundColor: item.bgColor || '#F4F6F0' }]}>
        {item.photo
          ? <Image source={{ uri: item.photo }} style={styles.photo} />
          : <Text style={styles.emoji}>{EMOJI[item.category] || '📦'}</Text>
        }
        <View style={styles.co2Badge}>
          <Text style={styles.co2Text}>🌿 -{item.co2}kg CO₂</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardWant} numberOfLines={1}>Quiere: {item.want}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: item.userId })} style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: item.avatarColor || '#1B4FBE' }]}>
            <Text style={styles.avatarText}>{(item.user || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}</Text>
          </View>
          <Text style={styles.userName}>{item.user}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>TALIX</Text>
        <View style={styles.co2Community}>
          <Text style={styles.co2CommunityText}>🌿 Comunidad activa</Text>
        </View>
      </View>
      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar artículos..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#AAA"
        />
      </View>
      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContainer}>
        {CATS.map(c => (
          <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.catBtn, cat === c && { backgroundColor: THEME.primary }]}>
            <Text style={[styles.catText, cat === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* List */}
      {loading
        ? <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyText}>Sin artículos aún</Text></View>}
          />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:14 },
  logo: { fontSize:24, fontWeight:'800', color:'#1C2B2B', letterSpacing:-1 },
  co2Community: { backgroundColor:'#E8F5E9', paddingHorizontal:12, paddingVertical:6, borderRadius:100 },
  co2CommunityText: { fontSize:12, fontWeight:'600', color:'#2E7D32' },
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', marginHorizontal:20, borderRadius:14, paddingHorizontal:14, marginBottom:12, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  searchIcon: { fontSize:16, marginRight:8 },
  searchInput: { flex:1, paddingVertical:12, fontSize:14, color:'#1C2B2B' },
  catScroll: { flexGrow:0, marginBottom:12 },
  catContainer: { paddingHorizontal:20, gap:8 },
  catBtn: { paddingHorizontal:16, paddingVertical:8, borderRadius:100, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4, elevation:1 },
  catText: { fontSize:13, fontWeight:'600', color:'#555' },
  list: { paddingHorizontal:12, paddingBottom:100 },
  row: { justifyContent:'space-between', marginBottom:14 },
  card: { width:'48%', backgroundColor:'#fff', borderRadius:18, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, elevation:3 },
  cardImage: { height:130, alignItems:'center', justifyContent:'center', position:'relative' },
  photo: { width:'100%', height:'100%' },
  emoji: { fontSize:46 },
  co2Badge: { position:'absolute', bottom:8, left:8, backgroundColor:'rgba(255,255,255,0.92)', borderRadius:100, paddingHorizontal:8, paddingVertical:2 },
  co2Text: { fontSize:10, fontWeight:'600', color:'#1A7A50' },
  cardBody: { padding:12 },
  cardTitle: { fontSize:13, fontWeight:'700', color:'#1C2B2B', marginBottom:4 },
  cardWant: { fontSize:11, color:'#888', marginBottom:8 },
  userRow: { flexDirection:'row', alignItems:'center', gap:6 },
  avatar: { width:22, height:22, borderRadius:11, alignItems:'center', justifyContent:'center' },
  avatarText: { fontSize:9, fontWeight:'700', color:'#fff' },
  userName: { fontSize:11, color:'#666' },
  empty: { alignItems:'center', paddingTop:60 },
  emptyIcon: { fontSize:48, marginBottom:12 },
  emptyText: { fontSize:15, color:'#AAA', fontWeight:'600' },
});
