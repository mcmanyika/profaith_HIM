import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import HamburgerMenu from './HamburgerMenu';
import BottomNavigation from './BottomNavigation';

export default function ScreenTemplate({
  title,
  headerContent,
  children,
  activeScreen,
  onNavigate,
  onLogout,
  showBottomNav = true,
  contentStyle,
  scrollContentStyle,
}) {
  // Calculate safe top padding for status bar
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const topPadding = statusBarHeight + 20;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding, paddingBottom: showBottomNav ? 80 : 40 },
          scrollContentStyle,
        ]}
      >
        {(title || headerContent) && (
          <View style={styles.header}>
            {headerContent || (typeof title === 'string' ? (
              <Text style={styles.title}>{title}</Text>
            ) : (
              title
            ))}
            <HamburgerMenu onNavigate={onNavigate} onLogout={onLogout} />
          </View>
        )}
        {children}
      </ScrollView>
      {showBottomNav && (
        <BottomNavigation activeScreen={activeScreen} onNavigate={onNavigate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});

