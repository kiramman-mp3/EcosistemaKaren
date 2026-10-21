import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, BodegaAuthResponse } from '../api/client';
import { Button, Field, Notice } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';

interface Props {
  onLogin: (auth: BodegaAuthResponse) => void;
}

export const BodegaLoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onLogin(await api.login(email.trim(), password));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No se pudo iniciar sesión. Revisa la conexión con la tienda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
            <Text style={styles.brand}>Bodega Karen</Text>
            <Text style={styles.lead}>Recepción de lotes, percha y caja.{'\n'}Solo personal de la tienda.</Text>

            <View style={styles.card}>
              {error && <Notice tone="error" text={error} />}
              <Field
                label="Correo"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              <Field
                ref={passwordInputRef}
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={() => void handleLogin()}
              />
              <Button label="Ingresar" onPress={() => void handleLogin()} loading={loading} variant="danger" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = themed(() => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.aisle },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: {
    width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.sticker, borderWidth: 2, borderColor: colors.mora,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontFamily: fonts.tag, fontSize: 38, lineHeight: 42, color: colors.mora },
  brand: { fontFamily: fonts.tag, fontSize: 44, lineHeight: 46, color: colors.karenText },
  lead: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.inkSoft, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.block, borderWidth: 2, borderColor: colors.sticker, padding: 20, paddingBottom: 22 },
}));
