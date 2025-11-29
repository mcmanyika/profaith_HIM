import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { supabase } from '../config/supabase';
import ScreenTemplate from '../components/ScreenTemplate';

export default function MoreScreen({ onNavigate, onLogout }) {
  const [navigationLinks, setNavigationLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_level')
          .eq('id', user.id)
          .single();

        const level = profile?.user_level || 1;
        setUserLevel(level);

        const { data, error } = await supabase
          .from('navigation_links')
          .select('*')
          .eq('is_active', true)
          .lte('min_user_level', level)
          .order('display_order', { ascending: true });

        if (error) throw error;

        // Filter out the items already in bottom nav and Members
        const bottomNavItems = ['Dashboard', 'Give Now', 'Profile', 'Announcements', 'More'];
        const moreLinks = (data || []).filter(
          link => !bottomNavItems.includes(link.name) && link.name !== 'Members'
        );

        setNavigationLinks(moreLinks);
      } catch (error) {
        console.error('Error fetching navigation links:', error);
        setNavigationLinks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNavigationData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScreenTemplate
      title="More"
      activeScreen="/more"
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {navigationLinks.length > 0 ? (
          <View style={styles.linksList}>
            {navigationLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.linkItem}
                onPress={async () => {
                  if (link.href) {
                    // Check if it's an external URL
                    if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
                      // External URL - open in browser
                      try {
                        const canOpen = await Linking.canOpenURL(link.href);
                        if (canOpen) {
                          await Linking.openURL(link.href);
                        } else {
                          Alert.alert('Error', 'Cannot open this link.');
                        }
                      } catch (error) {
                        console.error('Error opening URL:', error);
                        Alert.alert('Error', 'Failed to open link.');
                      }
                    } else {
                      // Internal route - check if it's a known route
                      const knownRoutes = ['/dashboard', '/profile', '/announcements', '/transactions', '/more', '/give', '/payments'];
                      const isKnownRoute = knownRoutes.some(route => link.href === route || link.href.startsWith(route + '/'));
                      
                      if (isKnownRoute && onNavigate) {
                        // Map some routes to their mobile equivalents
                        let routeToNavigate = link.href;
                        if (link.href === '/payments') {
                          routeToNavigate = '/give';
                        } else if (link.href === '/account') {
                          routeToNavigate = '/dashboard';
                        }
                        onNavigate(routeToNavigate, link.name);
                      } else {
                        // Unknown route - show coming soon
                        Alert.alert('Coming Soon', `${link.name} will be available soon.`);
                      }
                    }
                  } else {
                    Alert.alert('Coming Soon', `${link.name} will be available soon.`);
                  }
                }}
              >
                <Text style={styles.linkText}>{link.name}</Text>
                <Text style={styles.linkArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No additional options available.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  linksList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 24,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  linkText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  linkArrow: {
    fontSize: 20,
    color: '#999',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

