import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import getAppVersion from '../utils/getAppVersion';

const TERMS_TEXT = `
Terms and Agreement

Last Updated: October 31, 2025

Welcome!

This document explains the rules, your rights, and our responsibilities. Please read it carefully. By using Stride Quest, you agree to these terms. If you have questions, contact us anytime.

**Quick Summary:**
- You must be at least 13 years old to use Stride Quest.
- Respect others and use the app safely and honestly.
- Your data is protected and never sold.
- You can delete your account or data at any time.
- We may update these terms; you’ll be notified of major changes.

---

1. **What is Stride Quest?**
 Stride Quest is a social fitness app that helps you track workouts, earn XP, join clubs, and chat with friends. We encourage healthy activity and positive community engagement.

2. **Who Can Use Stride Quest?**
- You must be 13 or older.
- If you’re under 18, get permission from a parent or guardian.
- Use real information when creating your account.

3. **Your Account & Security**
- Keep your password safe and don’t share your account.
- Let us know if you notice suspicious activity.
- We’re not responsible for losses if you don’t secure your account.

4. **How to Use Stride Quest**
- Be kind and respectful in chats and groups.
- Don’t post harmful, offensive, or illegal content.
- Don’t cheat, hack, or use bots.
- Breaking these rules may result in suspension or ban.

5. **Fitness Disclaimer**
- Stride Quest is for motivation and tracking only.
- It’s not medical advice. Talk to your doctor before starting new exercise routines.
- You’re responsible for your own health and safety.

6. **Your Data & Privacy**
- We collect only what’s needed: profile info, activity stats, and chat messages.
- Your data is stored securely and never sold.
- See our Privacy Policy in Settings for details.

7. **Intellectual Property**
- All app content belongs to us or our partners.
- Don’t copy, modify, or distribute the app without permission.
- You own your profile and messages, but we can display them in the app.

8. **Community Guidelines**
- Respect others. No bullying, harassment, or sharing private info.
- We may monitor chats for safety.
- Repeated violations may result in suspension.

9. **Ending Your Account**
- We can suspend or terminate accounts for rule violations or if the app changes.
- You can delete your account anytime in Settings.

10. **Updates to These Terms**
- We may update these terms. Major changes will be announced in the app.
- Continued use means you accept the new terms.

11. **Limitation of Liability**
- We provide Stride Quest “as is.”
- We’re not liable for injuries, data loss, or technical issues.
- Use the app at your own risk.

12. **Contact Us**
- For questions or help, contact us at:
  📧 lamigokyle@gmail.com
  📧 chesedhmorales@gmail.com
  📍 Developers: Kyle Lamigo and Chesedh Morales

13. **Your Acceptance**
- By tapping “Confirm” or using Stride Quest, you confirm you’ve read and accepted these terms.

---

Thank you for being part of Stride Quest! Stay active, stay safe, and enjoy the journey.
`;

export default function TermsAgreementModal({ visible, onClose, reviewMode }) {
  const appVersion = getAppVersion();
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Terms & Agreement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll}>
            <Text style={styles.text}>{TERMS_TEXT}</Text>
          </ScrollView>
          <Text style={styles.versionText}>App Version: {appVersion}</Text>
          <TouchableOpacity style={[styles.button, reviewMode ? styles.buttonSecondary : null]} onPress={onClose}>
            <Text style={styles.buttonText}>{reviewMode ? 'Close' : 'Agree & Continue'}</Text>
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
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#c77dff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
    versionText: {
      color: '#c77dff',
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 6,
      marginTop: 2,
      letterSpacing: 1,
    },
});
