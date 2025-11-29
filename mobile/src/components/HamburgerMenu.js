import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HamburgerMenu({ onNavigate, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleNavigation = (href, name) => {
    setShowMenu(false);
    if (onNavigate) {
      onNavigate(href, name);
    }
  };

  const handleMenuLogout = () => {
    setShowMenu(false);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={24} color="#333" />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderText}>Menu</Text>
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                style={styles.menuCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/dashboard', 'Dashboard')}
            >
              <Ionicons name="home-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Dashboard</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/give', 'Give Now')}
            >
              <Ionicons name="heart-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Give Now</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/profile', 'Profile')}
            >
              <Ionicons name="person-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/transactions', 'All Transactions')}
            >
              <Ionicons name="list-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>All Transactions</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/announcements', 'Announcements')}
            >
              <Ionicons name="megaphone-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Announcements</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/more', 'More')}
            >
              <Ionicons name="menu-outline" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>More</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleMenuLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 60 : 60,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  menuCloseButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  menuItemTextDanger: {
    color: '#D32F2F',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
});

