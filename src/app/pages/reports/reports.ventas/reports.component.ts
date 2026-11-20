import { Component, OnInit } from '@angular/core';
import { VentasService } from '../../../services/ventas.service';
import { DetalleVentaService } from '../../../services/detalleventa.service';
import { Venta, ventaList } from '../../../models/venta.model';
import { DetalleVenta, DetalleVentaList } from '../../../models/detalleventa';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../../services/ticket.service';
import { PaginateComponent } from '../../../shared/paginate/paginate.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, PaginateComponent]
})
export class ReportsComponent implements OnInit {

  ventas: Venta[] = [];
  detallesVenta: { [key: number]: DetalleVenta[] } = {};
  selectedVentaId: number | null = null;

  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalVentas: number = 0;
  totalPages: number = 0;
  pages: any[] = [];
  nextCount: number = 1;
  agrupados: any={};
  filteredVentas: any[] = [];

  // Filtros de Período y Fechas (Fase 2)
  periodoSeleccionado: 'HOY' | 'AYER' | 'ULTIMOS_7' | 'ESTE_MES' | 'PERSONALIZADO' = 'ESTE_MES';
  fechaInicio: string = '';
  fechaFin: string = '';
  tipoComprobanteFiltro: string = 'TODOS';
  cargandoReporte: boolean = false;
  exportandoExcel: boolean = false;

  resumenPeriodo = {
    totalMonto: 0,
    totalComprobantes: 0,
    totalSubtotal: 0,
    totalIgv: 0,
    ticketPromedio: 0
  };

  // Filtros de columna
  filterId: string = '';
   filterSerie: string = '';
   filterCorrelativo: string = '';
   filterFecha: string = '';
   filterTotal: string = '';
   filterCliente: string = '';
   filterSearch: string = '';

  // Mostrar filtros
  showFilterId: boolean = false;
  showFilterSerie: boolean = false;
  showFilterCorrelativo: boolean = false;
  showFilterFecha: boolean = false;
  showFilterTotal: boolean = false;
  showFilterCliente: boolean = false;
  constructor(
    private ventasService: VentasService,
    private detalleVentaService: DetalleVentaService,
    private ticketService: TicketService
  ) { }

  ngOnInit(): void {
    this.seleccionarPeriodo('ESTE_MES');
  }

  seleccionarPeriodo(periodo: 'HOY' | 'AYER' | 'ULTIMOS_7' | 'ESTE_MES' | 'PERSONALIZADO'): void {
    this.periodoSeleccionado = periodo;
    const hoy = new Date();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (periodo) {
      case 'HOY':
        this.fechaInicio = formatDate(hoy);
        this.fechaFin = formatDate(hoy);
        break;
      case 'AYER': {
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        this.fechaInicio = formatDate(ayer);
        this.fechaFin = formatDate(ayer);
        break;
      }
      case 'ULTIMOS_7': {
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hoy.getDate() - 6);
        this.fechaInicio = formatDate(hace7Dias);
        this.fechaFin = formatDate(hoy);
        break;
      }
      case 'ESTE_MES': {
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        this.fechaInicio = formatDate(primerDiaMes);
        this.fechaFin = formatDate(hoy);
        break;
      }
      case 'PERSONALIZADO':
        // Mantiene las fechas que el usuario elija en los inputs
        break;
    }

