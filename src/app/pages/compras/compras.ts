import { Component, inject, LOCALE_ID, OnInit } from '@angular/core';
import { ProductoService } from '../../services/producto.service';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/product';
import { Dialog } from '@angular/cdk/dialog';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ComprasService } from '../../services/compras.service';
import { Compra } from '../../models/compra';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor } from '../../models/proveedor';
import { Empleado } from '../../models/empleado';
import { TipoComprobante } from '../../models/tipocomprobante';
import { ToastrService } from 'ngx-toastr';
import { CompraProductoModalComponent } from '../modal/compra-producto-modal/compra-producto-modal.component';
import { DetalleCompraService } from '../../services/detallecompra.service';
import { Producto } from '../../models/producto';
import moment from 'moment';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
  providers: [{ provide: LOCALE_ID, useValue: "en-US" }, ComprasService]
})
export class ComprasComponent implements OnInit {
  //private dialog=inject(Dialog);
  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private proveedorService: ProveedorService,
    private toastr: ToastrService,
    private comprasService: ComprasService
    ,private DetalleCompraService:DetalleCompraService
  ) {}

  prod: any[] = [];
  total: number = 0;
  xpage: number = 0;
  search: string = "";
  codBarra: string = "";
  terminoBusqueda: string = '';
  totalCompra: number = 0;
  prodDetalle: any[] = [];
  elegirPrecio: number = 0.0;

  // Variables para el proceso de compra
  procesoEnCurso = false;
  mensaje: string | null = null;
  error = false;

  // For purchase details
  proveedores: any[] = [];
  empleados: any[] = [];
  comprobantes: TipoComprobante[] = [];
  selectedProveedor: Proveedor | null = null;
  selectedEmpleado: Empleado | null = null;
  selectedComprobante: TipoComprobante | null = null;
  serie: string = '';
  correlativo: string = '';
  fechaCompra: any = new Date();

  ngOnInit(): void {
    // Datos de ejemplo - en una aplicación real esto vendría de un servicio
      this.vertodos(1);
      this.loadproveedores();
      this.loadempleados();
      this.loadComprobantes();
      this.loadComprobanteSerie();
  }

  vertodos(index: number): void {
    this.productoService.getProductos(index).subscribe(
      response => {
        this.prod = response.list;
        this.total = response.total;
        this.xpage = response.xpage;
        //console.log("desde compras-----"+this.total);
      }
    );
  }
  loadComprobanteSerie(){
    this.serie="A";
    this.correlativo="0001";
    this.fechaCompra = formatDate(Date.now(), 'yyyy-MM-dd', 'en-US');

  }
  buscarProducto(): void {

    console.log('Buscando:', this.terminoBusqueda);

  }

  buscar(): void {
    if (this.search.length > 0) {
      this.productoService.getProductosBySearch(this.search).subscribe(
        response => {
          
          console.log("response----"+response);
          this.prod = response.list;
          this.total = response.total;
          this.xpage = response.xpage;
        }
      );
    }
    else if (this.codBarra.length > 0) {
      this.productoService.getProductosByCodBarra(this.codBarra).subscribe(
        response => {
          
          this.prod = response.list;
          this.total = response.total;
          this.xpage = response.xpage;
        }
      );
    }
    else if (this.codBarra.length == 0 && this.search.length == 0) {
      this.vertodos(1);
    }


  }

  loadproveedores(): void {
    this.proveedorService.listar(1,100).subscribe(
      response => {
        this.proveedores =Object.values( response.list);
        console.log(this.proveedores);
      }
    );
  }  
 
