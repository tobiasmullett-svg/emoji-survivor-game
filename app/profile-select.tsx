import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfiles, createProfile, deleteProfile, setActiveProfileId, migrateAnonymousDataToProfile } from '../services/storage';
import { PROFILE_AVATARS, MAX_PROFILES, MIN_NAME_LENGTH, MAX_NAME_LENGTH, type PlayerProfile } from '../engine/profileTypes';

const MENU_SPARKS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 96}%`,
  top: `${8 + ((i * 53) % 82)}%`,
  opacity: 0.12 + (i % 4) * 0.05,
}));

export default function ProfileSelectScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(PROFILE_AVATARS[0]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const loaded = await getProfiles();
    setProfiles(loaded);
    if (loaded.length === 0) {
      setIsCreating(true);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) return;
    
    const isFirstProfile = profiles.length === 0;
    const profile = await createProfile(name, newEmoji);
    if (profile) {
      if (isFirstProfile) {
        await migrateAnonymousDataToProfile(profile.id);
      }
      await handleSelect(profile.id);
    }
  };

  const handleSelect = async (id: string) => {
    await setActiveProfileId(id);
    router.replace('/');
  };

  const handleDelete = (id: string, name: string) => {
    const doDelete = async () => {
      await deleteProfile(id);
      await loadProfiles();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete profile "${name}"? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Profile', `Delete profile "${name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#030712', '#08111F', '#102018']} style={StyleSheet.absoluteFill}>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#030712', '#08111F', '#102018']} style={StyleSheet.absoluteFill}>
      {MENU_SPARKS.map(spark => (
        <View
          key={spark.id}
          style={[s.spark, { left: spark.left, top: spark.top, opacity: spark.opacity } as unknown as object]}
        />
      ))}
      <SafeAreaView style={s.safe}>
        <Text style={s.title}>WHO IS PLAYING?</Text>
        
        <ScrollView contentContainerStyle={s.content}>
          {profiles.map(p => (
            <Pressable 
              key={p.id}
              style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => handleSelect(p.id)}
              onLongPress={() => handleDelete(p.id, p.name)}
            >
              <Text style={s.cardEmoji}>{p.emoji}</Text>
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{p.name}</Text>
                <Text style={s.cardDate}>Last played {new Date(p.lastPlayedAt).toLocaleDateString()}</Text>
              </View>
            </Pressable>
          ))}

          {isCreating ? (
            <View style={s.createForm}>
              <Text style={s.createTitle}>Create New Profile</Text>
              <TextInput
                style={s.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter Name (2-12 chars)"
                placeholderTextColor="#94A3B8"
                maxLength={MAX_NAME_LENGTH}
              />
              <Text style={s.label}>Select Avatar:</Text>
              <View style={s.emojiGrid}>
                {PROFILE_AVATARS.map(e => (
                  <Pressable 
                    key={e} 
                    style={[s.emojiBtn, newEmoji === e && s.emojiBtnActive]}
                    onPress={() => setNewEmoji(e)}
                  >
                    <Text style={s.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.formActions}>
                {profiles.length > 0 && (
                  <Pressable onPress={() => setIsCreating(false)} style={[s.btn, s.btnCancel]}>
                    <Text style={s.btnTextSec}>CANCEL</Text>
                  </Pressable>
                )}
                <Pressable 
                  onPress={handleCreate} 
                  style={[s.btn, s.btnPrimary, (newName.length < MIN_NAME_LENGTH) && s.btnDisabled]}
                  disabled={newName.length < MIN_NAME_LENGTH}
                >
                  <LinearGradient colors={['#7C3AED', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnGrad}>
                    <Text style={s.btnText}>CREATE</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            profiles.length < MAX_PROFILES && (
              <Pressable 
                onPress={() => setIsCreating(true)} 
                style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.addBtnText}>+ CREATE PROFILE</Text>
              </Pressable>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  spark: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#CFFAFE' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: 2, marginBottom: 24, marginTop: 12, textShadowColor: 'rgba(45,212,191,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  content: { paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(100,150,255,0.12)' },
  cardEmoji: { fontSize: 42, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  cardDate: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  addBtn: { borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)', paddingVertical: 16, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 8 },
  addBtnText: { color: '#14B8A6', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  
  createForm: { backgroundColor: 'rgba(15,25,60,0.7)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(100,150,255,0.2)', marginTop: 8 },
  createTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  emojiBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.2)' },
  emojiBtnActive: { backgroundColor: 'rgba(20,184,166,0.3)', borderWidth: 2, borderColor: '#14B8A6' },
  emojiText: { fontSize: 24 },
  
  formActions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  btnCancel: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  btnPrimary: {},
  btnDisabled: { opacity: 0.5 },
  btnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  btnTextSec: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
});
