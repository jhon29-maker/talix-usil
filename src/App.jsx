import { useState, useEffect } from 'react';
import { THEMES, TWEAK_DEFAULTS } from './config/themes';
import { Auth } from './services/auth';
import { FIREBASE_READY, auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { seedDefaultChats } from './services/chat';
import Sidebar from './components/Sidebar';
import TweaksPanel from './components/TweaksPanel';
import { TToast } from './components/ui';

import LoginPage from './screens/LoginPage';
import TermsModal from './screens/TermsModal';
import FeedPage from './screens/FeedPage';
import ItemDetailPage from './screens/ItemDetailPage';
import PostPage from './screens/PostPage';
import ChatPage from './screens/ChatPage';
import DashboardPage from './screens/DashboardPage';
import ProfilePage from './screens/ProfilePage';
import PublicProfilePage from './screens/PublicProfilePage';
import PointsPage from './screens/PointsPage';
import ElitePage from './screens/ElitePage';

import AdminLoginPage from './admin/AdminLoginPage';
import AdminDashboard from './admin/AdminDashboard';

// Seed demo chat data on first load
seedDefaultChats();

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('talix_mode') || 'student');
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('talix_logged') === '1');
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => localStorage.getItem('talix_admin') === '1');
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem('talix_terms') === '1');
  const [currentUser, setCurrentUser] = useState(() => Auth.getCurrentUser());
  const [page, setPage] = useState(() => localStorage.getItem('talix_page') || 'feed');
  const [selectedItem, setSelectedItem] = useState(null);
  const [publicUser, setPublicUser] = useState(null);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [toast, setToast] = useState(null);
  const [tweaks, setTweaks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('talix_tweaks') || 'null');
      if (!stored || stored._v !== TWEAK_DEFAULTS._v) return TWEAK_DEFAULTS;
      return stored;
    } catch { return TWEAK_DEFAULTS; }
  });

  const theme = THEMES[tweaks.theme] || THEMES.verde;

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => { localStorage.setItem('talix_mode', mode); }, [mode]);
  useEffect(() => { if (loggedIn) localStorage.setItem('talix_logged', '1'); else localStorage.removeItem('talix_logged'); }, [loggedIn]);
  useEffect(() => { if (adminLoggedIn) localStorage.setItem('talix_admin', '1'); else localStorage.removeItem('talix_admin'); }, [adminLoggedIn]);
  useEffect(() => { if (termsAccepted) localStorage.setItem('talix_terms', '1'); }, [termsAccepted]);
  useEffect(() => { localStorage.setItem('talix_page', page); }, [page]);
  useEffect(() => { localStorage.setItem('talix_tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  // Wait for Firebase Auth to restore session, ensure profile, then sync currentUser id
  useEffect(() => {
    if (!FIREBASE_READY || !loggedIn) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await Auth.ensureFirestoreProfile();
        // Re-read from localStorage so currentUser.id = Firebase UID
        const updated = Auth.getCurrentUser();
        if (updated) setCurrentUser(updated);
      }
    });
    return () => unsub();
  }, [loggedIn]);

  const handleLogin = () => {
    const user = Auth.getCurrentUser();
    setCurrentUser(user);
    setLoggedIn(true);
    if (termsAccepted) setPage('feed');
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setPage('feed');
  };

  const handleLogout = async () => {
    await Auth.logout();
    setLoggedIn(false);
    setCurrentUser(null);
    setPage('feed');
  };

  const toastEl = toast && <TToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />;
  const tweakEl = <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} />;

  // Admin flow
  if (mode === 'admin') {
    if (!adminLoggedIn) return (
      <>
        <AdminLoginPage onAdminLogin={() => setAdminLoggedIn(true)} onBack={() => setMode('student')} />
        {tweakEl}
      </>
    );
    return (
      <>
        <AdminDashboard onLogout={() => { setAdminLoggedIn(false); localStorage.removeItem('talix_admin'); setMode('student'); }} />
        {tweakEl}
      </>
    );
  }

  // Not logged in
  if (!loggedIn) return (
    <>
      <LoginPage onLogin={handleLogin} onAdminAccess={() => setMode('admin')} theme={theme} />
      {tweakEl}
    </>
  );

  // Terms gate
  if (!termsAccepted) return (
    <>
      <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, color: '#CCC' }}>♻️</div>
      </div>
      <TermsModal onAccept={handleTermsAccept} />
      {tweakEl}
    </>
  );

  // Main app
  const screenProps = { currentUser, theme, showToast, setPage };

  const renderPage = () => {
    switch (page) {
      case 'feed':          return <FeedPage {...screenProps} setSelectedItem={setSelectedItem} setPublicUser={setPublicUser} />;
      case 'detail':        return <ItemDetailPage {...screenProps} item={selectedItem} setPublicUser={setPublicUser} />;
      case 'post':          return <PostPage {...screenProps} />;
      case 'chat':          return <ChatPage {...screenProps} />;
      case 'dashboard':     return <DashboardPage {...screenProps} />;
      case 'points':        return <PointsPage {...screenProps} />;
      case 'elite':         return <ElitePage {...screenProps} setSelectedItem={setSelectedItem} />;
      case 'profile':       return <ProfilePage {...screenProps} />;
      case 'publicprofile': return <PublicProfilePage {...screenProps} userId={publicUser} />;
      default:              return <FeedPage {...screenProps} setSelectedItem={setSelectedItem} setPublicUser={setPublicUser} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, overflow: 'hidden' }}>
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} theme={theme} onLogout={handleLogout} />
      <div style={{ marginLeft: 220, flex: 1, overflowY: page === 'chat' ? 'hidden' : 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </div>
      {tweakEl}
      {toastEl}
    </div>
  );
}

export default App;
