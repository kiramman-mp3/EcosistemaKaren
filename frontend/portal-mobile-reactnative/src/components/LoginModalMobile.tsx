import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { Button, Field, Notice } from './ui';
import { colors, fonts, radius } from '../theme/tokens';

interface LoginModalMobileProps {
  visible: boolean;
  onClose: () => void;
  currentUser?: { id: string; nombre: string; email: string; rol?: string } | null;
  onLoginSuccess?: (user: any) => void;
  onLogout?: () => void;
}

export const LoginModalMobile: React.FC<LoginModalMobileProps> = ({
  visible, onClose, currentUser = null, onLoginSuccess, onLogout,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return setError('Escribe tu correo y tu contraseña.');
    if (isRegisterMode && !nombre.trim()) return setError('Escribe tu nombre.');
    if (isRegisterMode && password.length < 8) return setError('La contraseña necesita al menos 8 caracteres.');

    setLoading(true);
    setError(null);
    try {
      // La contraseña se envía tal cual: recortarla cambiaría la que la persona eligió.
      const res = isRegisterMode
        ? await api.register({ nombre: nombre.trim(), email: email.trim().toLowerCase(), password })
        : await api.login({ email: email.trim().toLowerCase(), password });
      if (onLoginSuccess && res.user) onLoginSuccess(res.user);
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No pudimos conectar con la tienda. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    onLogout?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.title}>
                  {currentUser ? 'Tu cuenta' : isRegisterMode ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}
                </Text>
                <Text style={styles.subtitle}>
                  {currentUser ? currentUser.email : 'Para reservar y ver tus códigos de retiro.'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={26} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {currentUser ? (
                <>
                  <Text style={styles.hello}>Hola, {currentUser.nombre}.</Text>
                  <Button label="Cerrar sesión" variant="outline" icon="log-out-outline" onPress={() => void handleLogout()} />
                </>
              ) : (
                <>
                  {error && <Notice tone="error" text={error} />}
                  {isRegisterMode && (
                    <Field label="Nombre y apellido" value={nombre} onChangeText={setNombre} autoComplete="name" returnKeyType="next" />
                  )}
                  <Field
                    label="Correo"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                  <Field
                    ref={passwordRef}
                    label="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete={isRegisterMode ? 'new-password' : 'password'}
                    hint={isRegisterMode ? 'Mínimo 8 caracteres.' : undefined}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSubmit()}
                  />
                  <Button label={isRegisterMode ? 'Crear cuenta' : 'Ingresar'} variant="danger" loading={loading} onPress={() => void handleSubmit()} />
                  <TouchableOpacity
                    style={styles.switch}
                    onPress={() => { setIsRegisterMode(!isRegisterMode); setError(null); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.switchText}>
                      {isRegisterMode ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
                      <Text style={styles.switchLink}>{isRegisterMode ? 'Ingresa' : 'Crea una cuenta'}</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(19,40,75,0.6)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.tag, overflow: 'hidden', width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.ink, padding: 18 },
  title: { fontFamily: fonts.tag, fontSize: 26, color: colors.white },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -8 },
  body: { padding: 18 },
  hello: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, marginBottom: 14 },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  switchLink: { fontFamily: fonts.semibold, color: colors.ink, textDecorationLine: 'underline' },
});
