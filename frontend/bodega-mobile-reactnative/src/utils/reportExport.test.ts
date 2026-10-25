import { buildCsv, buildReportHtml, csvCell, escapeHtml, ReportData } from './reportExport';
import { InventoryMovement, InventoryWaste } from '../types';

const waste = (overrides: Partial<InventoryWaste> = {}): InventoryWaste => ({
  id: 'w1', loteId: 'lote-1234567890', movimientoId: 'm1', cantidad: 2, razon: 'Empaque dañado',
  costoUnitario: 1, costoTotal: 2, registradaPor: 'u1', registradaPorNombre: 'Ana', numeroLote: 'L-1',
  productoNombre: 'Leche', created_at: '2026-10-24T12:00:00.000Z', ...overrides,
});
const movement = (overrides: Partial<InventoryMovement> = {}): InventoryMovement => ({
  id: 'm1', loteId: 'lote-1234567890', tipo: 'MERMA', cantidad: 2, disponibleAntes: 10, disponibleDespues: 8,
  reservadaAntes: 0, reservadaDespues: 0, productoNombre: 'Leche', created_at: '2026-10-24T12:00:00.000Z', ...overrides,
});
const data = (overrides: Partial<ReportData> = {}): ReportData => ({
  totals: { ingresos: 10, ventas: 5, mermas: 2, costoMerma: 2 },
  wastes: [waste()], movements: [movement()], issuedAt: new Date('2026-10-24T12:00:00Z'), ...overrides,
});

describe('escapeHtml', () => {
  it('neutraliza etiquetas y comillas', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml("O'Brien & Hijos")).toBe('O&#39;Brien &amp; Hijos');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(12)).toBe('12');
  });
});

describe('csvCell', () => {
  it('cita el texto y duplica las comillas', () => {
    expect(csvCell('Leche "entera", 1 L')).toBe('"Leche ""entera"", 1 L"');
  });

  it('neutraliza las fórmulas de hoja de cálculo', () => {
    for (const value of ['=1+1', '+cmd|calc', '-2+3', '@SUMA(A1)', '\t=1']) {
      expect(csvCell(value)).toBe(`"'${value}"`);
    }
  });

  it('escribe los números tal cual (un negativo real no es una fórmula)', () => {
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(3.5)).toBe('3.5');
    expect(csvCell(NaN)).toBe('');
    expect(csvCell(null)).toBe('""');
  });
});

describe('buildCsv', () => {
  it('lleva BOM, saltos CRLF y las tres secciones', () => {
    const csv = buildCsv(data());
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('\r\n');
    expect(csv).toContain('"RESUMEN DE MÉTRICAS"');
    expect(csv).toContain('"BAJAS Y MERMAS"');
    expect(csv).toContain('"MOVIMIENTOS DE INVENTARIO"');
    expect(csv).toContain('"Ana"');
  });

  it('no deja que un nombre de producto o un motivo se ejecute como fórmula', () => {
    const csv = buildCsv(data({
      wastes: [waste({ productoNombre: '=HYPERLINK("http://x","clic")', razon: '@motivo' })],
      movements: [movement({ productoNombre: '+1+1' })],
    }));
    expect(csv).not.toMatch(/(^|,)"=HYPERLINK/m);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"",""clic"")"`);
    expect(csv).toContain(`"'@motivo"`);
    expect(csv).toContain(`"'+1+1"`);
  });
});

describe('buildReportHtml', () => {
  it('escapa los datos escritos por el personal', () => {
    const html = buildReportHtml(data({
      wastes: [waste({ productoNombre: '<script>alert(1)</script>', razon: '"><img src=x onerror=alert(2)>' })],
      movements: [movement({ productoNombre: '<b>negrita</b>' })],
    }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>negrita</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('muestra un aviso cuando no hay bajas ni movimientos', () => {
    const html = buildReportHtml(data({ wastes: [], movements: [] }));
    expect(html).toContain('Sin bajas registradas');
    expect(html).toContain('Sin movimientos');
  });
});
