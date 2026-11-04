import { Component, OnInit } from '@angular/core';
import { VentasService } from '../../../services/ventas.service';
import { DetalleVentaService } from '../../../services/detalleventa.service';
import { Venta, ventaList } from '../../../models/venta.model';
import { DetalleVenta, DetalleVentaList } from '../../../models/detalleventa';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../../services/ticket.service';
import { PaginateComponent } from '../../../shared/paginate/paginate.component';

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

   // Filtros
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
    this.loadVentas();
  }

  loadVentas(): void {
    this.ventasService.ListWithFilters(this.currentPage, this.itemsPerPage, {}).subscribe((response: ventaList) => {
      this.ventas = response.list;
      this.agrupados = Object.values(response.list);
      this.filteredVentas = [...this.agrupados];
      this.totalVentas = response.total;
      this.totalPages = Math.ceil(this.totalVentas / this.itemsPerPage);
      this.pages = this.generatePageRange(1, this.totalPages > 30 ? 30 : this.totalPages);
    });
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
     const filters = {
       serie: this.filterSerie || undefined,
       correlativo: this.filterCorrelativo || undefined,
       search: this.filterSearch || undefined
     };
     this.ventasService.ListWithFilters(this.currentPage, this.itemsPerPage, filters).subscribe((response: ventaList) => {
       this.ventas = response.list;
       this.agrupados = Object.values(response.list);
       this.filteredVentas = this.agrupados.filter((venta: any) => {
         const idMatch = !this.filterId || venta.idventa.toString().includes(this.filterId);
         const fechaMatch = !this.filterFecha || new Date(venta.fechaventa).toLocaleDateString().includes(this.filterFecha);
         const totalMatch = !this.filterTotal || venta.costoventa.toString().includes(this.filterTotal);
         const clienteMatch = !this.filterCliente || `${venta.cliente.persona.nombre} ${venta.cliente.persona.paterno}`.toLowerCase().includes(this.filterCliente.toLowerCase());
         return idMatch && fechaMatch && totalMatch && clienteMatch;
       });
       this.totalVentas = response.total;
       this.totalPages = Math.ceil(this.totalVentas / this.itemsPerPage);
       this.pages = this.generatePageRange(1, this.totalPages > 30 ? 30 : this.totalPages);
     });
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
