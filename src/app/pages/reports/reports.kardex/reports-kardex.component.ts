import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventarioService, KardexBackendItem } from '../../../services/inventario.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports-kardex',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports-kardex.component.html',
  styleUrls: ['./reports-kardex.component.css']
})
export class ReportsKardexComponent implements OnInit {
  movimientos: KardexBackendItem[] = [];
  cargando: boolean = false;
  exportando: boolean = false;

  // Filtros
  filtroTipo: string = 'TODOS';
  filtroUsuario: string = '';
  filtroSearch: string = '';

  // Resumen del período
  resumen = {
    totalMovimientos: 0,
    totalSalidasMermas: 0,
    totalEntradas: 0,
    totalAjustesConteo: 0
  };

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.cargando = true;
    const filtros = {
      tipoOperacion: this.filtroTipo !== 'TODOS' ? this.filtroTipo : undefined,
      usuario: this.filtroUsuario || undefined,
      search: this.filtroSearch || undefined
    };

    this.inventarioService.obtenerAuditoriaGlobal(filtros).subscribe({
      next: (data) => {
        this.movimientos = data || [];
        this.calcularResumen();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando auditoría de kardex:', err);
        this.cargando = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filtroTipo = 'TODOS';
    this.filtroUsuario = '';
    this.filtroSearch = '';
    this.cargarMovimientos();
  }

  calcularResumen(): void {
    let salidas = 0;
    let entradas = 0;
    let conteos = 0;

    this.movimientos.forEach(m => {
      const cant = Number(m.cantidad) || 0;
      const tipo = (m.tipoOperacion || '').toUpperCase();

      if (tipo === 'SALIDA' || tipo === 'MERMA' || tipo === 'VENTA' || (tipo === 'CONTEO' && m.stockNuevo < m.stockAnterior)) {
        salidas += cant > 0 ? cant : Math.abs(m.stockNuevo - m.stockAnterior);
      } else if (tipo === 'ENTRADA' || tipo === 'COMPRA' || (tipo === 'CONTEO' && m.stockNuevo > m.stockAnterior)) {
        entradas += cant > 0 ? cant : Math.abs(m.stockNuevo - m.stockAnterior);
      }

      if (tipo === 'CONTEO' || tipo === 'AJUSTE') {
        conteos++;
      }
    });

    this.resumen = {
      totalMovimientos: this.movimientos.length,
      totalSalidasMermas: salidas,
      totalEntradas: entradas,
      totalAjustesConteo: conteos
    };
  }

  // --- EXPORTACIÓN A EXCEL (.XLSX) ---
  exportarExcel(): void {
    this.exportando = true;
    const dataExcel = this.movimientos.map((m: any, index: number) => {
      const prod = m.producto;
      const diferencia = (m.stockNuevo || 0) - (m.stockAnterior || 0);

      return {
        '#': index + 1,
        'Fecha y Hora': m.fecha ? new Date(m.fecha).toLocaleString('es-PE') : '',
        'Código': prod?.codigoproducto || prod?.idproducto || '',
        'Producto': prod?.nombre || 'Producto eliminado',
        'Marca': prod?.laboratorio?.nombrelaboratorio || '',
        'Operación': m.tipoOperacion || '',
        'Detalle / Motivo': m.motivo || '',
        'Stock Anterior': m.stockAnterior || 0,
        'Variación': diferencia > 0 ? `+${diferencia}` : `${diferencia}`,
        'Stock Resultante': m.stockNuevo || 0,
        'Cantidad Movida': m.cantidad || 0,
        'Usuario Responsable': m.usuario || 'Sistema'
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria_Kardex');

    const fileName = `auditoria_kardex_mermas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    this.exportando = false;
  }

  // --- IMPRESIÓN DE ACTA DE AUDITORÍA ---
  imprimirActa(): void {
    let filas = '';
    this.movimientos.forEach((m: any, i: number) => {
      const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-PE') : '';
      const prod = m.producto?.nombre || 'Producto';
      const dif = (m.stockNuevo || 0) - (m.stockAnterior || 0);
      const difText = dif > 0 ? `+${dif}` : `${dif}`;

      filas += `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center;">${fecha}</td>
          <td><strong>${prod}</strong></td>
          <td style="text-align: center;"><span style="font-weight: bold;">${m.tipoOperacion}</span></td>
          <td>${m.motivo || '-'}</td>
          <td style="text-align: center;">${m.stockAnterior}</td>
          <td style="text-align: center; font-weight: bold; color: ${dif < 0 ? '#dc3545' : '#28a745'};">${difText}</td>
          <td style="text-align: center; font-weight: bold;">${m.stockNuevo}</td>
          <td style="text-align: center;">${m.usuario || 'Admin'}</td>
        </tr>
      `;
    });

    const printHtml = `
      <html>
        <head>
          <title>Acta de Auditoría y Mermas de Inventario - Librería Mathias</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
            h2, p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #444; padding: 4px 6px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .kpis { display: flex; justify-content: space-between; margin-top: 12px; padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; }
            .kpi-val { font-size: 14px; font-weight: bold; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div style="border-bottom: 2px solid #333; padding-bottom: 8px;">
            <h2>LIBRERÍA & ÚTILES ESCOLARES</h2>
            <p><strong>ACTA DE AUDITORÍA DE KARDEX, ROTURAS Y AJUSTES DE STOCK</strong></p>
            <p>Generado el: ${new Date().toLocaleString('es-PE')} | Total Registros: ${this.movimientos.length}</p>
          </div>

          <div class="kpis">
            <div>TOTAL MOVIMIENTOS: <span class="kpi-val">${this.resumen.totalMovimientos}</span></div>
            <div>SALIDAS / MERMAS: <span class="kpi-val" style="color: #dc3545;">-${this.resumen.totalSalidasMermas} und.</span></div>
            <div>ENTRADAS / COMPRAS: <span class="kpi-val" style="color: #28a745;">+${this.resumen.totalEntradas} und.</span></div>
            <div>AJUSTES DE CONTEO: <span class="kpi-val" style="color: #ffc107;">${this.resumen.totalAjustesConteo}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 120px;">FECHA Y HORA</th>
                <th>PRODUCTO</th>
                <th style="width: 90px;">OPERACIÓN</th>
                <th>MOTIVO / DETALLE</th>
                <th style="width: 60px;">ST. ANT</th>
                <th style="width: 60px;">VARIAC.</th>
                <th style="width: 60px;">ST. NUEVO</th>
                <th style="width: 90px;">USUARIO</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>

          <div style="margin-top: 50px; display: flex; justify-content: space-around;">
            <div style="border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 5px;">
              Firma del Auditor / Encargado de Almacén
            </div>
            <div style="border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 5px;">
              V° B° Gerencia / Supervisión
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  }
}
