# Game Master (GM) Account Guide

## Automatic GM Account Setup

The Game Master account is **automatically created** when anyone first opens the login screen!

### GM Account Credentials

```
Email: gamemaster@stridequest.com
Password: GameMaster2024!
Display Name: GM
```

### How to Access GM Account

1. **Open the app**
2. **Login with GM credentials** (see above)
3. Go to **Profile → Settings**
4. You'll see an orange **"Admin Panel"** button 👑
5. Tap to access the admin dashboard

That's it! No manual setup required.

## Changing GM Password (Optional)

If you want to change the GM password for security:

1. Open `src/services/AdminService.js`
2. Find the `GM_ACCOUNT` object (around line 9)
3. Change the password:
```javascript
export const GM_ACCOUNT = {
  email: 'gamemaster@stridequest.com',
  password: 'YourNewPassword123!',  // Change this
  displayName: 'GM',
  isAdmin: true
};
```
4. Delete the old GM account from Firebase Console (if it exists)
5. Restart the app - new GM account will be created automatically

## Admin Features

### Report Management
- View all user and message reports
- Filter by status (Pending / All)
- Tap any report to see details and take action:
  - **Delete Message** - Remove inappropriate messages
  - **Ban User** - Permanently ban violators
  - **Mark Resolved** - Close report without action
  - **Dismiss** - Mark report as invalid

### User Moderation
- Ban users for violations
- Unban users (coming soon)
- Delete any message across all chats
- Monitor world chat in real-time

### Making Other Users Admin
Once you're an admin, you can promote others:
1. Get their user ID
2. Use the `makeAdmin` function in code, or
3. Set `isAdmin: true` directly in Firebase Console

## Database Structure

### Admin Flag
Admins have `isAdmin: true` in their user document:
```javascript
users/{userId}
  - isAdmin: true
  - name: "Admin Name"
  - ...
```

### Reports Collection
```javascript
reports/{reportId}
  - type: 'message' | 'user'
  - reporterId: string
  - reportedUserId: string
  - reason: string
  - status: 'pending' | 'resolved' | 'dismissed'
  - createdAt: timestamp
  - resolvedAt: timestamp (optional)
  - resolution: string (optional)
```

## Security Notes

⚠️ **Important:**
- Keep admin user IDs confidential
- Only grant admin access to trusted individuals
- Regularly review resolved reports
- Document major moderation actions

## Troubleshooting

**"Access Denied" when opening Admin Panel?**
- Check that your user ID is correct in `ADMIN_USER_IDS`
- Make sure you've restarted the app
- Verify your user document has `isAdmin: true` in Firebase

**Admin button not showing in Settings?**
- Wait a few seconds for the admin check to complete
- Pull down to refresh the Settings screen
- Check Firebase connectivity

**Can't see reports?**
- Make sure users have submitted reports
- Check Firebase Firestore rules allow admin read access
- Try switching between "Pending" and "All Reports" filters

## Future Enhancements

Planned admin features:
- User search and profile management
- Bulk report actions
- Admin activity logs
- Custom ban durations
- Appeal system
- Analytics dashboard
