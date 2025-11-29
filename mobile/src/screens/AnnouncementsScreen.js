import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../config/supabase';
import ScreenTemplate from '../components/ScreenTemplate';

export default function AnnouncementsScreen({ onNavigate, onLogout }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Try to fetch from announcements table if it exists
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching announcements:', error);
        }

        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScreenTemplate
      title="Announcements"
      activeScreen="/announcements"
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No announcements at this time.</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for updates!</Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {announcements.map((announcement) => (
              <View key={announcement.id} style={styles.announcementCard}>
                <Text style={styles.announcementTitle}>{announcement.title || 'Announcement'}</Text>
                {announcement.content && (
                  <Text style={styles.announcementContent}>{announcement.content}</Text>
                )}
                {announcement.created_at && (
                  <Text style={styles.announcementDate}>
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
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
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  announcementsList: {
    gap: 12,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 12,
    color: '#999',
  },
});