loadempleados(): void {
    // Simulación de empleados
    this.empleados = [
      { idempleado: 1, persona: { idpersona: 1, nombre: 'Juan', paterno: 'Pérez', materno: 'Gómez' } },
    ];
  }
   
  loadComprobantes(): void {
    
    // Simulación de tipos de comprobante
    this.comprobantes = [
      { idtipocomprobante: 1, nombrecomprobante: 'Factura' },
      { idtipocomprobante: 2, nombrecomprobante: 'Boleta' },
      { idtipocomprobante: 3, nombrecomprobante: 'Tiket' },
      { idtipocomprobante: 4, nombrecomprobante: 'Guia' },
      { idtipocomprobante: 5, nombrecomprobante: 'Nota de venta' },
      { idtipocomprobante: 6, nombrecomprobante: 'Nota de compra' }
    ];
  }

  agregarProducto(producto: Product): void {

    const dialogRef = this.dialog.open(CompraProductoModalComponent, {
      width: '600px',
      data: { producto: producto }
    });

    dialogRef.afterClosed().subscribe(resultado => {
     
      if (resultado) {
        const existingProductIndex = this.prodDetalle.findIndex(
          item => item.idproducto === resultado.idproducto
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
    this.totalCompra = this.prodDetalle.reduce((sum, item) => sum + (item.subTotal || 0), 0);
  }


  finalizarCompra(): void {
    if (this.prodDetalle.length === 0) {
      alert('No hay productos en la compra');
      return;
    }

    console.log('Compra finalizada:', this.prodDetalle);
    alert(`Compra finalizada. Total: ${this.totalCompra}`); // Consider using MatDialog for alerts

    this.cancelarCompra(); // Clear the purchase after finalizing
  }

  agregarProductosACompra() {
    debugger;
    if (!this.selectedProveedor || !this.selectedComprobante || !this.selectedEmpleado || !this.serie || !this.correlativo) {
      this.toastr.warning('Debe completar todos los campos de la compra');
      return;
    }
    this.procesoEnCurso = true;
    this.mensaje = 'Creando la compra...';
    this.error = false;
    try {
      const compraData = {
        serie: this.serie,
        correlativo: this.correlativo,
        proveedor: this.selectedProveedor,
        tipocomprobante: this.selectedComprobante,
        empleado: this.selectedEmpleado,
        fechacompra: this.fechaCompra,
        costocompra: this.totalCompra,
       // productos: this.prodDetalle
      };

      this.comprasService.saveCompra(compraData).subscribe({
        next: (response) => {
          const datosDelCuerpo: any | null = response.body;
          
          console.log("retorno de compras"+datosDelCuerpo);
          if(datosDelCuerpo)
          {
            const idCompra = datosDelCuerpo.idCompra;
            this.RegistrarDetalleCompra(idCompra);
          }
          this.toastr.success('Compra creada exitosamente');
          this.mensaje = `✅ Compra creada exitosamente.`;
          this.prodDetalle = [];
          this.totalCompra = 0;
          this.resetCompraForm();
        },
        error: (err) => {
          this.error = true;
          this.mensaje = `❌ Error: ${err.message}`;
        },
        complete: () => {
          this.procesoEnCurso = false;
        }
      });

    } catch (err: any) {
      this.error = true;
      this.mensaje = `❌ Error: ${err.message}`;
      this.procesoEnCurso = false;
    }
  }
  RegistrarDetalleCompra(idcompra:number)
  {
    
    for (const producto of this.prodDetalle) {
      const detallecompra={
       compra:{idcompra:idcompra},
       producto : { idproducto :producto.idproducto},
       codigodetallecompra:"DC-W"+"-"+Date.now(),
       unidades : producto.cantidadLlevar,
       costounidad : producto.precioventa,
       lote : 0,
       total: producto.subTotal,
       }
       debugger;
       const productoupdate:any={
        idproducto:producto.idproducto,
        codigoproducto:producto.codigoproducto,
        nombre:producto.nombre,
        vencimiento:producto.vencimiento.toString(),
        //vencimiento:moment(producto.vencimiento, 'DD-MM-YYYY').format('YYYY-MM-DD'),
        estado:producto.estado,
        composicion:producto.composicion,
        ubicacion:producto.ubicacion,
        stock:producto.stock + producto.cantidadLlevar,
        precioventa:producto.precioventa,
        precioblister:producto.precioblister,
        preciocaja:producto.preciocaja,
        codbarra:producto.codbarra,
        laboratorio:{idlaboratorio:producto.laboratorio.idlaboratorio,nombrelaboratorio:producto.laboratorio.nombrelaboratorio},
        presentacion:{ idpresentacion:producto.presentacion.idpresentacion, nombrepresentacion:producto.presentacion.nombrepresentacion},
        unidadmedida:{ idunidadmedida:producto.unidadmedida.idunidadmedida, nombreunidad:producto.unidadmedida.nombreunidad},
      }
       //guarda el detalle de compra
       debugger;
       this.DetalleCompraService.Save(detallecompra).subscribe({
        next: (response:any) => {
          console.log('Detalle de compra guardado:', response);
        },
        error: (error:any) => {
          console.error('Error al guardar el detalle de compra:', error);
        }
      });
      //actualiza stock del producto
      debugger
      this.productoService.saveProducto(productoupdate).subscribe({
        next: (response:any) => {
          console.log('Stock actualizado:', response);
        },
        error: (error:any) => {
          console.error('Error al actualizar el stock:', error);
        }
      });
     }    
  }
  cancelarCompra(): void {
    if (this.prodDetalle.length === 0 || confirm('¿Estás seguro de cancelar esta compra?')) {
      this.prodDetalle = [];
      this.totalCompra = 0;
      this.resetCompraForm();
    }
  }

  resetCompraForm(): void {
    this.selectedProveedor = null;
    this.selectedComprobante = null;
    this.selectedEmpleado = null;
    this.serie = '';
    this.correlativo = '';
    this.fechaCompra = new Date();
  }

  // Utility methods
  getProveedorNombre(proveedor: Proveedor): string {
    return proveedor?.nombre || 'Sin proveedor';
  }

  getEmpleadoNombre(empleado: Empleado): string {
    if (empleado?.persona) {
      return `${empleado.persona.nombre} ${empleado.persona.paterno}`;
    }
    return 'Sin empleado';
  }

  getComprobanteNombre(comprobante: TipoComprobante): string {
    return comprobante?.nombrecomprobante || 'Sin comprobante';
  }
}
