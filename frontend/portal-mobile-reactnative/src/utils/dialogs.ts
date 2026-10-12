import { Alert, Platform } from 'react-native';

// react-native-web implementa Alert.alert como una función vacía: en la versión web
// los avisos y las confirmaciones (p. ej. cerrar sesión) no aparecían nunca.

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

interface ConfirmOptions {
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirmAction(title: string, message: string, options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(Boolean(globalThis.confirm?.(`${title}\n\n${message}`)));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: options.cancelLabel || 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: options.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
