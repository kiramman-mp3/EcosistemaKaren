import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api, BodegaAuthResponse } from '../api/client';

interface Props {
  onLogin: (auth: BodegaAuthResponse) => void;
}

export const BodegaLoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('bodega@karen.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      onLogin(await api.login(email.trim(), password));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.icon}>🏬</Text>
        <Text style={styles.title}>Bodega Karen</Text>
        <Text style={styles.subtitle}>Acceso exclusivo para personal autorizado</Text>

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>Iniciar sesión</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  icon: { fontSize: 42, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  subtitle: { color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  label: { color: '#334155', fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, marginBottom: 16 },
  error: { color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 14 },
  button: { backgroundColor: '#DC2626', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
