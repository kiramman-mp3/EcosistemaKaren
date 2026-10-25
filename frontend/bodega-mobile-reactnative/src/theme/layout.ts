import { useWindowDimensions } from 'react-native';

// Medidas de la interfaz según el ancho de la ventana (no según el modelo de dispositivo), para que también
// respondan a girar la tableta o a la ventana dividida. Tableta desde 600 px, como Android.
export const TABLET_MIN_WIDTH = 600;
/** Desde este ancho las listas de tarjetas pasan a dos columnas. */
export const TWO_COLUMNS_MIN_WIDTH = 840;
export const CONTENT_MAX_WIDTH = 1160;
export const FORM_MAX_WIDTH = 760;
export const SHEET_MAX_WIDTH = 640;

export interface Layout {
  width: number;
  isTablet: boolean;
  /** Margen lateral del contenido. */
  gutter: number;
  /** Columnas de las listas de tarjetas (lotes, alertas, ofertas, catálogo). */
  listColumns: number;
}

export function layoutFor(windowWidth: number): Layout {
  const width = Math.max(0, windowWidth);
  const isTablet = width >= TABLET_MIN_WIDTH;
  return {
    width,
    isTablet,
    gutter: isTablet ? 24 : 16,
    listColumns: width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1,
  };
}

export function useLayout(): Layout {
  return layoutFor(useWindowDimensions().width);
}

/** Contenido centrado con un ancho máximo: en tabletas grandes no se estira de borde a borde. */
export const contentFrame = { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } as const;
/** Igual, más angosto: para formularios y pantallas de una sola columna. */
export const formFrame = { width: '100%', maxWidth: FORM_MAX_WIDTH, alignSelf: 'center' } as const;
/** Hoja inferior: en tabletas queda centrada y acotada en lugar de cubrir todo el ancho. */
export const sheetFrame = { width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' } as const;
