// TALIX React Native — PostItemScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';

const THEME = { primary: '#1B4FBE', accent: '#F5A623' };
const CATS = ['Libros', 'Tecnología', 'Ropa', 'Accesorios'];
const CO2 = { Libros:2.4, Tecnología:12.5, Ropa:5.0, Accesorios:3.5 };

export default function PostItemScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [want, setWant] = useState('');
  const [cat, setCat] = useState('Libros');
  const [cond, setCond] = useState('Buen estado');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const submit = async () => {
    if (!title || !desc || !want) { Alert.alert('Error', 'Completa todos los campos'); return; }
    setLoading(true);
    try {
      let photoURL = null;
      if (photo) {
        const response = await fetch(photo);
        const blob = await response.blob();
        const storageRef = ref(storage, `items/${user.uid}/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }
      const bgColors = { Libros:'#E8F5E9', Tecnología:'#E3F2FD', Ropa:'#FFF3E0', Accesorios:'#ECEFF1' };
      await addDoc(collection(db, 'items'), {
        title, description: desc, want, category: cat, condition: cond,
        photo: photoURL, bgColor: bgColors[cat] || '#F5F5F5',
        userId: user.uid, user: userData?.displayName || user.displayName,
        avatarColor: userData?.avatarColor || '#1B4FBE',
        faculty: userData?.faculty || 'USIL',
        co2: CO2[cat] || 3, likes: [], proposals: [],
        posted: 'ahora mismo', status: 'activo',
        createdAt: new Date().toISOString(),
      });
      Alert.alert('¡Publicado!', `Tu artículo "${title}" ya está disponible en TALIX 🎉`);
      setTitle(''); setDesc(''); setWant(''); setPhoto(null);
    } catch (e) { Alert.alert('Error', 'No se pudo publicar: ' + e.message); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Publicar artículo</Text>
        <Text style={styles.subtitle}>Da segunda vida a tus cosas ♻️</Text>

        {/* Photo */}
        <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
          {photo ? <Image source={{ uri: photo }} style={styles.photoPreview} /> : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Subir foto del artículo</Text>
              <Text style={styles.photoHint}>Toca para seleccionar</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Category */}
        <Text style={styles.label}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATS.map(c => (
            <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.catBtn, cat===c && { backgroundColor: THEME.primary, borderColor: THEME.primary }]}>
              <Text style={[styles.catText, cat===c && { color:'#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Condition */}
        <Text style={styles.label}>Estado</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {['Como nuevo','Buen estado','Regular'].map(c => (
            <TouchableOpacity key={c} onPress={() => setCond(c)} style={[styles.catBtn, cond===c && { backgroundColor: THEME.accent, borderColor: THEME.accent }]}>
              <Text style={[styles.catText, cond===c && { color:'#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Título del artículo *</Text>
        <TextInput style={styles.input} placeholder="Ej: Cálculo Larson 9na edición" value={title} onChangeText={setTitle} placeholderTextColor="#AAA" />

        <Text style={styles.label}>Descripción *</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="Describe el estado, detalles relevantes..." value={desc} onChangeText={setDesc} multiline numberOfLines={4} placeholderTextColor="#AAA" />

        <Text style={styles.label}>¿Qué aceptas a cambio? *</Text>
        <TextInput style={styles.input} placeholder="Ej: Física 1, audífonos, ropa talla M" value={want} onChangeText={setWant} placeholderTextColor="#AAA" />

        {/* CO2 Preview */}
        <View style={styles.co2Box}>
          <Text style={styles.co2Text}>🌿 Impacto estimado: -{CO2[cat] || 3}kg de CO₂</Text>
          <Text style={styles.co2Sub}>vs. comprar nuevo de {cat.toLowerCase()}</Text>
        </View>

        <TouchableOpacity style={[styles.submitBtn, (loading||!title||!desc||!want) && styles.submitBtnDisabled]} onPress={submit} disabled={loading||!title||!desc||!want}>
          <Text style={styles.submitText}>{loading ? '⏳ Publicando...' : 'Publicar artículo'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#F0F4FA' },
  container: { padding:24, paddingBottom:100 },
  title: { fontSize:24, fontWeight:'800', color:'#1C2B2B', letterSpacing:-0.5 },
  subtitle: { fontSize:14, color:'#888', marginBottom:20 },
  photoBox: { height:180, backgroundColor:'#E8EDF8', borderRadius:20, overflow:'hidden', marginBottom:20, borderWidth:2, borderColor:'#C8D8E8', borderStyle:'dashed' },
  photoPreview: { width:'100%', height:'100%' },
  photoPlaceholder: { flex:1, alignItems:'center', justifyContent:'center' },
  photoIcon: { fontSize:44, marginBottom:8 },
  photoText: { fontSize:14, fontWeight:'600', color:'#888' },
  photoHint: { fontSize:12, color:'#AAA', marginTop:4 },
  label: { fontSize:13, fontWeight:'600', color:'#444', marginBottom:8, marginTop:16 },
  catScroll: { flexGrow:0, marginBottom:4 },
  catBtn: { paddingHorizontal:16, paddingVertical:9, borderRadius:100, borderWidth:1.5, borderColor:'#DDD', backgroundColor:'#fff', marginRight:8 },
  catText: { fontSize:13, fontWeight:'600', color:'#555' },
  input: { backgroundColor:'#fff', borderRadius:14, padding:14, fontSize:14, color:'#1C2B2B', borderWidth:1.5, borderColor:'#E8EDE8' },
  textarea: { height:100, textAlignVertical:'top' },
  co2Box: { backgroundColor:'rgba(27,79,190,0.08)', borderRadius:16, padding:16, marginTop:20 },
  co2Text: { fontSize:15, fontWeight:'700', color:'#1B4FBE' },
  co2Sub: { fontSize:12, color:'#666', marginTop:3 },
  submitBtn: { backgroundColor:'#1B4FBE', borderRadius:100, paddingVertical:16, alignItems:'center', marginTop:24 },
  submitBtnDisabled: { opacity:0.5 },
  submitText: { color:'#fff', fontSize:16, fontWeight:'700' },
});
