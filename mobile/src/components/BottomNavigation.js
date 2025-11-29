import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

// Icon mapping to Ionicons (using appropriate icons)
const iconMap = {
  'HomeIcon': 'home-outline',
  'BriefcaseIcon': 'heart-outline',
  'UserIcon': 'person-outline',
  'MegaphoneIcon': 'megaphone-outline',
  'DocumentTextIcon': 'menu-outline',
};

// Default icons for each navigation item (outline for inactive, filled for active)
const defaultIconMap = {
  '/dashboard': 'home-outline',
  '/give': 'heart-outline',
  '/profile': 'person-outline',
  '/announcements': 'megaphone-outline',
  '/more': 'menu-outline',
};

// Active icon variants (filled versions)
const activeIconMap = {
  'home-outline': 'home',
  'heart-outline': 'heart',
  'person-outline': 'person',
  'megaphone-outline': 'megaphone',
  'menu-outline': 'menu',
};

export default function BottomNavigation({ activeScreen, onNavigate }) {
  const [navigationLinks, setNavigationLinks] = useState([]);
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user level
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_level')
          .eq('id', user.id)
          .single();

        const level = profile?.user_level || 1;
        setUserLevel(level);

        // Fetch navigation links from Supabase
        const { data, error } = await supabase
          .from('navigation_links')
          .select('*')
          .eq('is_active', true)
          .lte('min_user_level', level)
          .order('display_order', { ascending: true });

        if (error) throw error;

        // Filter to show only the 5 recommended items for bottom nav
        const bottomNavItems = [
          { name: 'Dashboard', href: '/dashboard', icon_name: 'HomeIcon', display_order: 1 },
          { name: 'Give Now', href: '/give', icon_name: 'BriefcaseIcon', display_order: 2 },
          { name: 'Profile', href: '/profile', icon_name: 'UserIcon', display_order: 3 },
          { name: 'Announcements', href: '/announcements', icon_name: 'MegaphoneIcon', display_order: 4 },
          { name: 'More', href: '/more', icon_name: 'DocumentTextIcon', display_order: 5 },
        ];

        // Try to match with Supabase links, otherwise use defaults
        const matchedLinks = bottomNavItems.map(item => {
          const dbLink = data?.find(link => 
            link.name.toLowerCase() === item.name.toLowerCase() || 
            link.href === item.href
          );
          return dbLink ? { ...dbLink, href: item.href } : item;
        });

        setNavigationLinks(matchedLinks);
      } catch (error) {
        console.error('Error fetching navigation links:', error);
        // Use default links on error
        setNavigationLinks([
          { name: 'Dashboard', href: '/dashboard', icon_name: 'HomeIcon', display_order: 1 },
          { name: 'Give Now', href: '/give', icon_name: 'BriefcaseIcon', display_order: 2 },
          { name: 'Profile', href: '/profile', icon_name: 'UserIcon', display_order: 3 },
          { name: 'Announcements', href: '/announcements', icon_name: 'MegaphoneIcon', display_order: 4 },
          { name: 'More', href: '/more', icon_name: 'DocumentTextIcon', display_order: 5 },
        ]);
      }
    };

    fetchNavigationData();
  }, []);

  const handlePress = (link) => {
    if (onNavigate) {
      onNavigate(link.href, link.name);
    }
  };

  return (
    <View style={styles.container}>
      {navigationLinks.map((link) => {
        const baseIconName = iconMap[link.icon_name] || defaultIconMap[link.href] || 'home-outline';
        const isActive = activeScreen === link.href || 
                       (link.href === '/dashboard' && activeScreen === '/') ||
                       (link.name === 'Dashboard' && !activeScreen);
        
        // Use filled icon when active, outline when inactive
        const iconName = isActive ? (activeIconMap[baseIconName] || baseIconName.replace('-outline', '')) : baseIconName;

        return (
          <TouchableOpacity
            key={link.href}
            style={styles.navItem}
            onPress={() => handlePress(link)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isActive ? '#007AFF' : '#666'}
            />
            <Text
              style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}
            >
              {link.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

