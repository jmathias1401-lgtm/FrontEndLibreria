import { Component, LOCALE_ID, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ProductoService } from '../../services/producto.service';
import { ComprasService } from '../../services/compras.service';
import { ProveedorService } from '../../services/proveedor.service';
import { EmpleadoService } from '../../services/empleado.service';
import { DetalleCompraService } from '../../services/detallecompra.service';
import { PaginateComponent } from '../../shared/paginate/paginate.component';

import { Product } from '../../models/product';
import { Proveedor } from '../../models/proveedor';
import { Empleado } from '../../models/empleado';
import { TipoComprobante } from '../../models/tipocomprobante';
import { CompraProductoModalComponent } from '../modal/compra-producto-modal/compra-producto-modal.component';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PaginateComponent],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
  providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, ComprasService]
})
export class ComprasComponent implements OnInit, OnDestroy {
  // Productos & Paginación
  prod: any[] = [];
  total: number = 0;
  xpage: number = 10;
  currentPage: number = 1;
  search: string = '';
  codBarra: string = '';

  // Carrito / Detalle de compra
  totalCompra: number = 0;
  prodDetalle: any[] = [];

  // Estado del proceso
  procesoEnCurso = false;
  mensaje: string | null = null;
  error = false;

  // Catálogos
  proveedores: any[] = [];
  empleados: any[] = [];
  comprobantes: TipoComprobante[] = [];
  selectedProveedor: Proveedor | null = null;
  selectedEmpleado: Empleado | null = null;
  selectedComprobante: TipoComprobante | null = null;
  serie: string = '';
  correlativo: string = '';
  fechaCompra: string = '';

  // Búsqueda con debounce
  private searchSubject = new Subject<void>();
  private searchSubscription?: Subscription;

