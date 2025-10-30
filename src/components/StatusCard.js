import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { theme } from '../theme/ThemeProvider';
import * as FirebaseService from '../services/FirebaseService';

// Module-scope helpers and constants so StyleSheets can safely reference them
const STATUS = (theme && theme.colors && theme.colors.status) ? theme.colors.status : '#c77dff';
const STATUS_LIGHT = (theme && theme.colors && theme.colors.statusLight) ? theme.colors.statusLight : '#e0aaff';
const hexToRgba = (hex, alpha = 1) => {
  try {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch (e) {
    return `rgba(199,125,255,${alpha})`;
  }
};

export default function StatusCard({ player = {}, compact = false, modal = false, onClose, onStatsChanged, cornerImages = {} }) {
  const [allocating, setAllocating] = useState(false);
  const [localStats, setLocalStats] = useState(null);
  const [localRemaining, setLocalRemaining] = useState(null);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  
  const p = {
    name: player.name ?? 'SHIDO ITSUKA',
    level: player.level ?? 1,
    job: player.job ?? 'None',
    fatigue: player.fatigue ?? 0,
    title: player.title ?? 'None',
    hp: player.hp ?? 100,
    mp: player.mp ?? 10,
    stats: localStats || player.stats || { strength: 10, agility: 10, sense: 10, vitality: 10, intelligence: 10 },
    remaining: localRemaining !== null ? localRemaining : (player.remaining ?? 0),
    userId: player.userId
  };

  // Use module constants to avoid scope issues in styles
  const status = STATUS;
  const statusLight = STATUS_LIGHT;

  const handleAllocateStat = async (statName) => {
    if (p.remaining <= 0) {
      Alert.alert('No Points', 'You have no remaining stat points to allocate.');
      return;
    }

    if (!p.userId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    setAllocating(true);
    try {
      const result = await FirebaseService.allocateStatPoints(p.userId, statName.toLowerCase(), 1);
      if (result.success) {
        setLocalStats(result.newStats);
        setLocalRemaining(result.remainingPoints);
        Alert.alert('Success', `+1 ${statName}!`);
        
        // Notify parent to reload user data
        if (onStatsChanged) {
          onStatsChanged();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to allocate stat point');
      }
    } catch (error) {
      console.error('Error allocating stat:', error);
      Alert.alert('Error', 'Failed to allocate stat point');
    } finally {
      setAllocating(false);
    }
  };
  if (compact) {
    return (
      <View style={compactStyles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={compactStyles.title}>STATUS</Text>
            <Text style={compactStyles.level}>{p.level}</Text>
            <Text style={compactStyles.job}>{p.job}</Text>
          </View>
          <View style={{ width: 140 }}>
            <View style={compactStyles.smallBar}><View style={[compactStyles.smallFill, { width: '72%' }]} /></View>
            <View style={[compactStyles.smallBar, { marginTop: 6 }]}><View style={[compactStyles.smallFill, { width: '48%', backgroundColor: theme.colors.accent }]} /></View>
          </View>
        </View>
      </View>
    );
  }

  const content = (
    <View style={styles.blueFrame}>
      <View style={styles.headerWrap}>
        <View style={styles.headerLine} />
        <Text style={styles.bigHeader}>STATUS</Text>
        <View style={styles.headerLine} />
      </View>

      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>NAME: <Text style={styles.infoValue}>{p.name}</Text></Text>
          <Text style={styles.infoLabel}>JOB: <Text style={styles.infoValue}>{p.job}</Text></Text>
          <Text style={styles.infoLabel}>TITLE: <Text style={styles.infoValue}>{p.title}</Text></Text>
        </View>
        <View style={{ width: 140, alignItems: 'flex-end' }}>
          <Text style={styles.infoLabel}>LEVEL: <Text style={styles.infoValue}>{p.level}</Text></Text>
          <Text style={styles.infoLabel}>FATIGUE: <Text style={styles.infoValue}>{p.fatigue}</Text></Text>
        </View>
      </View>

      <View style={styles.hpBlock}>
        <View style={styles.hpRow}>
          <Text style={styles.smallLabel}>HP: <Text style={styles.infoValue}>{p.hp}</Text></Text>
        </View>
        <View style={styles.underline} />
        <View style={styles.hpRow}>
          <Text style={styles.smallLabel}>MP: <Text style={styles.infoValue}>{p.mp}</Text></Text>
        </View>
      </View>

      <View style={styles.sepRow}>
        <View style={styles.longSep} />
        <Text style={styles.diamond}>◇</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsCol}>
          {Object.entries(p.stats).slice(0, 3).map(([k, v]) => (
            <View key={k} style={styles.statRow}>
              <Text style={styles.statLine}>{`${k.toUpperCase()}: ${v}`}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsCol}>
          {Object.entries(p.stats).slice(3).map(([k, v]) => (
            <View key={k} style={styles.statRow}>
              <Text style={styles.statLine}>{`${k.toUpperCase()}: ${v}`}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sepRow}> 
        <View style={styles.longSep} />
        <Text style={styles.diamond}>◇</Text>
      </View>

      <View style={styles.remainingRow}>
        <Text style={styles.remaining}>REMAINING POINTS: {p.remaining}</Text>
      </View>

      {p.remaining > 0 && p.userId && (
        <TouchableOpacity 
          style={styles.distributeButton} 
          onPress={() => setShowDistributeModal(true)}
        >
          <Text style={styles.distributeButtonText}>DISTRIBUTE POINTS</Text>
        </TouchableOpacity>
      )}

      {onClose ? (
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>CLOSE</Text>
        </TouchableOpacity>
      ) : null}

      {/* Distribute Points Modal */}
      <Modal visible={showDistributeModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.distributeModal}>
            <Text style={styles.distributeTitle}>DISTRIBUTE POINTS</Text>
            <Text style={styles.distributeSubtitle}>Available: {p.remaining} points</Text>
            
            <View style={styles.distributeGrid}>
              {Object.entries(p.stats).map(([k, v]) => (
                <View key={k} style={styles.distributeRow}>
                  <Text style={styles.distributeStat}>{k.toUpperCase()}</Text>
                  <Text style={styles.distributeValue}>{v}</Text>
                  <TouchableOpacity 
                    style={styles.distributeButton2}
                    onPress={() => handleAllocateStat(k)}
                    disabled={allocating || p.remaining <= 0}
                  >
                    <Text style={styles.distributeButtonText2}>+1</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.closeDistributeButton} 
              onPress={() => setShowDistributeModal(false)}
            >
              <Text style={styles.closeDistributeText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* decorative corners (use images if provided) */}
      {cornerImages.topLeft ? (
        <Image source={cornerImages.topLeft} style={[styles.cornerImg, styles.topLeft]} resizeMode="contain" />
      ) : <View style={[styles.corner, styles.topLeft]} />}
      {cornerImages.topRight ? (
        <Image source={cornerImages.topRight} style={[styles.cornerImg, styles.topRight]} resizeMode="contain" />
      ) : <View style={[styles.corner, styles.topRight]} />}
      {cornerImages.bottomLeft ? (
        <Image source={cornerImages.bottomLeft} style={[styles.cornerImg, styles.bottomLeft]} resizeMode="contain" />
      ) : <View style={[styles.corner, styles.bottomLeft]} />}
      {cornerImages.bottomRight ? (
        <Image source={cornerImages.bottomRight} style={[styles.cornerImg, styles.bottomRight]} resizeMode="contain" />
      ) : <View style={[styles.corner, styles.bottomRight]} />}
    </View>
  );

  if (modal) {
    return (
      <View style={modalStyles.backdrop}>
        {content}
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      {content}
    </View>
  );
}



const compactStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0d0d0f',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { color: theme.colors.gold, fontWeight: '800' },
  level: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  job: { color: theme.colors.muted },
  smallBar: { height: 8, backgroundColor: '#111', borderRadius: 4, overflow: 'hidden' },
  smallFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 4 }
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#06214a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  blueFrame: {
    width: '92%',
    backgroundColor: '#1a0f2e',
    borderColor: STATUS,
    borderWidth: 3,
    padding: 18,
    borderRadius: 8,
    alignItems: 'stretch',
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10
  },
  bigHeader: { 
    color: STATUS_LIGHT, 
    textAlign: 'center', 
    fontWeight: '900', 
    fontSize: 20, 
    marginBottom: 12, 
    fontFamily: 'SoloLevel',
    letterSpacing: 4,
    textShadowColor: STATUS,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoText: { color: '#fff', fontWeight: '700', marginBottom: 6 },
  barSection: { marginVertical: 8 },
  smallLabel: { color: '#fff', marginBottom: 6 },
  sep: { height: 2, backgroundColor: '#e6eefb', marginVertical: 8 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  statsCol: { flex: 1 },
  statRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 8 
  },
  statLine: { color: '#fff', fontWeight: '700', flex: 1 },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  plusText: {
    color: '#0a0612',
    fontSize: 22,
    fontWeight: '900',
  },
  remainingRow: { marginTop: 12, alignItems: 'center' },
  remaining: { color: '#fff', fontWeight: '800' },
  distributeButton: {
    marginTop: 16,
    backgroundColor: STATUS,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: STATUS_LIGHT,
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  distributeButtonText: {
    color: '#1a0f2e',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 33, 74, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  distributeModal: {
    backgroundColor: '#1a0f2e',
    borderColor: STATUS,
    borderWidth: 3,
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  distributeTitle: {
    color: STATUS_LIGHT,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'SoloLevel',
    letterSpacing: 4,
    textShadowColor: STATUS,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  distributeSubtitle: {
    color: STATUS_LIGHT,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  distributeGrid: {
    marginBottom: 20,
  },
  distributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: hexToRgba(STATUS, 0.1),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: hexToRgba(STATUS, 0.3),
  },
  distributeStat: {
    color: '#e0aaff',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    textTransform: 'uppercase',
  },
  distributeValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 12,
  },
  distributeButton2: {
    backgroundColor: STATUS,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  distributeButtonText2: {
    color: '#1a0f2e',
    fontSize: 15,
    fontWeight: '900',
  },
  closeDistributeButton: {
    backgroundColor: STATUS_LIGHT,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: STATUS,
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  closeDistributeText: {
    color: '#1a0f2e',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  close: { marginTop: 12, alignSelf: 'center', borderWidth: 1, borderColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  closeText: { color: '#fff', fontWeight: '800' }
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }
});

// Additional decorative styles for the blue layout
Object.assign(styles, StyleSheet.create({
  headerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerLine: { 
    height: 2, 
    backgroundColor: STATUS, 
    flex: 1, 
    marginHorizontal: 8,
    shadowColor: STATUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5
  },
  infoLabel: { color: STATUS_LIGHT, fontWeight: '700', marginBottom: 6 },
  infoValue: { color: '#fff', fontWeight: '900' },
  hpBlock: { marginVertical: 6 },
  hpRow: { flexDirection: 'row', alignItems: 'center' },
  underline: { height: 2, backgroundColor: STATUS, marginVertical: 6 },
  sepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  longSep: { backgroundColor: STATUS, height: 2, flex: 1 },
  diamond: { color: STATUS_LIGHT, marginLeft: 8, fontSize: 18 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: STATUS, borderWidth: 3, opacity: 0.9 },
  topLeft: { left: -10, top: -10, borderLeftWidth: 0, borderTopWidth: 0, transform: [{ rotate: '0deg' }] },
  topRight: { right: -10, top: -10, borderRightWidth: 0, borderTopWidth: 0, transform: [{ rotate: '90deg' }] },
  bottomLeft: { left: -10, bottom: -10, borderLeftWidth: 0, borderBottomWidth: 0, transform: [{ rotate: '-90deg' }] },
  bottomRight: { right: -10, bottom: -10, borderRightWidth: 0, borderBottomWidth: 0, transform: [{ rotate: '180deg' }] }
}));
