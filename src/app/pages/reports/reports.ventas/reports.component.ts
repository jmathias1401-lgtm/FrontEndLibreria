import { Component, OnInit } from '@angular/core';
import { EmpleadoRendimientoDto, VentasService } from '../../../services/ventas.service';
import { EmpleadoService } from '../../../services/empleado.service';
import { Empleado } from '../../../models/empleado';
import { DetalleVentaService } from '../../../services/detalleventa.service';
import { Venta, ventaList } from '../../../models/venta.model';
import { DetalleVenta, DetalleVentaList } from '../../../models/detalleventa';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
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
  // Modo de vista: Transacciones detalladas o Rendimiento e Incentivos
  vistaReporte: 'TRANSACCIONES' | 'INCENTIVOS' = 'TRANSACCIONES';
  puedeVerIncentivos: boolean = false;

  empleados: Empleado[] = [];
  selectedEmpleadoId: number = 0;

  // Rendimiento e Incentivos de Empleados
  rendimientoEmpleados: EmpleadoRendimientoDto[] = [];
  tasaIncentivo: number = 5; // Comisión / Incentivo por defecto 5%
  cargandoRendimiento: boolean = false;

  ventas: Venta[] = [];
  filteredVentas: any[] = [];
  detallesVenta: { [key: number]: DetalleVenta[] } = {};
  selectedVentaId: number | null = null;

  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalVentas: number = 0;
  totalPages: number = 0;
  pages: any[] = [];
  nextCount: number = 1;
  agrupados: any = {};

  // Agregados por empleado y por período (incluye incentivo)
  employeeAggregates: { [id: number]: { daily: number; weekly: number; monthly: number; yearly: number; totalVentas: number; incentive: number } } = {};
  // Porcentaje de incentivo (ejemplo: 5%)
  readonly incentiveRate = 0.05;

  /** Calcula totales por empleado y por período (día, semana, mes, año) */
  computeAggregates(): void {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // domingo como inicio de semana
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    this.employeeAggregates = {};
    for (const v of this.ventas) {
      const empId = v.empleado?.idempleado || (v as any).empleado?.id || (v as any).vendedor?.id || 0;
      const monto = v.costoventa || (v as any).total || 0;
      if (!this.employeeAggregates[empId]) {
        this.employeeAggregates[empId] = { daily: 0, weekly: 0, monthly: 0, yearly: 0, totalVentas: 0, incentive: 0 };
      }
      const agg = this.employeeAggregates[empId];
      const rawDate = v.fechaventa || v.fechaVenta;
      const ventaDate = rawDate ? new Date(rawDate) : new Date();
      agg.totalVentas++;
      if (ventaDate >= startOfDay) agg.daily += monto;
      if (ventaDate >= startOfWeek) agg.weekly += monto;
      if (ventaDate >= startOfMonth) agg.monthly += monto;
      if (ventaDate >= startOfYear) agg.yearly += monto;
      agg.incentive = Number((agg.monthly * this.incentiveRate).toFixed(2));
    }
  }

  cargarEmpleados(): void {
    this.empleadoService.listar(1, 100).subscribe({
      next: (res) => {
        this.empleados = res.list || [];
      },
      error: (err) => console.error('Error al cargar empleados:', err)
    });
  }

  cargarRendimientoEmpleados(): void {
    if (!this.puedeVerIncentivos) {
      this.rendimientoEmpleados = [];
      return;
    }
    this.cargandoRendimiento = true;
    this.ventasService.getRendimientoEmpleados().subscribe({
      next: (data) => {
        this.rendimientoEmpleados = data || [];
        this.cargandoRendimiento = false;
      },
      error: (err) => {
        console.error('Error al cargar rendimiento de empleados:', err);
        this.cargandoRendimiento = false;
      }
    });
  }

  // Filtros de Período y Fechas (Fase 2)
  periodoSeleccionado: 'HOY' | 'AYER' | 'ULTIMOS_7' | 'ESTE_MES' | 'ESTE_ANIO' | 'PERSONALIZADO' = 'ESTE_MES';
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
    private ticketService: TicketService,
    private empleadoService: EmpleadoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.verificarPermisos();
    this.seleccionarPeriodo('ESTE_MES');
    this.cargarEmpleados();
    if (this.puedeVerIncentivos) {
      this.cargarRendimientoEmpleados();
    }
  }

  private verificarPermisos(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const cargoId = payload?.idcargo || payload?.cargo?.idcargo;
        // El rol VENDEDOR (idcargo = 2) no tiene acceso al reporte de rendimiento e incentivos
        this.puedeVerIncentivos = (cargoId !== 2);
        if (!this.puedeVerIncentivos) {
          this.vistaReporte = 'TRANSACCIONES';
        }
      } catch (e) {
        console.error('Error al decodificar token en ReportsComponent:', e);
        this.puedeVerIncentivos = false;
      }
    } else {
      this.puedeVerIncentivos = false;
    }
  }

  seleccionarPeriodo(periodo: 'HOY' | 'AYER' | 'ULTIMOS_7' | 'ESTE_MES' | 'ESTE_ANIO' | 'PERSONALIZADO'): void {
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
      case 'ESTE_ANIO': {
        const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1);
        this.fechaInicio = formatDate(primerDiaAnio);
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

  filtrarPorEmpleado(idEmpleado: number): void {
    this.selectedEmpleadoId = idEmpleado;
    this.vistaReporte = 'TRANSACCIONES';
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
      fechaFin: this.fechaFin || undefined,
      idEmpleado: (this.selectedEmpleadoId && this.selectedEmpleadoId > 0) ? this.selectedEmpleadoId : undefined
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
        this.computeAggregates();
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
      fechaFin: this.fechaFin || undefined,
      idEmpleado: (this.selectedEmpleadoId && this.selectedEmpleadoId > 0) ? this.selectedEmpleadoId : undefined
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

  exportarIncentivosExcel(): void {
    if (!this.puedeVerIncentivos) return;
    if (!this.rendimientoEmpleados || this.rendimientoEmpleados.length === 0) return;
    const tasa = (this.tasaIncentivo || 0) / 100;

    const dataExcel = this.rendimientoEmpleados.map(e => {
      const vMes = Number(e.ventasMes) || 0;
      const vAnio = Number(e.ventasAnio) || 0;
      const incMes = Number((vMes * tasa).toFixed(2));
      const incAnio = Number((vAnio * tasa).toFixed(2));

      return {
        'ID Vendedor': e.idEmpleado,
        'Vendedor': e.empleado,
        'Ventas Hoy (S/)': Number(Number(e.ventasHoy || 0).toFixed(2)),
        'Ventas Esta Semana (S/)': Number(Number(e.ventasSemana || 0).toFixed(2)),
        'Ventas Este Mes (S/)': Number(vMes.toFixed(2)),
        'Ventas Este Año (S/)': Number(vAnio.toFixed(2)),
        'Total Transacciones': e.totalTransacciones || 0,
        '% Incentivo': `${this.tasaIncentivo}%`,
        'Incentivo Mes (S/)': incMes,
        'Incentivo Año (S/)': incAnio
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incentivos_Vendedores');
    const hoyStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `liquidacion_incentivos_vendedores_${hoyStr}.xlsx`);
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
