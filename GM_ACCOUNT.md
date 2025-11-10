# 🎮 Game Master (GM) Account

## Quick Access

The **GM account is automatically created** when the app starts!

### Login Credentials

```
Email:    gamemaster@stridequest.com
Password: GameMaster2024!
```

### How to Use

1. **Login** with the credentials above
2. Go to **Profile** → **Settings** ⚙️
3. Tap **Admin Panel** 👑 (orange button)
4. Manage reports and monitor chats!

---

## Admin Features

### 📋 Report Management
- **All reports from all users go to the GM account**
- View pending reports (new/unreviewed)
- View all reports (complete history)
- Each report shows:
  - Who was reported
  - Who made the report
  - Reason for the report
  - Message content (for message reports)
  - Timestamp

### 🗑️ Delete Messages (All Users)
- **GM can delete ANY message from ANY user**
- Delete from World Chat
- Delete from Guild Chats
- Delete from Private Messages
- Messages are permanently removed

### 👁️ World Chat Monitor
- Real-time world chat observation
- See all messages as they're sent
- Monitor for inappropriate content
- Quick access to delete any message

### 🛡️ User Moderation
- **Ban users** who violate rules
  - Ban is permanent across entire app
  - Banned users cannot login
  - Ban reason is tracked
- **Unban users** (coming soon)
- View complete user profiles from reports

### ⚖️ Punishment System
When reviewing a report, GM can:
1. **Delete the offending message** (if it's a message report)
2. **Ban the reported user** (for serious violations)
3. **Mark as resolved** (warning issued, no action)
4. **Dismiss** (false report, no violation found)

---

## Security Tips

⚠️ **Change the default password!**

Edit `src/services/AdminService.js`:

```javascript
export const GM_ACCOUNT = {
  email: 'gamemaster@stridequest.com',
  password: 'YOUR_NEW_SECURE_PASSWORD',  // Change this!
  displayName: 'GM',
  isAdmin: true
};
```

Then delete the old GM account from Firebase Console and restart the app.

---

**That's it! The GM account makes moderation simple and secure.** 🎮
