import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onScanned: (value: string) => void;
}

export const BarcodeScannerModal: React.FC<Props> = ({ visible, title = 'Escanear código de barras', onClose, onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const close = () => {
    setLocked(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {!permission?.granted ? (
            <View style={styles.permission}>
              <Text style={styles.help}>La cámara solo se usa para leer el código. No se guardan fotos.</Text>
              <Button label="Permitir cámara" variant="sticker" onPress={() => void requestPermission()} />
            </View>
          ) : (
            <View style={styles.camera}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
                onBarcodeScanned={locked ? undefined : ({ data }) => {
                  setLocked(true);
                  onScanned(data);
                  close();
                }}
              />
              <View pointerEvents="none" style={styles.overlay}>
                <View style={styles.frame} />
                <Text style={styles.frameText}>Centra el código en el recuadro</Text>
              </View>
            </View>
          )}
          <Button label="Cancelar" variant="ghost" onPress={close} style={styles.cancel} />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mora, padding: 20 },
  title: { fontFamily: fonts.tag, fontSize: 26, color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  camera: { flex: 1, borderRadius: radius.tag, overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', padding: 24, gap: 12 },
  frame: { height: 180, borderWidth: 4, borderColor: colors.sticker, borderRadius: radius.tag },
  frameText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF', textAlign: 'center' },
  permission: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: 18 },
  help: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  cancel: { marginTop: 16 },
}));
