// Reglas de las insignias del catálogo, con los datos reales que envía la tienda:
//  - "Nuevo": producto dado de alta hace NEW_PRODUCT_DAYS días o menos (created_at).
//  - "Más vendido": entre los productos con alguna venta en los últimos 30 días (vendidos30d),
//    el BEST_SELLER_SHARE superior del catálogo. Un empate en el corte entra completo.
// Sin datos (sin fecha o sin ventas) un producto nunca recibe la insignia.
export const NEW_PRODUCT_DAYS = 14;
export const BEST_SELLER_SHARE = 0.1;

const DAY_MS = 86_400_000;

export function isNewProduct(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created) || created > now) return false;
  return now - created <= NEW_PRODUCT_DAYS * DAY_MS;
}

/** Ids de los productos "Más vendidos" del catálogo completo. */
export function bestSellerIds(products: { id: string; soldLast30d?: number }[]): Set<string> {
  const sold = products.filter(product => (product.soldLast30d ?? 0) > 0)
    .sort((a, b) => (b.soldLast30d ?? 0) - (a.soldLast30d ?? 0));
  const slots = Math.ceil(products.length * BEST_SELLER_SHARE);
  if (sold.length === 0 || slots === 0) return new Set();
  const cutoff = sold[Math.min(slots, sold.length) - 1].soldLast30d ?? 0;
  return new Set(sold.filter(product => (product.soldLast30d ?? 0) >= cutoff).map(product => product.id));
}
