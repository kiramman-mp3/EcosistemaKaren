import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Notice } from './ui';
import { DEFAULT_PORT, DEFAULT_SERVER_URL, getServerUrl, saveServerUrl } from '../api/serverConfig';
import { describeServerUrl, normalizeServerUrl } from '../api/serverUrl';
import { colors, fonts, themed } from '../theme/tokens';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  /** La dirección cambió: la sesión y los datos cargados pertenecen al servidor anterior. */
  onChanged: () => void;
}

type Result = { tone: 'error' | 'success' | 'info'; text: string } | null;

/** Pantalla para escribir la dirección del servidor (IP de la red local) sin recompilar la app. */
export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ visible, onClose, onChanged }) => {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<Result>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(describeServerUrl(getServerUrl()));
      setResult(null);
    }
  }, [visible]);

  const normalized = normalizeServerUrl(value, DEFAULT_PORT);

  const test = async () => {
    if (!normalized) {
      setResult({ tone: 'error', text: 'Escribe una dirección válida, por ejemplo 192.168.1.20 o 192.168.1.20:4001.' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      await axios.get(`${normalized}/heartbeat`, { timeout: 4000 });
      setResult({ tone: 'success', text: `Conectado a ${describeServerUrl(normalized)}.` });
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      setResult({
        tone: 'error',
        text: status
          ? `El servidor respondió con error ${status}. Revisa el puerto.`
          : 'No se pudo conectar. Revisa la IP, el puerto y que el teléfono esté en la misma red que el servidor.',
      });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!normalized) {
      setResult({ tone: 'error', text: 'Escribe una dirección válida, por ejemplo 192.168.1.20 o 192.168.1.20:4001.' });
      return;
    }
    if (normalized !== getServerUrl()) {
      await saveServerUrl(normalized);
      onChanged();
    }
    onClose();
  };

  const reset = async () => {
    if (getServerUrl() !== DEFAULT_SERVER_URL) {
      await saveServerUrl(null);
      onChanged();
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.title} accessibilityRole="header">Servidor</Text>
            <Text style={styles.subtitle}>Dirección del backend al que se conecta la app</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar configuración del servidor">
            <Ionicons name="close" size={26} color={colors.mora} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.content}>
            <Field
              label="IP o dirección"
              hint={`Sin puerto se usa el ${DEFAULT_PORT}. Ejemplo: 192.168.1.20`}
              value={value}
              onChangeText={text => { setValue(text); setResult(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="192.168.1.20"
            />
            {normalized ? <Text style={styles.preview}>Se usará {normalized}</Text> : null}
            {result ? <Notice tone={result.tone} text={result.text} /> : null}
            <Button label="Probar conexión" icon="wifi" variant="outline" loading={testing} onPress={() => void test()} />
          </View>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Button label="Guardar" variant="sticker" onPress={() => void save()} />
          <Button label="Restablecer valor de la app" variant="ghost" onPress={() => void reset()} />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  head: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.sticker,
    borderBottomWidth: 2, borderBottomColor: colors.mora, paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { fontFamily: fonts.tag, fontSize: 24, color: colors.mora },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.mora, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -8 },
  content: { padding: 16, gap: 12 },
  preview: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  footer: { padding: 16, gap: 10, borderTopWidth: 2, borderTopColor: colors.rule, backgroundColor: colors.card },
}));
