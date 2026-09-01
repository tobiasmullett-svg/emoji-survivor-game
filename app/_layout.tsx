import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';

/**
 * Stop the browser claiming touch gestures the game needs.
 *
 * A twin-stick grip puts two fingers on the screen at once, which a browser
 * reads as a pinch and answers by zooming the page — so the movement and aim
 * pads could not be used together at all.
 *
 * This runs at runtime rather than living in `app/+html.tsx` because the web
 * build is `output: "single"` (an SPA), and `+html.tsx` only applies to static
 * rendering — a file there is silently ignored.
 */
function useWebTouchGestureReset(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // `user-scalable=no` + a locked scale covers Android Chrome. iOS Safari
    // ignores both, which is why the `touch-action` rule carries the real
    // weight there.
    const viewport = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewport?.getAttribute('content') ?? null;
    viewport?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );

    // `pan-x pan-y` rather than `none`: omitting `pinch-zoom` from the list
    // disables the pinch gesture while still letting scrollable UI (the shop
    // list, high scores) scroll. `touch-action: none` would have killed those.
    const style = document.createElement('style');
    style.textContent = `
      body {
        touch-action: pan-x pan-y;
        overscroll-behavior: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
      if (previousViewport !== null) viewport?.setAttribute('content', previousViewport);
    };
  }, []);
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{this.state.error?.message ?? 'Unknown error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A15', padding: 24 },
  title: { color: '#EF4444', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  msg: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
});

export default function RootLayout() {
  useWebTouchGestureReset();
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#050A15' }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050A15' },
            animation: 'fade',
          }}
        />
      </View>
    </ErrorBoundary>
  );
}
