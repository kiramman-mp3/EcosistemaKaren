import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

// Entrega un reporte a la persona: en el navegador lo descarga o abre el diálogo de impresión; en el teléfono lo
// guarda como archivo temporal y abre la hoja de compartir (correo, WhatsApp, Drive, imprimir...).

async function shareFile(uri: string, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

export async function exportCsvFile(csv: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);
  await shareFile(file.uri, 'text/csv', 'Compartir reporte (Excel)');
}

export async function exportPdfFile(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('El navegador bloqueó la ventana del reporte. Permite las ventanas emergentes e inténtalo de nuevo.');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf', 'Compartir reporte (PDF)');
}
