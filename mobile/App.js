import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/config/supabase';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import MoreScreen from './src/screens/MoreScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';

// Suppress NativeEventEmitter warnings (common in Expo Go with native modules)
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('/dashboard');
  const [openGivingModal, setOpenGivingModal] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
        <StatusBar style="dark" />
      </View>
    );
  }

  const handleNavigation = (href, name) => {
    if (href === '/give') {
      // Navigate to dashboard and open giving modal
      setCurrentScreen('/dashboard');
      setOpenGivingModal(true);
    } else {
      setCurrentScreen(href);
      setOpenGivingModal(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentScreen('/dashboard');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case '/dashboard':
        return <DashboardScreen onLogout={handleLogout} onNavigate={handleNavigation} openGivingModal={openGivingModal} onGivingModalClose={() => setOpenGivingModal(false)} />;
      case '/profile':
        return <ProfileScreen onNavigate={handleNavigation} onLogout={handleLogout} />;
      case '/announcements':
        return <AnnouncementsScreen onNavigate={handleNavigation} onLogout={handleLogout} />;
      case '/transactions':
        return <TransactionsScreen onNavigate={handleNavigation} onLogout={handleLogout} />;
      case '/more':
        return <MoreScreen onNavigate={handleNavigation} onLogout={handleLogout} />;
      default:
        return <DashboardScreen onLogout={handleLogout} onNavigate={handleNavigation} openGivingModal={openGivingModal} onGivingModalClose={() => setOpenGivingModal(false)} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {session ? renderScreen() : <LoginScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
