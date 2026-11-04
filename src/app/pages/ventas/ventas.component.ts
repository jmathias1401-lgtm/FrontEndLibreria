import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ProductoService } from '../../services/producto.service';
import { VentasService } from '../../services/ventas.service';
import { Product } from '../../models/product';
import { ModalVentasComponent } from '../modal/modal-ventas/modal-ventas.component';
import { VentaProductoModalComponent } from '../modal/venta-producto-modal/venta-producto-modal.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css',
  providers: [{ provide: LOCALE_ID, useValue: "en-US" }, VentasService]
})
export class VentaComponent implements OnInit {

  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  prod: any[] = [];
  total: number = 0;
  xpage: number = 0;
  search: string = "";
  codBarra: string = "";
  terminoBusqueda: string = '';
  totalVenta: number = 0;
  prodDetalle: Product[] = [];
  elegirPrecio: number = 0.0;
  procesoEnCurso = false;
  mensaje: string | null = null;
  error = false;

  ngOnInit(): void {
    this.vertodos(1); 
  }

  vertodos(index: number): void {
    this.productoService.getProductos(index).subscribe(response => {
      this.prod = response.list;
      this.total = response.total;
      this.xpage = response.xpage;
    });
  }

  buscarProducto(): void {
    console.log('Buscando:', this.terminoBusqueda);
  }
  
  buscar(): void {
    if (this.search.length > 0) {
      this.productoService.getProductosBySearch(this.search).subscribe(response => {
        this.prod = response.list;
        this.total = response.total;
        this.xpage = response.xpage;
      });
    } else if (this.codBarra.length > 0) {
      this.productoService.getProductosByCodBarra(this.codBarra).subscribe(response => {
        this.prod = response.list;
        this.total = response.total;
        this.xpage = response.xpage;
      });
    } else if (this.codBarra.length === 0 && this.search.length === 0) {
      this.vertodos(1); 
    }
  }
  
  agregarProducto(producto: Product): void {
    if (producto.stock === 0) {
      this.toastr.warning('No hay stock disponible para este producto.');
      return;
    }
    
    const dialogRef = this.dialog.open(VentaProductoModalComponent, {
      width: '600px',
      height: '400px',
      data: { producto: producto }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        const existingProductIndex = this.prodDetalle.findIndex(
          item => item.idproducto === resultado.idproducto && item.tipoPrecioSeleccionado === resultado.tipoPrecioSeleccionado
        );
        if (existingProductIndex > -1) {
          const existingItem = this.prodDetalle[existingProductIndex];
          const nuevaCantidad = (existingItem.cantidadLlevar || 0) + resultado.cantidadLlevar;
          
          if (nuevaCantidad > (producto.stock || 0)) {
            this.toastr.warning('La cantidad total acumulada para este producto supera el stock disponible (' + producto.stock + ').');
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

  finalizarVenta(): void {
    if (this.prodDetalle.length === 0) {
      this.toastr.warning('No hay productos en la venta');
      return;
    }
    
    this.toastr.info(`Venta completada. Total: S/ ${this.totalVenta.toFixed(2)}`);
    this.cancelarVenta();
  }

  agregarProductosAVenta(): void {
    this.procesoEnCurso = true;
    this.mensaje = 'Creando la venta...';
    this.error = false;

    try {
      const modalVenta = this.dialog.open(ModalVentasComponent, {
        maxWidth: '800px',
        data: this.prodDetalle
      });
     
      modalVenta.afterClosed().subscribe((resultado) => {
        if (resultado === 'venta-finalizada') {
          this.limpiarVentaYBusqueda();
          this.mensaje = '✅ Venta completada y comprobante impreso exitosamente.';
        }
      });
    } catch (err: any) {
      this.error = true;
      this.mensaje = `❌ Error: ${err.message}`;
    } finally {
      this.procesoEnCurso = false;
    }
  }

  cancelarVenta(): void {
    if (this.prodDetalle.length === 0 || confirm('¿Estás seguro de cancelar esta venta?')) {
      this.prodDetalle = [];
      this.totalVenta = 0;
    }
  }

  private limpiarVentaYBusqueda(): void {
    this.prodDetalle = [];
    this.totalVenta = 0;
    this.search = '';
    this.codBarra = '';
    this.vertodos(1);
  }
}

