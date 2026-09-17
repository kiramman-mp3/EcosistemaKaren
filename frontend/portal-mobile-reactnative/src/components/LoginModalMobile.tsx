import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface LoginModalMobileProps {
  visible: boolean;
  onClose: () => void;
}

export const LoginModalMobile: React.FC<LoginModalMobileProps> = ({
  visible,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const handleLogin = () => {
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Portal Clientes Karen</Text>
          <Text style={styles.subtitle}>Inicia sesión para gestionar tus pedidos.</Text>

          {done ? (
            <View style={styles.doneBox}>
              <Text style={styles.doneText}>✓ ¡Sesión Iniciada!</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="correo@karen.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleLogin}>
                <Text style={styles.submitBtnText}>Ingresar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  closeText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D3557',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
  },
  submitBtn: {
    backgroundColor: '#1D3557',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  doneBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  doneText: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 14,
  },
});
