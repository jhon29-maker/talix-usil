// TALIX React Native — AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(docRef);
        setUser(firebaseUser);
        setUserData(snap.exists() ? snap.data() : null);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const register = async (email, password, displayName, faculty) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const userDoc = {
      uid: cred.user.uid,
      email,
      displayName,
      faculty,
      swaps: 0,
      co2: 0,
      verified: true,
      joined: new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      avatarColor: ['#6DBE7E','#5B9BD5','#F5A623','#9C6BBE','#E57373'][Math.floor(Math.random()*5)],
      createdAt: new Date().toISOString(),
      status: 'activo',
      termsAccepted: false,
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);
    setUserData(userDoc);
    return cred.user;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userData, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