  constructor(
    private productoService: ProductoService,
    private comprasService: ComprasService,
    private proveedorService: ProveedorService,
    private empleadoService: EmpleadoService,
    private detalleCompraService: DetalleCompraService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setupDebouncedSearch();
    this.vertodos(1);
    this.loadproveedores();
    this.loadempleados();
    this.loadComprobantes();
    this.loadComprobanteSerie();
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
      error: (err) => console.error('Error al listar productos:', err)
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

  loadComprobanteSerie(): void {
    this.serie = 'F001';
    this.correlativo = '000001';
    this.fechaCompra = formatDate(Date.now(), 'yyyy-MM-dd', 'en-US');
  }

  loadproveedores(): void {
    this.proveedorService.listar(1, 100).subscribe({
      next: (response) => {
        this.proveedores = response.list || [];
        if (this.proveedores.length > 0 && !this.selectedProveedor) {
          this.selectedProveedor = this.proveedores[0];
        }
      },
      error: (err) => console.error('Error al listar proveedores:', err)
    });
  }

  loadempleados(): void {
    this.empleadoService.listar(1, 100).subscribe({
      next: (response) => {
        this.empleados = response.list || [];
        if (this.empleados.length > 0 && !this.selectedEmpleado) {
          this.selectedEmpleado = this.empleados[0];
        }
      },
      error: (err) => {
        console.warn('Error al cargar empleados desde servicio, usando respaldo:', err);
        this.empleados = [
          { idempleado: 1, persona: { idpersona: 1, nombre: 'JORGE', paterno: 'JORGE', materno: '' } }
        ];
        this.selectedEmpleado = this.empleados[0];
      }
    });
  }

  loadComprobantes(): void {
    this.comprobantes = [
      { idtipocomprobante: 1, nombrecomprobante: 'Factura' },
      { idtipocomprobante: 2, nombrecomprobante: 'Boleta' },
      { idtipocomprobante: 3, nombrecomprobante: 'Tiket' },
      { idtipocomprobante: 4, nombrecomprobante: 'Guia' },
      { idtipocomprobante: 5, nombrecomprobante: 'Nota de venta' },
      { idtipocomprobante: 6, nombrecomprobante: 'Nota de compra' }
    ];
    if (this.comprobantes.length > 0 && !this.selectedComprobante) {
      this.selectedComprobante = this.comprobantes[0];
    }
  }

  agregarProducto(producto: Product): void {
    const dialogRef = this.dialog.open(CompraProductoModalComponent, {
      width: '600px',
      data: { producto: producto }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        const existingProductIndex = this.prodDetalle.findIndex(
          (item) => item.idproducto === resultado.idproducto
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
      this.calcularTotalGeneral();
    }
  }

  calcularTotalGeneral(): void {
    this.totalCompra = this.prodDetalle.reduce((sum, item) => sum + (item.subTotal || 0), 0);
  }

  agregarProductosACompra(): void {
    if (this.prodDetalle.length === 0) {
      this.toastr.warning('Debe agregar al menos un producto a la compra');
      return;
    }

    if (!this.selectedProveedor || !this.selectedComprobante || !this.selectedEmpleado || !this.serie || !this.correlativo) {
      this.toastr.warning('Debe completar todos los datos de la compra (Proveedor, Comprobante, Empleado, Serie y Correlativo)');
      return;
    }

    this.procesoEnCurso = true;
    this.mensaje = 'Registrando compra y actualizando inventario...';
    this.error = false;

    const compraData = {
      serie: this.serie,
      correlativo: this.correlativo,
      proveedor: this.selectedProveedor,
      tipocomprobante: this.selectedComprobante,
      empleado: this.selectedEmpleado,
      fechacompra: this.fechaCompra,
      costocompra: this.totalCompra
    };

    this.comprasService.saveCompra(compraData).subscribe({
      next: (response) => {
        const datosDelCuerpo: any = response.body;
        const idCompra = datosDelCuerpo?.idCompra || datosDelCuerpo?.idcompra;

        if (idCompra) {
          this.registrarDetallesYActualizarStock(idCompra);
        } else {
          this.procesoEnCurso = false;
          this.toastr.error('Error: No se recibió confirmación del identificador de compra.');
        }
      },
      error: (err) => {
        this.procesoEnCurso = false;
        this.error = true;
        this.mensaje = `❌ Error al crear compra: ${err.message || 'Error del servidor'}`;
        this.toastr.error('Error al registrar la compra');
      }
    });
  }

  private registrarDetallesYActualizarStock(idcompra: number): void {
    const operations = [];

    for (const producto of this.prodDetalle) {
      const detallecompra = {
        compra: { idcompra: idcompra },
        producto: { idproducto: producto.idproducto },
        codigodetalleventa: 'DC-W-' + Date.now() + '-' + producto.idproducto,
        codigodetallecompra: 'DC-W-' + Date.now() + '-' + producto.idproducto,
        unidades: producto.cantidadLlevar,
        costounidad: producto.preciocompra || producto.precioventa,
        lote: producto.lote || '0',
        total: producto.subTotal
      };

      // Guardar detalle de compra
      operations.push(this.detalleCompraService.Save(detallecompra));

      // Preparar actualización de stock
      let vencimientoFormatted = '2030-01-01';
      if (producto.vencimiento) {
        const vStr = String(producto.vencimiento);
        if (vStr.includes('/')) {
          const parts = vStr.split('/');
          vencimientoFormatted = parts[2] + '-' + parts[1] + '-' + parts[0];
        } else {
          vencimientoFormatted = vStr;
        }
      }

      const productoupdate: any = {
        idproducto: producto.idproducto,
        codigoproducto: producto.codigoproducto,
        nombre: producto.nombre,
        vencimiento: vencimientoFormatted,
        estado: producto.estado,
        composicion: producto.composicion,
        ubicacion: producto.ubicacion,
        stock: (producto.stock || 0) + producto.cantidadLlevar,
        precioventa: producto.precioventa,
        precioblister: producto.precioblister,
        preciocaja: producto.preciocaja,
        codbarra: producto.codbarra,
        imagen_path: producto.imagen_path || '',
        idlaboratorio: producto.laboratorio?.idlaboratorio || producto.idlaboratorio,
        idpresentacion: producto.presentacion?.idpresentacion || producto.idpresentacion,
        idunidadmedida: producto.unidadmedida?.idunidadmedida || producto.idunidadmedida,
        laboratorio: producto.laboratorio,
        presentacion: producto.presentacion,
        unidadmedida: producto.unidadmedida
      };

      const formData = new FormData();
      const productoBlob = new Blob([JSON.stringify(productoupdate)], { type: 'application/json' });
      formData.append('producto', productoBlob);

      operations.push(this.productoService.saveProducto(formData));
    }

    // Ejecutar todas las operaciones de forma coordinada
    forkJoin(operations).subscribe({
      next: () => {
        this.procesoEnCurso = false;
        this.toastr.success('¡Compra e inventario registrados exitosamente!');
        this.mensaje = '✅ Compra e inventario registrados exitosamente.';
        this.prodDetalle = [];
        this.totalCompra = 0;
        this.resetCompraForm();
        this.vertodos(this.currentPage); // Recargar productos para ver el stock actualizado inmediatamente
      },
      error: (error) => {
        console.error('Error al guardar detalles de compra o actualizar stock:', error);
        this.procesoEnCurso = false;
        this.error = true;
        this.mensaje = '⚠️ La compra se creó, pero ocurrió un problema al registrar algunos detalles o stock.';
        this.toastr.warning('La compra se creó, pero verifique el inventario.');
        this.vertodos(this.currentPage);
      }
    });
  }

  cancelarCompra(): void {
    if (this.prodDetalle.length === 0 || confirm('¿Estás seguro de cancelar esta compra?')) {
      this.prodDetalle = [];
      this.totalCompra = 0;
      this.resetCompraForm();
      this.mensaje = null;
    }
  }

  resetCompraForm(): void {
    if (this.proveedores.length > 0) this.selectedProveedor = this.proveedores[0];
    if (this.comprobantes.length > 0) this.selectedComprobante = this.comprobantes[0];
    if (this.empleados.length > 0) this.selectedEmpleado = this.empleados[0];
    this.loadComprobanteSerie();
  }

  getProveedorNombre(proveedor: Proveedor | any): string {
    if (!proveedor) return 'Seleccionar proveedor';
    const persona = proveedor.persona;
    if (persona) {
      const nombre = `${persona.nombre || ''} ${persona.paterno || ''}`.trim();
      const ruc = persona.ruc ? ` (RUC: ${persona.ruc})` : '';
      return `${nombre}${ruc}`;
    }
    return proveedor.nombre || `Proveedor #${proveedor.idproveedor}`;
  }

  getEmpleadoNombre(empleado: Empleado | any): string {
    if (!empleado) return 'Seleccionar empleado';
    const persona = empleado.persona;
    if (persona) {
      return `${persona.nombre || ''} ${persona.paterno || ''}`.trim();
    }
    return `Empleado #${empleado.idempleado}`;
  }
}
