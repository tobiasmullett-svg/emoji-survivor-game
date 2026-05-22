import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getActiveProfile, updateProfile, deleteProfile, getActiveProfileId } from '../services/storage';
import { getProgression, type ProgressionData } from '../engine/progression';
import { getAchievementProgress, ACHIEVEMENTS } from '../engine/achievements';
import { PROFILE_AVATARS, MIN_NAME_LENGTH, MAX_NAME_LENGTH, type PlayerProfile } from '../engine/profileTypes';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [achievementsCount, setAchievementsCount] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveProfile();
    if (active) {
      setProfile(active);
      setEditName(active.name);
      setEditEmoji(active.emoji);
      
      const prog = await getProgression();
      setProgression(prog);
      
      const ach = await getAchievementProgress();
      const count = Object.values(ach).filter(a => a.unlocked).length;
      setAchievementsCount(count);
    } else {
      router.replace('/profile-select');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const name = editName.trim();
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) return;
    
    await updateProfile(profile.id, { name, emoji: editEmoji });
    setIsEditing(false);
    await loadData();
  };

  const handleDelete = () => {
    if (!profile) return;
    
    const doDelete = async () => {
      await deleteProfile(profile.id);
      router.replace('/profile-select');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this profile permanently? All progress will be lost.')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Profile', 'Delete this profile permanently? All progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (!profile) return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill} />
  );

  const hasChanges = editName.trim() !== profile.name || editEmoji !== profile.emoji;

  return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={s.title}>PROFILE</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content}>
          <View style={s.profileCard}>
            <Text style={s.avatar}>{profile.emoji}</Text>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.memberSince}>Member since {new Date(profile.createdAt).toLocaleDateString()}</Text>
          </View>

          <View style={s.statsGrid}>
            <StatBox label="Total Runs" value={progression?.totalRuns ?? 0} />
            <StatBox label="Total Kills" value={progression?.totalKills ?? 0} />
            <StatBox label="Highest Wave" value={progression?.highestWave ?? 0} />
            <StatBox label="Pearls" value={`🐚 ${progression?.pearls ?? 0}`} />
          </View>

          <View style={s.achCard}>
            <View style={s.achHeader}>
              <Text style={s.achTitle}>Achievements</Text>
              <Text style={s.achCount}>{achievementsCount} / {ACHIEVEMENTS.length}</Text>
            </View>
            <View style={s.achBarBg}>
              <View style={[s.achBarFill, { width: `${(achievementsCount / ACHIEVEMENTS.length) * 100}%` }]} />
            </View>
          </View>

          {!isEditing ? (
            <Pressable onPress={() => setIsEditing(true)} style={s.editBtn}>
              <Text style={s.editBtnText}>✏️ EDIT PROFILE</Text>
            </Pressable>
          ) : (
            <View style={s.editSection}>
              <Text style={s.editTitle}>Edit Profile</Text>
              <TextInput
                style={s.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter Name"
                placeholderTextColor="#94A3B8"
                maxLength={MAX_NAME_LENGTH}
              />
              <View style={s.emojiGrid}>
                {PROFILE_AVATARS.map(e => (
                  <Pressable 
                    key={e} 
                    style={[s.emojiBtn, editEmoji === e && s.emojiBtnActive]}
                    onPress={() => setEditEmoji(e)}
                  >
                    <Text style={s.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.editActions}>
                <Pressable onPress={() => { setIsEditing(false); setEditName(profile.name); setEditEmoji(profile.emoji); }} style={[s.actionBtn, s.cancelBtn]}>
                  <Text style={s.cancelText}>CANCEL</Text>
                </Pressable>
                <Pressable 
                  onPress={handleSave} 
                  style={[s.actionBtn, s.saveBtn, (!hasChanges || editName.trim().length < MIN_NAME_LENGTH) && s.disabledBtn]}
                  disabled={!hasChanges || editName.trim().length < MIN_NAME_LENGTH}
                >
                  <Text style={s.saveText}>SAVE</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable onPress={handleDelete} style={s.deleteBtn}>
            <Text style={s.deleteBtnText}>DELETE PROFILE</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 24 },
  title: { flex: 1, color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  content: { paddingBottom: 40 },
  
  profileCard: { alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(100,150,255,0.15)' },
  avatar: { fontSize: 72, marginBottom: 12 },
  name: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  memberSince: { color: '#94A3B8', fontSize: 13 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100,150,255,0.1)' },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  
  achCard: { backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(100,150,255,0.1)' },
  achHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  achTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  achCount: { color: '#F59E0B', fontSize: 15, fontWeight: '800' },
  achBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden' },
  achBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  
  editBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 32 },
  editBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  
  editSection: { backgroundColor: 'rgba(15,25,60,0.7)', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(100,150,255,0.2)' },
  editTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  emojiBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.2)' },
  emojiBtnActive: { backgroundColor: 'rgba(20,184,166,0.3)', borderWidth: 2, borderColor: '#14B8A6' },
  emojiText: { fontSize: 24 },
  editActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  cancelText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: '#14B8A6' },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
  
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
