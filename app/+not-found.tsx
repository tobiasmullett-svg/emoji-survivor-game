import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>🦀</Text>
      <Text style={s.text}>Page not found!</Text>
      <Link href="/" style={s.link}>Go Home</Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A15' },
  emoji: { fontSize: 64, marginBottom: 16 },
  text: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 12 },
  link: { color: '#6366F1', fontSize: 16 },
});