    this.currentPage = 1;
    this.applyFilters();
  }

  loadVentas(): void {
    this.applyFilters();
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  generatePageRange(start: number, end: number) {
    let pages_ = [];
    for (let i = start; i <= end; i++) {
      pages_.push(i);
    }
    return pages_;
  }

  previoPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
    }
  }

  toggleDetalles(ventaId: number): void {
    if (this.selectedVentaId === ventaId) {
      this.selectedVentaId = null;
    } else {
      this.selectedVentaId = ventaId;
      if (!this.detallesVenta[ventaId]) {
        this.detalleVentaService.getDetallesPorVenta(ventaId).subscribe((response: DetalleVentaList) => {
          this.detallesVenta[ventaId] = response.list;
        });
      }
    }
  }

  toggleFilter(column: string): void {
    switch (column) {
      case 'id':
        this.showFilterId = !this.showFilterId;
        break;
       case 'serie':
         this.showFilterSerie = !this.showFilterSerie;
         break;
      case 'correlativo':
        this.showFilterCorrelativo = !this.showFilterCorrelativo;
        break;
      case 'fecha':
        this.showFilterFecha = !this.showFilterFecha;
        break;
      case 'total':
        this.showFilterTotal = !this.showFilterTotal;
        break;
      case 'cliente':
        this.showFilterCliente = !this.showFilterCliente;
        break;
    }
  }

  applyFilters(): void {
    this.cargandoReporte = true;
    const filters = {
      serie: this.filterSerie || undefined,
      correlativo: this.filterCorrelativo || undefined,
      search: this.filterSearch || undefined,
      fechaInicio: this.fechaInicio || undefined,
      fechaFin: this.fechaFin || undefined
    };

    this.ventasService.ListWithFilters(this.currentPage, this.itemsPerPage, filters).subscribe({
      next: (response: ventaList) => {
        this.ventas = response.list || [];
        this.agrupados = Object.values(response.list || []);
        this.filteredVentas = this.agrupados.filter((venta: any) => {
          const idMatch = !this.filterId || venta.idventa.toString().includes(this.filterId);
          const fechaMatch = !this.filterFecha || (venta.fechaventa && new Date(venta.fechaventa).toLocaleDateString().includes(this.filterFecha));
          const totalMatch = !this.filterTotal || (venta.costoventa && venta.costoventa.toString().includes(this.filterTotal));
          const clienteMatch = !this.filterCliente || `${venta.cliente?.persona?.nombre || ''} ${venta.cliente?.persona?.paterno || ''}`.toLowerCase().includes(this.filterCliente.toLowerCase());
          
          let tipoMatch = true;
          if (this.tipoComprobanteFiltro !== 'TODOS') {
            const compNombre = venta.tipoComprobante?.nombrecomprobante || 'TICKET';
            tipoMatch = compNombre.toUpperCase().includes(this.tipoComprobanteFiltro.toUpperCase());
          }

          return idMatch && fechaMatch && totalMatch && clienteMatch && tipoMatch;
        });

        this.totalVentas = response.total;
        this.totalPages = Math.ceil(this.totalVentas / this.itemsPerPage) || 1;
        this.pages = this.generatePageRange(1, this.totalPages > 30 ? 30 : this.totalPages);
        this.calcularResumen();
        this.cargandoReporte = false;
      },
      error: (err) => {
        console.error('Error cargando ventas:', err);
        this.cargandoReporte = false;
      }
    });
  }

  calcularResumen(): void {
    let monto = 0;
    let subtotal = 0;
    let igv = 0;

    this.filteredVentas.forEach((v: any) => {
      const tot = Number(v.costoventa) || 0;
      const sub = Number(v.subtotal) || (tot / 1.18);
      const imp = Number(v.igv) || (tot - sub);

      monto += tot;
      subtotal += sub;
      igv += imp;
    });

    const cant = this.filteredVentas.length;
    this.resumenPeriodo = {
      totalMonto: monto,
      totalComprobantes: cant,
      totalSubtotal: subtotal,
      totalIgv: igv,
      ticketPromedio: cant > 0 ? (monto / cant) : 0
    };
  }

  // --- EXPORTACIÓN A EXCEL CON XLSX ---
  exportarExcel(): void {
    this.exportandoExcel = true;
    const filters = {
      serie: this.filterSerie || undefined,
      correlativo: this.filterCorrelativo || undefined,
      search: this.filterSearch || undefined,
      fechaInicio: this.fechaInicio || undefined,
      fechaFin: this.fechaFin || undefined
    };

    // Traer todos los registros del rango (hasta 2000) para exportación completa
    const limiteExport = this.totalVentas > 0 ? this.totalVentas : 1000;
    this.ventasService.ListWithFilters(1, limiteExport, filters).subscribe({
      next: (response: ventaList) => {
        const lista = response.list || [];
        let totalGeneral = 0;
        let subtotalGeneral = 0;
        let igvGeneral = 0;

        const dataExcel = lista.map((v: any) => {
          const tot = Number(v.costoventa) || 0;
          const sub = Number(v.subtotal) || (tot / 1.18);
          const imp = Number(v.igv) || (tot - sub);
          totalGeneral += tot;
          subtotalGeneral += sub;
          igvGeneral += imp;

          const clienteNombre = v.cliente?.persona 
            ? `${v.cliente.persona.nombre || ''} ${v.cliente.persona.paterno || ''}`.trim() 
            : 'Público General';

          const vendedorNombre = v.empleado?.persona 
            ? `${v.empleado.persona.nombre || ''} ${v.empleado.persona.paterno || ''}`.trim() 
            : 'Caja';

          return {
            'ID Venta': v.idventa,
            'Fecha y Hora': v.fechaventa ? new Date(v.fechaventa).toLocaleString('es-PE') : '',
            'Comprobante': v.tipoComprobante?.nombrecomprobante || 'TICKET',
            'Serie': v.serie || '',
            'Número': v.correlativo || '',
            'Cliente': clienteNombre,
            'Vendedor': vendedorNombre,
            'Subtotal (S/)': Number(sub.toFixed(2)),
            'IGV (S/)': Number(imp.toFixed(2)),
            'Total (S/)': Number(tot.toFixed(2))
          };
        });

        // Fila de Totales
        dataExcel.push({
          'ID Venta': 'TOTAL GENERAL',
          'Fecha y Hora': '',
          'Comprobante': '',
          'Serie': '',
          'Número': `${lista.length} transacciones`,
          'Cliente': '',
          'Vendedor': '',
          'Subtotal (S/)': Number(subtotalGeneral.toFixed(2)),
          'IGV (S/)': Number(igvGeneral.toFixed(2)),
          'Total (S/)': Number(totalGeneral.toFixed(2))
        } as any);

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
        const workbook: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Ventas');

        const nombreArchivo = `reporte_ventas_${this.fechaInicio}_al_${this.fechaFin}.xlsx`;
        XLSX.writeFile(workbook, nombreArchivo);
        this.exportandoExcel = false;
      },
      error: (err) => {
        console.error('Error exportando Excel:', err);
        this.exportandoExcel = false;
      }
    });
  }

  // --- IMPRESIÓN CONSOLIDADA DE REPORTE ---
  imprimirReporteConsolidado(): void {
    let filasHtml = '';
    this.filteredVentas.forEach((v: any, index: number) => {
      const clienteNombre = v.cliente?.persona 
        ? `${v.cliente.persona.nombre || ''} ${v.cliente.persona.paterno || ''}`.trim() 
        : 'Público General';
      const vendedorNombre = v.empleado?.persona 
        ? `${v.empleado.persona.nombre || ''} ${v.empleado.persona.paterno || ''}`.trim() 
        : 'Caja';
      const fecha = v.fechaventa ? new Date(v.fechaventa).toLocaleString('es-PE') : '';

      filasHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${v.idventa}</td>
          <td style="text-align: center;">${fecha}</td>
          <td style="text-align: center;"><strong>${v.tipoComprobante?.nombrecomprobante || 'TICKET'} ${v.serie}-${v.correlativo}</strong></td>
          <td>${clienteNombre}</td>
          <td>${vendedorNombre}</td>
          <td style="text-align: right;">S/ ${(Number(v.subtotal) || (Number(v.costoventa) / 1.18)).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">S/ ${(Number(v.costoventa) || 0).toFixed(2)}</td>
        </tr>
      `;
    });

    const printHtml = `
      <html>
        <head>
          <title>Reporte Consolidado de Ventas - Librería Mathias</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
            h2, p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #444; padding: 4px 6px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .resumen-box { display: flex; justify-content: space-between; margin-top: 12px; padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; }
            .resumen-item { text-align: center; }
            .resumen-val { font-size: 14px; font-weight: bold; color: #007bff; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="border-bottom: 2px solid #007bff; padding-bottom: 8px;">
            <h2>LIBRERÍA & ÚTILES ESCOLARES</h2>
            <p><strong>REPORTE CONSOLIDADO DE VENTAS Y FACTURACIÓN</strong></p>
            <p>Período: <strong>${this.fechaInicio || 'Inicio'} al ${this.fechaFin || 'Hoy'}</strong> | Generado: ${new Date().toLocaleString('es-PE')}</p>
          </div>

          <div class="resumen-box">
            <div class="resumen-item">
              <div>COMPROBANTES</div>
              <div class="resumen-val">${this.resumenPeriodo.totalComprobantes}</div>
            </div>
            <div class="resumen-item">
              <div>SUBTOTAL BASE</div>
              <div class="resumen-val">S/ ${this.resumenPeriodo.totalSubtotal.toFixed(2)}</div>
            </div>
            <div class="resumen-item">
              <div>IGV (18%)</div>
              <div class="resumen-val">S/ ${this.resumenPeriodo.totalIgv.toFixed(2)}</div>
            </div>
            <div class="resumen-item">
              <div>TOTAL FACTURADO</div>
              <div class="resumen-val" style="color: #28a745;">S/ ${this.resumenPeriodo.totalMonto.toFixed(2)}</div>
            </div>
            <div class="resumen-item">
              <div>TICKET PROMEDIO</div>
              <div class="resumen-val" style="color: #17a2b8;">S/ ${this.resumenPeriodo.ticketPromedio.toFixed(2)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 60px;">ID VENTA</th>
                <th style="width: 120px;">FECHA Y HORA</th>
                <th style="width: 130px;">COMPROBANTE</th>
                <th>CLIENTE</th>
                <th>VENDEDOR</th>
                <th style="width: 80px; text-align: right;">SUBTOTAL</th>
                <th style="width: 90px; text-align: right;">TOTAL (S/)</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f2f2f2; font-weight: bold;">
                <td colspan="6" style="text-align: right;">TOTAL GENERAL DEL PERÍODO:</td>
                <td style="text-align: right;">S/ ${this.resumenPeriodo.totalSubtotal.toFixed(2)}</td>
                <td style="text-align: right; color: #28a745; font-size: 12px;">S/ ${this.resumenPeriodo.totalMonto.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 50px; display: flex; justify-content: space-around;">
            <div style="border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px;">
              Firma de Cajero / Responsable
            </div>
            <div style="border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px;">
              V° B° Administración / Gerencia
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
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

  isPrinting: boolean = false;

  reimprimirTicket(venta: Venta): void {
    if (this.isPrinting) return;
    this.isPrinting = true;

    const ventaId = venta.idventa!;
    if (!this.detallesVenta[ventaId]) {
      this.detalleVentaService.getDetallesPorVenta(ventaId).subscribe({
        next: (response: DetalleVentaList) => {
          this.detallesVenta[ventaId] = response.list;
          this.imprimir(venta, response.list);
          setTimeout(() => this.isPrinting = false, 1000);
        },
        error: () => {
          this.isPrinting = false;
        }
      });
    } else {
      this.imprimir(venta, this.detallesVenta[ventaId]);
      setTimeout(() => this.isPrinting = false, 1000);
    }
  }

  private imprimir(venta: any, detalles: DetalleVenta[]): void {
    const cliente = venta.cliente?.persona;
    const clienteNombre = cliente ? `${cliente.nombre || ''} ${cliente.paterno || ''} ${cliente.materno || ''}`.trim() : 'PÚBLICO GENERAL';
    const ticketHTML = this.ticketService.createTicketHTML(venta, detalles, clienteNombre || 'PÚBLICO GENERAL', 'REIMPRESIÓN DE TICKET');
    this.ticketService.printDirect(ticketHTML);
  }
}
