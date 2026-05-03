// TALIX React Native — LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const THEME = { primary: '#1B4FBE', accent: '#F5A623' };

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !pass) { Alert.alert('Error', 'Completa todos los campos'); return; }
    setLoading(true);
    try {
      await login(email, pass);
    } catch (e) {
      Alert.alert('Error', 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>♻️</Text>
          <Text style={styles.heroTitle}>TALIX</Text>
          <Text style={styles.heroSub}>Trueque Universitario · USIL</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput style={styles.input} placeholder="tu.nombre@usil.edu.pe" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#AAA" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput style={styles.input} placeholder="Contraseña" value={pass} onChangeText={setPass} secureTextEntry placeholderTextColor="#AAA" />
          </View>
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Ingresando...' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>¿No tienes cuenta? <Text style={{ color: THEME.primary, fontWeight:'700' }}>Regístrate</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#fff' },
  container: { flexGrow:1, paddingHorizontal:28, paddingBottom:40 },
  hero: { alignItems:'center', paddingTop:60, paddingBottom:40 },
  heroIcon: { fontSize:64, marginBottom:12 },
  heroTitle: { fontSize:44, fontWeight:'800', color:'#1C2B2B', letterSpacing:-2 },
  heroSub: { fontSize:15, color:'#888', marginTop:4 },
  form: { gap:0 },
  formTitle: { fontSize:24, fontWeight:'700', color:'#1C2B2B', marginBottom:24 },
  inputWrap: { flexDirection:'row', alignItems:'center', backgroundColor:'#F4F6F0', borderRadius:14, paddingHorizontal:14, marginBottom:14 },
  inputIcon: { fontSize:16, marginRight:10 },
  input: { flex:1, paddingVertical:14, fontSize:14, color:'#1C2B2B' },
  btn: { backgroundColor: THEME.primary, borderRadius:100, paddingVertical:15, alignItems:'center', marginTop:8 },
  btnDisabled: { opacity:0.6 },
  btnText: { color:'#fff', fontSize:16, fontWeight:'700' },
  link: { alignItems:'center', marginTop:20 },
  linkText: { fontSize:14, color:'#888' },
});
