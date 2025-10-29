import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { AppContext } from '../context/AppState';
import { getTier } from '../utils/ranks';
import FirebaseService from '../services/FirebaseService';

const AVAILABLE_TITLES = [
  { 
    id: 'none', 
    name: 'None', 
    description: 'No title equipped',
    requirement: 'Default',
    unlocked: true,
    color: theme.colors.muted,
    rarity: 'Common'
  },
  { 
    id: 'newbie', 
    name: 'Newbie Athlete', 
    description: 'Just starting the journey',
    requirement: 'Reach Level 1',
    unlockLevel: 1,
    color: '#4a90e2',
    rarity: 'Common'
  },
  { 
    id: 'rising', 
    name: 'Rising Star', 
    description: 'Shows great potential',
    requirement: 'Reach Level 10',
    unlockLevel: 10,
    color: '#5bc0de',
    rarity: 'Uncommon'
  },
  { 
    id: 'veteran', 
    name: 'Veteran Athlete', 
    description: 'Experienced in the field',
    requirement: 'Reach Level 20',
    unlockLevel: 20,
    color: '#9b59b6',
    rarity: 'Rare'
  },
  { 
    id: 'elite', 
    name: 'Elite Athlete', 
    description: 'Among the best',
    requirement: 'Reach Level 30',
    unlockLevel: 30,
    color: '#e74c3c',
    rarity: 'Epic'
  },
  { 
    id: 'master', 
    name: 'Master Athlete', 
    description: 'A true master of the craft',
    requirement: 'Reach Level 40',
    unlockLevel: 40,
    color: '#f39c12',
    rarity: 'Epic'
  },
  { 
    id: 'legend', 
    name: 'Legendary Athlete', 
    description: 'Legends speak of your deeds',
    requirement: 'Reach Level 50',
    unlockLevel: 50,
    color: theme.colors.gold,
    rarity: 'Legendary'
  },
  // Monarch Titles
  { 
    id: 'monarch_destruction', 
    name: 'Monarch of Destruction', 
    description: 'Wields the power of absolute destruction. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { strength: 10, vitality: 5 },
    color: '#ff4444',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_shadows', 
    name: 'Monarch of Shadows', 
    description: 'Command the army of shadows. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { agility: 10, intelligence: 5 },
    color: '#8b00ff',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_flames', 
    name: 'Monarch of White Flames', 
    description: 'Master of the eternal white flames. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { intelligence: 10, strength: 5 },
    color: '#ffffff',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_fangs', 
    name: 'Monarch of Fangs', 
    description: 'Beast king with unmatched ferocity. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { strength: 8, agility: 7 },
    color: '#ff6b35',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_frost', 
    name: 'Monarch of Frost', 
    description: 'Controls the eternal ice. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { intelligence: 8, vitality: 7 },
    color: '#00d4ff',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_iron', 
    name: 'Monarch of the Iron Body', 
    description: 'Indestructible physical form. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    statBonus: { vitality: 15 },
    color: '#7d7d7d',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_beginning', 
    name: 'Monarch of the Beginning', 
    description: 'First among all Monarchs. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    // Balanced total = 15
    statBonus: { intelligence: 9, sense: 6 },
    color: '#ffd700',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_plagues', 
    name: 'Monarch of Plagues', 
    description: 'Spreads disease and decay. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    // Balanced total = 15
    statBonus: { intelligence: 8, vitality: 7 },
    color: '#9acd32',
    rarity: 'Unique'
  },
  { 
    id: 'monarch_transfiguration', 
    name: 'Monarch of Transfiguration', 
    description: 'Master of transformation and change. Only one person can obtain this title and each user may equip only one Monarch title — the power of multiple Monarchs is too great for a single body to bear.',
    requirement: 'Reach Level 100 + Special Achievement',
    unlockLevel: 100,
    requiresMonarch: true,
    // Balanced total = 15
    statBonus: { intelligence: 6, agility: 5, sense: 4 },
    color: '#da70d6',
    rarity: 'Unique'
  }
];

// Rarity color map for badges
const RARITY_COLORS = {
  Common: '#95a5a6',
  Uncommon: '#2ecc71',
  Rare: '#3498db',
  Epic: '#9b59b6',
  Legendary: '#f39c12',
  Unique: '#e74c3c'
};

