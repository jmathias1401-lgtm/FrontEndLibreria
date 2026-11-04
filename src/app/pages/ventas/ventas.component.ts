import { Component, LOCALE_ID, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ProductoService } from '../../services/producto.service';
import { VentasService } from '../../services/ventas.service';
import { Product } from '../../models/product';
import { ModalVentasComponent } from '../modal/modal-ventas/modal-ventas.component';
import { VentaProductoModalComponent } from '../modal/venta-producto-modal/venta-producto-modal.component';
import { PaginateComponent } from '../../shared/paginate/paginate.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginateComponent],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css',
  providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, VentasService]
})
export class VentaComponent implements OnInit, OnDestroy {
  // Productos & Paginación
  prod: any[] = [];
  total: number = 0;
  xpage: number = 10;
  currentPage: number = 1;
  search: string = '';
  codBarra: string = '';

  // Carrito de Venta
  totalVenta: number = 0;
  prodDetalle: Product[] = [];

  // Estado del proceso
  procesoEnCurso = false;
  mensaje: string | null = null;
  error = false;

  // Búsqueda con debounce
  private searchSubject = new Subject<void>();
  private searchSubscription?: Subscription;

  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setupDebouncedSearch();
    this.vertodos(1);
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private setupDebouncedSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(350)
    ).subscribe(() => {
      this.buscar();
    });
  }

  onSearchInput(): void {
    this.searchSubject.next();
  }

  vertodos(index: number): void {
    this.currentPage = index;
    this.productoService.getProductos(index).subscribe({
      next: (response) => {
        this.prod = response.list || [];
        this.total = response.total || 0;
        this.xpage = response.xpage || 10;
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  onPageChange(page: number): void {
    this.vertodos(page);
  }

  buscar(): void {
    const s = this.search.trim();
    const c = this.codBarra.trim();

    if (s.length > 0) {
      this.productoService.getProductosBySearch(s).subscribe({
        next: (response) => {
          this.prod = response.list || [];
          this.total = response.total || 0;
          this.xpage = response.xpage || 10;
        },
        error: (err) => console.error('Error en búsqueda por nombre:', err)
      });
    } else if (c.length > 0) {
      this.productoService.getProductosByCodBarra(c).subscribe({
        next: (response) => {
          this.prod = response.list || [];
          this.total = response.total || 0;
          this.xpage = response.xpage || 10;
        },
        error: (err) => console.error('Error en búsqueda por código de barra:', err)
      });
    } else {
      this.vertodos(1);
    }
  }

  limpiarBusqueda(): void {
    this.search = '';
    this.codBarra = '';
    this.vertodos(1);
  }

  agregarProducto(producto: Product): void {
    if (!producto.stock || producto.stock <= 0) {
      this.toastr.warning('No hay stock disponible para este producto.');
      return;
    }

    const dialogRef = this.dialog.open(VentaProductoModalComponent, {
      width: '600px',
      height: '420px',
      data: { producto: producto }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        const existingProductIndex = this.prodDetalle.findIndex(
          (item) => item.idproducto === resultado.idproducto && item.tipoPrecioSeleccionado === resultado.tipoPrecioSeleccionado
        );

        if (existingProductIndex > -1) {
          const existingItem = this.prodDetalle[existingProductIndex];
          const nuevaCantidad = (existingItem.cantidadLlevar || 0) + resultado.cantidadLlevar;

          if (nuevaCantidad > (producto.stock || 0)) {
            this.toastr.warning(`La cantidad total acumulada para este producto supera el stock disponible (${producto.stock}).`);
            return;
          }

          existingItem.cantidadLlevar = nuevaCantidad;
          existingItem.subTotal = (existingItem.subTotal || 0) + resultado.subTotal;
        } else {
          this.prodDetalle.push(resultado);
        }
        this.calcularTotalGeneral();
      }
    });
  }

  eliminarProducto(index: number): void {
    if (index >= 0 && index < this.prodDetalle.length) {
      this.prodDetalle.splice(index, 1);
      this.calcularTotalGeneral();
    }
  }

  calcularTotalGeneral(): void {
    this.totalVenta = this.prodDetalle.reduce((sum, item) => sum + (item.subTotal || 0), 0);
  }

  agregarProductosAVenta(): void {
    if (this.prodDetalle.length === 0) {
      this.toastr.warning('Debe agregar al menos un producto a la venta');
      return;
    }

    this.procesoEnCurso = true;
    this.mensaje = 'Abriendo formulario de pago...';
    this.error = false;

    try {
      const modalVenta = this.dialog.open(ModalVentasComponent, {
        maxWidth: '800px',
        data: this.prodDetalle
      });

      modalVenta.afterClosed().subscribe((resultado) => {
        this.procesoEnCurso = false;
        if (resultado === 'venta-finalizada') {
          this.limpiarVentaYBusqueda();
          this.mensaje = '✅ Venta completada y comprobante impreso exitosamente.';
          this.toastr.success('¡Venta realizada con éxito!');
        }
      });
    } catch (err: any) {
      this.procesoEnCurso = false;
      this.error = true;
      this.mensaje = `❌ Error: ${err.message}`;
    }
  }

  cancelarVenta(): void {
    if (this.prodDetalle.length === 0 || confirm('¿Estás seguro de cancelar esta venta?')) {
      this.prodDetalle = [];
      this.totalVenta = 0;
      this.mensaje = null;
    }
  }

  private limpiarVentaYBusqueda(): void {
    this.prodDetalle = [];
    this.totalVenta = 0;
    this.search = '';
    this.codBarra = '';
    this.vertodos(this.currentPage);
  }
}
