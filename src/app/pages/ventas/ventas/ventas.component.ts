import { Component, inject, LOCALE_ID, OnInit } from '@angular/core';
import { ProductoService } from '../../../services/producto.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../models/product';
import { Dialog } from '@angular/cdk/dialog';
import { PrecioComponent } from '../../modal/precio/precio.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VentasService } from '../../../services/ventas.service';
import { Venta } from '../../../models/venta.model';
import { ModalVentasComponent } from '../../modal/modal-ventas/modal-ventas.component';
import { VentaProductoModalComponent } from '../../modal/venta-producto-modal/venta-producto-modal.component';
@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css',
  providers:[{ provide: LOCALE_ID, useValue: "en-US" },VentasService]
})
export class VentaComponent implements OnInit {
  //private dialog=inject(Dialog);
 constructor(
    private productoService: ProductoService,private dialog: MatDialog
  )
  {
    
  }
  

  prod: any[] = [];
  total:number=0;
  xpage:number = 0;
  search:string = "";
  codBarra:string = "";
  terminoBusqueda: string = '';
  totalVenta: number = 0;
 // subtotal:number=0;
  prodDetalle: Product[] = [];
  elegirPrecio:number=0.0;
  // Variables para el proceso de venta
  procesoEnCurso = false;
  mensaje: string | null = null;
  error = false;

  ngOnInit(): void {
    // Datos de ejemplo - en una aplicación real esto vendría de un servicio
    this.vertodos(1); 
  }

   vertodos(index:number):void{
  this.productoService.getProductos(index).subscribe(
    response=>{
      this.prod=response.list;
      this.total=response.total;
      this.xpage=response.xpage;
      
    }
    );
  }

  buscarProducto(): void {
 
    console.log('Buscando:', this.terminoBusqueda);
   
  }
  
  buscar():void {
    if(this.search.length>0){
      this.productoService.getProductosBySearch(this.search).subscribe(
        response=>{
          this.prod=response.list;
          this.total=response.total;
          this.xpage=response.xpage;
        }
      );
    }
    else if(this.codBarra.length>0){
      this.productoService.getProductosByCodBarra(this.codBarra).subscribe(
        response=>{
          this.prod=response.list;
          this.total=response.total;
          this.xpage=response.xpage;
        }
      );
    }
    else if(this.codBarra.length==0 && this.search.length==0){
      this.vertodos(1); 
    }

    
  }
  
agregarProducto(producto: Product): void {
  
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
        existingItem.cantidadLlevar = (existingItem.cantidadLlevar || 0) + resultado.cantidadLlevar;
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
      this.calcularTotalGeneral(); // Recalculate total after removal
    }
  }
calcularTotalGeneral(): void {
    this.totalVenta = this.prodDetalle.reduce((sum, item) => sum + (item.subTotal || 0), 0);
  }
  
  

   finalizarVenta(): void {
   if (this.prodDetalle.length === 0) {
      alert('No hay productos en la venta');
      return;
    }
    
    console.log('Venta finalizada:', this.prodDetalle);
    alert(`Venta finalizada. Total: ${this.totalVenta}`); // Consider using MatDialog for alerts

    this.cancelarVenta(); // Clear the sale after finalizing
  }

  agregarProductosAVenta() {
    this.procesoEnCurso = true;
    this.mensaje = 'Creando la venta...';
    this.error = false;

    try {
        const modalVenta =this.dialog.open(ModalVentasComponent, {
        maxWidth: '800px',
        data: this.prodDetalle
        });
       
        modalVenta.afterClosed().subscribe(() => {
          this.prodDetalle = [];
          this.totalVenta = 0;
        });
         
      this.mensaje = `✅ Todos los productos han sido agregados a la Venta ${1} exitosamente.`;
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
  
}