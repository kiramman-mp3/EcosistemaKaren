import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ServerConfigModal } from './ServerConfigModal';
import { getServerUrl, onServerUrlChange, SERVER_CONFIG_ENABLED } from '../api/serverConfig';
import { describeServerUrl } from '../api/serverUrl';
import { colors, fonts, themed } from '../theme/tokens';

/** Franja con el servidor en uso y acceso a cambiarlo. Solo existe en builds con EXPO_PUBLIC_SERVER_CONFIG=1. */
export const ServerBar: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(getServerUrl());
  useEffect(() => onServerUrlChange(setUrl), []);

  if (!SERVER_CONFIG_ENABLED) return null;
  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Servidor ${describeServerUrl(url)}. Cambiar`}
      >
        <Text style={styles.text} numberOfLines={1}>Servidor: {describeServerUrl(url)}  ·  cambiar</Text>
      </TouchableOpacity>
      <ServerConfigModal visible={open} onClose={() => setOpen(false)} onChanged={onChanged} />
    </>
  );
};

const styles = themed(() => StyleSheet.create({
  bar: { backgroundColor: colors.mora, paddingVertical: 5, paddingHorizontal: 12, alignItems: 'center' },
  text: { fontFamily: fonts.medium, fontSize: 11, color: '#FFFFFF' },
}));
