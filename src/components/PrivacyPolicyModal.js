import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const PRIVACY_TEXT = `
Privacy Policy

Last Updated: Novemeber 12, 2025

Welcome!

Your privacy matters to us. This Privacy Policy explains how we collect, use, store, and protect your information when you use the Stride Quest mobile app (the “App”).
By creating an account or using Stride Quest, you agree to this Privacy Policy.

1. What Data We Collect
We collect only the data necessary to operate and improve Stride Quest’s fitness tracking and social features.

1.1 Profile Information
Name and email
Avatar/profile picture
User ID and account type
Equipped titles and ranks

1.2 Activity Data
Experience points (XP), level, and rank progress
Activity history (distance, duration, type, and stats)
Total activity summaries and milestones

1.3 Friends & Social Data
Friend list and friend requests (sent/received)
Club memberships and participation

1.4 Chat Data
Messages sent in world, club, and private/direct chats
Sender and recipient IDs, timestamps, and message content

1.5 Device Data
Device ID and OS version
Usage and crash logs (for analytics and debugging)

2. How We Use Your Data
We use collected data only for the purpose of operating and improving the app.

We use your data to:
- Display your profile, rank, activities, friends, and chat messages.
- Enable friend requests, club participation, and private or group messaging.
- Calculate XP, levels, and achievements based on your activity data.
- Send you friend request alerts, chat updates, and activity reminders.
- Detect bugs, optimize performance, and understand which features are most useful (using aggregated, non-identifiable analytics).

We do not use your data for targeted advertising or sell it to third parties.

3. Data Storage & Security
Storage
All user data is securely stored using Firebase Firestore and Firebase Realtime Database (Google Cloud).

Security
Access to data is controlled through Firebase Authentication and custom security rules.
Users can access only their own data and authorized social features (friends/clubs).
Data is encrypted in transit (HTTPS) and at rest (Firebase encryption).
We apply industry-standard practices to safeguard your information, but no online platform is completely risk-free. Users are encouraged to use strong passwords and report suspicious activity.

4. Data Sharing
4.1 With Other Users
Your profile, rank, and activity stats are visible to other users in social contexts (e.g., friends, clubs, chat).
Your chat messages are visible only to participants in that conversation or chat channel.

4.2 With Service Providers
We use the following third-party providers solely for app functionality:
Firebase (Google LLC) – for authentication, database, and hosting.
Expo – for device APIs (e.g., image picker, fonts).

4.3 Legal Disclosure
We may disclose limited information if required by law or to respond to lawful government requests.

4.4 No Sale of Data
We do not sell, trade, or rent user data to any third parties.

5. User Control and Choices
You have full control over your data within Stride Quest:
Profile Editing: Update your name, avatar, or equipped titles anytime.
Friend Management: Add, remove, or decline friend requests.
Club: Join or leave clubs at will.
Chat Management: Delete your own messages (if feature available).
Account Deletion: You can request complete account deletion through the app or by contacting support.
Data Requests: You may request a copy or deletion of your personal data at any time.

6. Data Retention
Account Data: Retained as long as your account is active.
Deleted Accounts: All associated data (profile, activities, chats) is deleted, except as required by law.
Chat History: Stored as long as your account exists or until you delete it (if feature available).

7. Third-Party Services
Stride Quest uses limited third-party services to function properly:

 • Firebase Authentication (Google LLC): Secure user login and account management
 • Firebase Firestore / Realtime Database (Google LLC): Data storage and real-time features
 • Expo SDK (Expo): Device APIs for fonts, images, and notifications

 We do not include advertising SDKs or unrelated tracking services.

 For details on Firebase’s privacy practices, visit:
 https://policies.google.com/privacy

8. Stride Quest complies with the Data Privacy Act of 2012 (Republic Act No. 10173).

As a user, you have the following rights under the Philippine Data Privacy Act:

1. The right to be informed about the collection and use of your personal data.
2. The right to access your personal data.
3. The right to correct any inaccuracies in your personal data.
4. The right to object to the processing of your personal data.
5. The right to erasure or blocking of your personal data.
6. The right to data portability.

We will respond in accordance with the guidelines of the National Privacy Commission (NPC).

9. Changes to This Policy
We may update this Privacy Policy periodically to reflect new features or legal requirements.
When changes occur:
The new version will be published in-app (Settings → Privacy Policy).
Significant changes will be communicated via notification or login prompt.
Continued use of the app after updates means you accept the new policy.

10. Contact Us
For privacy questions, account deletion, or data access requests, please contact us:
📧 lamigokyle@gmail.com
📧 chesedhmorales@gmail.com
📍 Developers: Kyle Lamigo and Chesedh Morales

11. Your Consent
By using Stride Quest, you confirm that you have read, understood, and agreed to this Privacy Policy.
`;

export default function PrivacyPolicyModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll}>
            <Text style={styles.text}>{PRIVACY_TEXT}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    backgroundColor: '#1a0f2e',
    borderRadius: 12,
    padding: 18,
    maxHeight: '84%',
    borderWidth: 2,
    borderColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e0aaff',
    fontFamily: 'SoloLevel',
    letterSpacing: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: '#e0aaff',
    fontSize: 18,
  },
  scroll: {
    marginBottom: 14,
    maxHeight: 420,
  },
  text: {
    fontSize: 15,
    color: '#e8dfff',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
