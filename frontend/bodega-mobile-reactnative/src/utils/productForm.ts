export interface ProductFormValues {
  categoriaId: string;
  nombre: string;
  descripcion: string;
  precioVenta: string;
  impuestoPorcentaje: string;
  minStockAlerta: string;
}

export interface ProductFields {
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  impuestoPorcentaje: number;
  minStockAlerta: number;
}

/** Revisa lo escrito en el formulario de producto: los datos listos para enviar, o el mensaje del primer error. */
export function parseProductForm(form: ProductFormValues): { values: ProductFields } | { error: string } {
  const price = Number(form.precioVenta.replace(',', '.'));
  const tax = Number(form.impuestoPorcentaje.replace(',', '.'));
  const minimum = Number(form.minStockAlerta);
  if (!form.categoriaId) return { error: 'Elige el pasillo (categoría) del producto.' };
  if (form.nombre.trim().length < 3) return { error: 'El nombre debe tener al menos 3 caracteres.' };
  if (!Number.isFinite(price) || price <= 0) return { error: 'El PVP debe ser mayor a cero.' };
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) return { error: 'El IVA debe estar entre 0 y 100%.' };
  if (!form.minStockAlerta.trim() || !Number.isInteger(minimum) || minimum < 0) return { error: 'El stock mínimo debe ser un número entero.' };
  return {
    values: {
      categoriaId: form.categoriaId,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precioVenta: price,
      impuestoPorcentaje: tax,
      minStockAlerta: minimum,
    },
  };
}

/** El formulario de edición arranca con los datos actuales del producto. */
export function formFromProduct(product: {
  categoriaId: string; nombre: string; descripcion?: string | null; precioVenta: number | string;
  impuestoPorcentaje: number | string; minStockAlerta: number | string;
}): ProductFormValues {
  return {
    categoriaId: product.categoriaId,
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    precioVenta: String(Number(product.precioVenta)),
    impuestoPorcentaje: String(Number(product.impuestoPorcentaje || 0)),
    minStockAlerta: String(Number(product.minStockAlerta)),
  };
}
