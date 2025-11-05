# ⚔️ Stride Quest

> **Turn your fitness journey into an epic RPG adventure!** Track activities, level up, earn XP, and compete with friends in a Solo Leveling-inspired fitness app.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

## 🎮 Features

### 🏃 Activity Tracking
- **Real-time GPS tracking** for outdoor activities (run, walk, cycle)
- **Indoor activities** with timer (yoga, HIIT, treadmill)
- **Offline support** - track activities without internet, auto-sync when connected
- **Route visualization** with Leaflet map integration

### ⚡ RPG Progression System
- **Level up** by earning XP from activities
- **Stat points** to allocate (Strength, Agility, Sense, Vitality, Intelligence)
- **Rank system** from E-Rank to National Rank and Monarch
- **Exclusive Monarch titles** - compete to claim unique titles
- **Quest system** with daily, weekly, and achievement quests

### 🌍 Social Features
- **Global leaderboard** with real-time rankings
- **World chat** to connect with the community
- **Guild system** - create or join guilds, compete together
- **Direct messaging** between users
- **Friend system** with activity feed

### 🎨 UI/UX
- **Dark RPG theme** inspired by Solo Leveling
- **Neon/purple accent colors** with glowing effects
- **Smooth animations** and transitions
- **Responsive design** for all phone sizes
- **Safe area support** for notched devices

## 📱 Screenshots

> *Coming soon - add your screenshots here!*

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your phone (iOS/Android)
- Firebase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/B0GARTT00/StrideQuest-V2.git
cd StrideQuest-V2
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase**
- Create a Firebase project at [firebase.google.com](https://firebase.google.com)
- Enable Authentication (Email/Password)
- Enable Firestore Database
- Enable Realtime Database
- Add your Firebase config to `src/config/firebase.js`

4. **Start the development server**
```bash
npm start
```

5. **Open in Expo Go**
- Scan the QR code with your phone
- App will load in Expo Go

### Building for Production

**Android APK:**
```bash
eas build -p android --profile apk
```

**iOS (requires Apple Developer account):**
```bash
eas build -p ios --profile production
```

## 🛠️ Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Navigation:** React Navigation
- **Backend:** Firebase (Auth, Firestore, Realtime Database, Storage)
- **Maps:** Leaflet (via WebView)
- **Location:** expo-location
- **Offline Storage:** AsyncStorage
- **Network Detection:** @react-native-community/netinfo
- **Styling:** StyleSheet with custom theme

## 📂 Project Structure

```
stride-quest/
├── assets/                 # Images, fonts, icons
├── src/
│   ├── components/        # Reusable UI components
│   ├── config/           # Firebase configuration
│   ├── context/          # React Context (AppState)
│   ├── navigation/       # Navigation setup
│   ├── screens/          # App screens
│   ├── services/         # Firebase & offline services
│   ├── theme/            # Theme provider & styles
│   └── utils/            # Helper functions
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies
```

## 🎯 Roadmap

- [ ] Push notifications for quest completion
- [ ] Social sharing of activities
- [ ] Achievement badges
- [ ] Weekly challenges
- [ ] Apple Health / Google Fit integration
- [ ] Dark/light theme toggle
- [ ] Multiple language support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**B0GARTT00**
- GitHub: [@B0GARTT00](https://github.com/B0GARTT00)

## 🙏 Acknowledgments

- Inspired by **Solo Leveling** manhwa
- Built with ❤️ using React Native and Expo
- Thanks to the open-source community

---

⭐ **Star this repo if you find it helpful!** ⭐
