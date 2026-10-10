import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client';


interface LoginModalMobileProps {
  visible: boolean;
  onClose: () => void;
  currentUser?: { id: string; nombre: string; email: string; rol?: string } | null;
  onLoginSuccess?: (user: any) => void;
  onLogout?: () => void;
}

export const LoginModalMobile: React.FC<LoginModalMobileProps> = ({
  visible,
  onClose,
  currentUser = null,
  onLoginSuccess,
  onLogout,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (isRegisterMode && !nombre.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let res;
      if (isRegisterMode) {
        res = await api.register({
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });
      } else {
        res = await api.login({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });
      }

      setDone(true);
      if (onLoginSuccess && res.user) {
        onLoginSuccess(res.user);
      }
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Error al conectar con el servidor. Verifica tus credenciales.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAction = async () => {
    await api.logout();
    if (onLogout) onLogout();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Portal Clientes Karen</Text>
          <Text style={styles.subtitle}>
            {currentUser
              ? `Sesión activa como ${currentUser.nombre}`
              : 'Accede para gestionar tus pedidos y reservas.'}
          </Text>

          {currentUser ? (
            <View style={styles.form}>
              <View style={styles.userBox}>
                <Text style={styles.userBoxName}>{currentUser.nombre}</Text>
                <Text style={styles.userBoxEmail}>{currentUser.email}</Text>
                <Text style={styles.userBoxRol}>Rol: {currentUser.rol || 'CLIENTE'}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutAction}>
                <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          ) : done ? (
            <View style={styles.doneBox}>
              <Text style={styles.doneText}>✓ ¡Sesión Iniciada con Éxito!</Text>
            </View>
          ) : (
            <View style={styles.form}>
              {/* Tab Selector */}
              <View style={styles.tabToggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isRegisterMode && styles.toggleBtnActive]}
                  onPress={() => {
                    setIsRegisterMode(false);
                    setError(null);
                  }}
                >
                  <Text style={[styles.toggleBtnText, !isRegisterMode && styles.toggleBtnTextActive]}>
                    Iniciar Sesión
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, isRegisterMode && styles.toggleBtnActive]}
                  onPress={() => {
                    setIsRegisterMode(true);
                    setError(null);
                  }}
                >
                  <Text style={[styles.toggleBtnText, isRegisterMode && styles.toggleBtnTextActive]}>
                    Registrarme
                  </Text>
                </TouchableOpacity>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              {isRegisterMode && (
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor="#94A3B8"
                  value={nombre}
                  onChangeText={setNombre}
                />
              )}

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

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isRegisterMode ? 'Crear Cuenta' : 'Ingresar'}
                  </Text>
                )}
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
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#1D3557',
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  userBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  userBoxName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1D3557',
  },
  userBoxEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  userBoxRol: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});

