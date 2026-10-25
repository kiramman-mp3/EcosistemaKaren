import { useWindowDimensions } from 'react-native';

// Medidas de la interfaz según el ancho de la ventana: teléfono, tableta (desde 600 px, como Android) y
// tableta grande o apaisada (desde 960 px). Las pantallas no preguntan por el dispositivo sino por su ancho,
// así también responden bien a la ventana dividida o a girar la tableta.
export const TABLET_MIN_WIDTH = 600;
export const WIDE_MIN_WIDTH = 960;
/** Ancho máximo del contenido: en pantallas más anchas queda centrado en lugar de estirarse. */
export const CONTENT_MAX_WIDTH = 1180;
/** Ancho máximo de hojas inferiores y ventanas de formulario. */
export const SHEET_MAX_WIDTH = 560;

const PRODUCT_CARD_MIN_WIDTH = 170;
const PRODUCT_GAP = 10;
const MAX_PRODUCT_COLUMNS = 5;

export interface Layout {
  width: number;
  isTablet: boolean;
  isWide: boolean;
  /** Ancho que ocupa el contenido (la ventana, hasta CONTENT_MAX_WIDTH). */
  contentWidth: number;
  /** Margen lateral del contenido. */
  gutter: number;
  productColumns: number;
  offerColumns: number;
  aisleColumns: number;
  reservationColumns: number;
}

export function layoutFor(windowWidth: number): Layout {
  const width = Math.max(0, windowWidth);
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isWide = width >= WIDE_MIN_WIDTH;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const gutter = isTablet ? 24 : 16;
  const fitting = Math.floor((contentWidth - gutter * 2 + PRODUCT_GAP) / (PRODUCT_CARD_MIN_WIDTH + PRODUCT_GAP));
  return {
    width,
    isTablet,
    isWide,
    contentWidth,
    gutter,
    productColumns: Math.min(MAX_PRODUCT_COLUMNS, Math.max(2, fitting)),
    offerColumns: isWide ? 3 : isTablet ? 2 : 1,
    aisleColumns: isWide ? 4 : isTablet ? 3 : 2,
    reservationColumns: isWide ? 2 : 1,
  };
}

export function useLayout(): Layout {
  return layoutFor(useWindowDimensions().width);
}

/** Ancho en píxeles de cada celda de una cuadrícula con `columns` columnas y `gap` entre ellas. */
export function cellWidth(containerWidth: number, columns: number, gap: number): number {
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}
