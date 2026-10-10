import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

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
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.help}>La cámara se usa únicamente para leer el código solicitado.</Text>
            <TouchableOpacity style={styles.primary} onPress={requestPermission}>
              <Text style={styles.primaryText}>Autorizar cámara</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
            onBarcodeScanned={locked ? undefined : ({ data }) => {
              setLocked(true);
              onScanned(data);
              close();
            }}
          >
            <View style={styles.frame}><Text style={styles.frameText}>Centra el código dentro del marco</Text></View>
          </CameraView>
        )}
        <TouchableOpacity style={styles.close} onPress={close}><Text style={styles.closeText}>Cancelar</Text></TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20, paddingTop: 50 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  camera: { flex: 1, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', padding: 24 },
  frame: { height: 190, borderWidth: 3, borderColor: '#22C55E', borderRadius: 18, justifyContent: 'flex-end' },
  frameText: { color: '#FFFFFF', textAlign: 'center', backgroundColor: 'rgba(0,0,0,.65)', padding: 8 },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  help: { color: '#CBD5E1', textAlign: 'center', lineHeight: 20 },
  primary: { backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  close: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center' },
  closeText: { color: '#FFFFFF', fontWeight: '800' },
});