export default function TitlesScreen({ navigation }) {
  const { state, getCurrentUserProfile, currentUser, loadUserData } = useContext(AppContext);
  const userProfile = getCurrentUserProfile || (state.users && state.users[0]);
  const [selectedTitle, setSelectedTitle] = useState(userProfile?.equippedTitle || 'none');
  const [claimedMonarchs, setClaimedMonarchs] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTitleInfo, setSelectedTitleInfo] = useState(null);

  console.log('TitlesScreen - userProfile:', userProfile);
  console.log('TitlesScreen - getCurrentUserProfile:', getCurrentUserProfile);
  console.log('TitlesScreen - state.users:', state.users);

  // Load claimed Monarch titles
  React.useEffect(() => {
    loadClaimedMonarchs();
  }, []);

  const loadClaimedMonarchs = async () => {
    setLoading(true);
    const result = await FirebaseService.getClaimedMonarchTitles();
    if (result.success) {
      setClaimedMonarchs(result.claimed);
    }
    setLoading(false);
  };

  // Determine which titles are unlocked
  const titlesWithStatus = useMemo(() => {
    if (!userProfile) {
      console.log('TitlesScreen - No user profile found!');
      return AVAILABLE_TITLES;
    }

    console.log('TitlesScreen - User level:', userProfile.level, 'XP:', userProfile.xp);

    return AVAILABLE_TITLES.map(title => {
      if (title.id === 'none') return { ...title, unlocked: true };
      
      let unlocked = false;
      let claimedBy = null;
      
      // Check if Monarch title is claimed by someone else
      if (title.requiresMonarch) {
        const claim = claimedMonarchs[title.id];
        if (claim && claim.userId !== userProfile.id) {
          claimedBy = claim;
          unlocked = false; // Locked if claimed by another user
        } else {
          // Check level and Monarch status
          unlocked = (userProfile.level || 0) >= title.unlockLevel && userProfile.hasMonarchTitle === true;
        }
      } else if (title.unlockLevel) {
        unlocked = (userProfile.level || 0) >= title.unlockLevel;
      }

      console.log(`Title: ${title.name}, Required Level: ${title.unlockLevel}, User Level: ${userProfile.level}, Unlocked: ${unlocked}`);

      return { ...title, unlocked, claimedBy };
    });
  }, [userProfile, claimedMonarchs]);

  const handleTitlePress = (title) => {
    setSelectedTitleInfo(title);
    setModalVisible(true);
  };

  const handleEquipTitle = async () => {
    const title = selectedTitleInfo;
    if (!title) return;

    if (!title.unlocked) {
      if (title.claimedBy) {
        Alert.alert(
          'Title Claimed',
          `This Monarch title is already held by ${title.claimedBy.userName} (Level ${title.claimedBy.level}). Only one user can hold each Monarch title.`
        );
      } else {
        Alert.alert('Locked', `This title requires: ${title.requirement}`);
      }
      setModalVisible(false);
      return;
    }

    setSelectedTitle(title.id);
    setModalVisible(false);
    
    // Save to Firebase
    const userId = currentUser ? currentUser.uid : (state.users && state.users[0]?.id);
    if (userId) {
      try {
        console.log('Equipping title:', title.id, 'for user:', userId);
        
        // Check if it's a Monarch title and use special function
        const monarchTitles = [
          'monarch_destruction', 'monarch_shadows', 'monarch_flames',
          'monarch_fangs', 'monarch_frost', 'monarch_iron',
          'monarch_beginning', 'monarch_plagues', 'monarch_transfiguration'
        ];
        
        if (monarchTitles.includes(title.id)) {
          const result = await FirebaseService.equipMonarchTitle(userId, title.id);
          if (!result.success) {
            Alert.alert('Error', result.error);
            setSelectedTitle(userProfile?.equippedTitle || 'none');
            return;
          }
        } else {
          await FirebaseService.saveUser(userId, {
            equippedTitle: title.id
          });
        }
        
        // Reload user data and claimed titles
        if (loadUserData) {
          await loadUserData(userId);
        }
        await loadClaimedMonarchs();
        
        console.log('Title saved successfully, reloaded user data');
        
        Alert.alert(
          'Title Equipped',
          `You are now "${title.name}"!`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Error saving title:', error);
        Alert.alert('Error', 'Failed to equip title');
      }
    }
  };

  if (!userProfile) {
    return (
      <View style={globalStyles.container}>
        <Header title="Titles" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  const tier = getTier(userProfile.xp, userProfile.hasMonarchTitle);
  const equippedTitle = titlesWithStatus.find(t => t.id === selectedTitle);

  return (
    <View style={globalStyles.container}>
      <Header title="Titles" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Current Title Card */}
        <View style={styles.currentTitleSection}>
          <Text style={styles.sectionTitle}>Current Title</Text>
          <View style={[styles.currentTitleCard, { borderColor: equippedTitle?.color || theme.colors.muted }]}>
            <View style={[styles.titleGlow, { backgroundColor: equippedTitle?.color || theme.colors.muted }]} />
            <View style={styles.currentTitleContent}>
              <Text style={[styles.currentTitleName, { color: equippedTitle?.color || theme.colors.text }]}>
                {equippedTitle?.name || 'None'}
              </Text>
              {equippedTitle?.description && (
                <Text style={styles.currentTitleDesc}>{equippedTitle.description}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Available Titles */}
        <View style={styles.titlesSection}>
          <Text style={styles.sectionTitle}>Available Titles</Text>
          
          <View style={styles.titlesList}>
            {titlesWithStatus.map((title) => {
              const rarityColor = title.unlocked ? (RARITY_COLORS[title.rarity] || title.color) : 'rgba(255,255,255,0.1)';
              
              return (
                <TouchableOpacity
                  key={title.id}
                  style={[
                    styles.titleCard,
                    !title.unlocked && styles.titleCardLocked,
                    selectedTitle === title.id && styles.titleCardSelected
                  ]}
                  onPress={() => handleTitlePress(title)}
                  activeOpacity={0.7}
                >
                  {/* Decorative corner accents */}
                  <View style={[styles.cornerTopLeft, { borderTopColor: rarityColor, borderLeftColor: rarityColor }]} />
                  <View style={[styles.cornerTopRight, { borderTopColor: rarityColor, borderRightColor: rarityColor }]} />
                  <View style={[styles.cornerBottomLeft, { borderBottomColor: rarityColor, borderLeftColor: rarityColor }]} />
                  <View style={[styles.cornerBottomRight, { borderBottomColor: rarityColor, borderRightColor: rarityColor }]} />
                  
                  {/* Top decorative bar */}
                  <LinearGradient
                    colors={[rarityColor + '00', rarityColor, rarityColor + '00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.topBar}
                  />
                  
                  {/* Bottom decorative bar */}
                  <LinearGradient
                    colors={[rarityColor + '00', rarityColor, rarityColor + '00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomBar}
                  />
                  
                  {/* Side accent bars */}
                  <LinearGradient
                    colors={[rarityColor + '00', rarityColor + 'AA', rarityColor + '00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.leftBar}
                  />
                  <LinearGradient
                    colors={[rarityColor + '00', rarityColor + 'AA', rarityColor + '00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.rightBar}
                  />
                  
                  {/* Inner glow effect */}
                  <View style={[styles.innerGlow, { 
                    shadowColor: rarityColor,
                    borderColor: rarityColor + '30'
                  }]} />
                <View style={styles.titleCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text 
                      style={[
                        styles.titleName, 
                        { color: title.unlocked ? title.color : theme.colors.muted },
                        !title.unlocked && styles.titleNameLocked
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {title.name}
                    </Text>
                    {title.rarity && (
                      <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[title.rarity] || '#777', alignSelf: 'flex-start', marginTop: 4, marginLeft: 0 }]}>
                        <Text style={styles.rarityText}>{title.rarity}</Text>
                      </View>
                    )}
                    <Text
                      style={[styles.titleDesc, !title.unlocked && styles.titleDescLocked]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {title.description}
                    </Text>
                    
                    {/* Show who claimed this Monarch title */}
                    {title.claimedBy && (
                      <Text style={styles.claimedByText}>
                        Held by: {title.claimedBy.userName} (Lv.{title.claimedBy.level})
                      </Text>
                    )}
                    
                    {/* Show stat bonuses for Monarch titles */}
                    {title.statBonus && title.unlocked && (
                      <Text style={styles.statBonusText}>
                        Bonus: {Object.entries(title.statBonus).map(([stat, value]) => 
                          `+${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`
                        ).join(', ')}
                      </Text>
                    )}
                  </View>
                  
                  {selectedTitle === title.id && title.unlocked && (
                    <View style={styles.equippedBadge}>
                      <Text style={styles.equippedText}>✓</Text>
                    </View>
                  )}
                  
                  {!title.unlocked && (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedIcon}>🔒</Text>
                    </View>
                  )}
                </View>

                <View style={styles.requirementRow}>
                  <Text style={[styles.requirementText, !title.unlocked && styles.requirementTextLocked]}>
                    {title.requirement}
                  </Text>
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Title Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTitleInfo && (
              <>
                {/* Modal Header */}
                <LinearGradient
                  colors={selectedTitleInfo.color ? [selectedTitleInfo.color + '40', selectedTitleInfo.color + '10'] : ['#2a1a4a', '#1a0f2e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalHeader}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: selectedTitleInfo.color || theme.colors.gold }]}> 
                      {selectedTitleInfo.name}
                    </Text>
                    {selectedTitleInfo.rarity && (
                      <View style={[styles.modalRarityBadge, { backgroundColor: RARITY_COLORS[selectedTitleInfo.rarity] || '#777' }]}> 
                        <Text style={styles.rarityText}>{selectedTitleInfo.rarity}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </LinearGradient>

                {/* Modal Body */}
                <View style={styles.modalBody}>
                  {/* Description */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Description</Text>
                    <Text style={styles.modalText}>{selectedTitleInfo.description}</Text>
                  </View>

                  {/* Requirement */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Requirement</Text>
                    <View style={styles.requirementContainer}>
                      {!selectedTitleInfo.unlocked && <Text style={styles.lockIcon}>🔒</Text>}
                      <Text style={[
                        styles.modalText,
                        !selectedTitleInfo.unlocked && styles.requirementLocked
                      ]}>
                        {selectedTitleInfo.requirement}
                      </Text>
                    </View>
                  </View>

                  {/* Stat Bonuses (if Monarch title) */}
                  {selectedTitleInfo.statBonus && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Stat Bonuses</Text>
                      {Object.entries(selectedTitleInfo.statBonus).map(([stat, value]) => (
                        <Text key={stat} style={styles.statBonusRow}>
                          • {stat.charAt(0).toUpperCase() + stat.slice(1)}: <Text style={styles.statBonusValue}>+{value}</Text>
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Claimed Status (if Monarch title claimed by someone else) */}
                  {selectedTitleInfo.claimedBy && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Status</Text>
                      <Text style={styles.claimedByModalText}>
                        Currently held by: {selectedTitleInfo.claimedBy.userName} (Lv.{selectedTitleInfo.claimedBy.level})
                      </Text>
                    </View>
                  )}

                  {/* Equip Button */}
                  <TouchableOpacity
                    style={[
                      styles.equipButton,
                      (!selectedTitleInfo.unlocked || selectedTitleInfo.claimedBy) && styles.equipButtonDisabled
                    ]}
                    onPress={handleEquipTitle}
                    disabled={!selectedTitleInfo.unlocked || selectedTitleInfo.claimedBy}
                  >
                    <Text style={styles.equipButtonText}>
                      {selectedTitleInfo.claimedBy ? 'Already Claimed' : 
                       !selectedTitleInfo.unlocked ? 'Locked' : 
                       selectedTitle === selectedTitleInfo.id ? 'Equipped' : 'Equip Title'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16
  },
  currentTitleSection: {
    marginBottom: 24
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  currentTitleCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  titleGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1
  },
  currentTitleContent: {
    position: 'relative',
    zIndex: 1
  },
  currentTitleName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  currentTitleDesc: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600'
  },
  titlesSection: {
    marginBottom: 20
  },
  titlesList: {
    gap: 12
  },
  titleCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'visible'
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16
  },
  topBar: {
    position: 'absolute',
    top: -1,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2
  },
  bottomBar: {
    position: 'absolute',
    bottom: -1,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2
  },
  leftBar: {
    position: 'absolute',
    left: -1,
    top: '30%',
    bottom: '30%',
    width: 3,
    borderRadius: 2
  },
  rightBar: {
    position: 'absolute',
    right: -1,
    top: '30%',
    bottom: '30%',
    width: 3,
    borderRadius: 2
  },
  innerGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  titleCardLocked: {
    opacity: 0.5
  },
  titleCardSelected: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
    backgroundColor: 'rgba(232, 194, 141, 0.05)'
  },
  titleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  titleName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  titleNameLocked: {
    color: theme.colors.muted
  },
  titleDesc: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  titleDescLocked: {
    opacity: 0.6
  },
  claimedByText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    fontStyle: 'italic'
  },
  statBonusText: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4
  },
  equippedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12
  },
  equippedText: {
    color: '#20160b',
    fontSize: 18,
    fontWeight: '900'
  },
  lockedBadge: {
    marginLeft: 12
  },
  lockedIcon: {
    fontSize: 24,
    opacity: 0.5
  },
  requirementRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  requirementText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  requirementTextLocked: {
    color: theme.colors.muted
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#0f0d12',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.2)'
  },
  modalHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    flex: 1
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12
  },
  closeButtonText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700'
  },
  rarityBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  modalRarityBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rarityText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  modalBody: {
    padding: 20
  },
  modalSection: {
    marginBottom: 20
  },
  modalSectionTitle: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  modalText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 8
  },
  requirementLocked: {
    color: theme.colors.muted
  },
  statBonusRow: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4
  },
  statBonusValue: {
    color: theme.colors.gold,
    fontWeight: '900'
  },
  claimedByModalText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic'
  },
  equipButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10
  },
  equipButtonDisabled: {
    backgroundColor: '#2a2530',
    opacity: 0.6
  },
  equipButtonText: {
    color: '#20160b',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  }
});
