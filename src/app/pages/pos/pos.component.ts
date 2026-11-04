import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ProductoService } from '../../services/producto.service';
import { VentasService } from '../../services/ventas.service';
import { DetalleVentaService } from '../../services/detalleventa.service';
import { TicketService } from '../../services/ticket.service';
import { BuscarDniService } from '../../services/buscar-dni.service';
import { PersonasService } from '../../services/personas.service';
import { Product } from '../../models/product';

export interface PosCartItem {
  idproducto: number;
  nombre: string;
  precioUnitario: number;
  tipoPrecio: 'precioventa' | 'precioblister' | 'preciocaja';
  cantidad: number;
  subtotal: number;
  stockDisponible: number;
  productoOriginal: Product;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, VentasService]
})
export class PosComponent implements OnInit, OnDestroy {
  @ViewChild('barcodeInput') barcodeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('montoPagadoInput') montoPagadoInputRef!: ElementRef<HTMLInputElement>;

  // Catálogo & Búsqueda
  productos: Product[] = [];
  totalProductos: number = 0;
  barcode: string = '';
  searchQuery: string = '';
  isLoadingCatalog: boolean = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Ticket / Carrito
  cart: PosCartItem[] = [];
  totalVenta: number = 0;

  // Datos de Pago & Cliente
  clienteTipo: 'GENERAL' | 'DNI' = 'GENERAL';
  clienteDni: string = '';
  clienteNombre: string = 'PÚBLICO GENERAL';
  clienteId: number = 4; // Cliente Anónimo oficial en DB
  buscandoCliente: boolean = false;

  metodoPago: 'EFECTIVO' | 'YAPE' | 'TARJETA' = 'EFECTIVO';
  montoPagado: number | null = null;
  vuelto: number = 0;

  // Estado del proceso
  procesoEnCurso: boolean = false;

  constructor(
    private productoService: ProductoService,
    private ventasService: VentasService,
    private detalleVentaService: DetalleVentaService,
    private ticketService: TicketService,
    private buscarDniService: BuscarDniService,
    private personasService: PersonasService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.cargarCatalogo();
  }

  ngAfterViewInit(): void {
    this.enfocarBuscador();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // --- ATAJOS DE TECLADO ---
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // F2: Enfocar Escáner / Búsqueda
    if (event.key === 'F2') {
      event.preventDefault();
      this.enfocarBuscador();
    }
    // F4: Cancelar / Vaciar Ticket
    if (event.key === 'F4') {
      event.preventDefault();
      this.cancelarVenta();
    }
    // F12: Cobrar e Imprimir
    if (event.key === 'F12') {
      event.preventDefault();
      if (!this.procesoEnCurso && this.cart.length > 0) {
        this.cobrarVenta();
      }
    }
  }

  enfocarBuscador(): void {
    setTimeout(() => {
      if (this.barcodeInputRef?.nativeElement) {
        this.barcodeInputRef.nativeElement.focus();
        this.barcodeInputRef.nativeElement.select();
      }
    }, 100);
  }

  private setupSearch(): void {
    this.searchSub = this.searchSubject.pipe(
      debounceTime(250)
    ).subscribe((query) => {
      this.buscarPorNombre(query);
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  cargarCatalogo(page: number = 1): void {
    this.isLoadingCatalog = true;
    this.productoService.getProductos(page).subscribe({
      next: (res) => {
        this.productos = res.list || [];
        this.totalProductos = res.total || 0;
        this.isLoadingCatalog = false;
      },
      error: () => {
        this.isLoadingCatalog = false;
      }
    });
  }

  buscarPorNombre(query: string): void {
    const q = query.trim();
    if (!q) {
      this.cargarCatalogo(1);
      return;
    }
    this.isLoadingCatalog = true;
    this.productoService.getProductosBySearch(q).subscribe({
      next: (res) => {
        this.productos = res.list || [];
        this.totalProductos = res.total || 0;
        this.isLoadingCatalog = false;
      },
      error: () => {
        this.isLoadingCatalog = false;
      }
    });
  }

  // --- ESCANEO RÁPIDO DE CÓDIGO DE BARRAS ---
  onBarcodeScan(): void {
    const code = this.barcode.trim();
    if (!code) return;

    // Buscar en la lista ya cargada primero para respuesta instantánea (0ms)
    const localProduct = this.productos.find(p => p.codbarra === code);
    if (localProduct) {
      this.agregarProductoAlTicket(localProduct);
      this.barcode = '';
      return;
    }

    // Si no está en memoria, consultar al backend
    this.productoService.getProductosByCodBarra(code).subscribe({
      next: (res) => {
        const product = res.list && res.list.length > 0 ? res.list[0] : null;
        if (product) {
          this.agregarProductoAlTicket(product);
          this.barcode = '';
        } else {
          this.toastr.warning(`Código [${code}] no encontrado.`);
          this.barcode = '';
        }
      },
      error: () => {
        this.toastr.error('Error al consultar código de barra.');
        this.barcode = '';
      }
    });
  }

  // --- GESTIÓN DEL TICKET / CARRITO ---
  agregarProductoAlTicket(producto: Product, tipoPrecio: 'precioventa' | 'precioblister' | 'preciocaja' = 'precioventa'): void {
    const stockActual = producto.stock || 0;
    if (stockActual <= 0) {
      this.toastr.warning(`El producto ${producto.nombre} no tiene stock disponible.`);
      return;
    }

    // Determinar precio según el tipo
    let precio = producto.precioventa || 0;
    if (tipoPrecio === 'precioblister' && producto.precioblister) precio = producto.precioblister;
    if (tipoPrecio === 'preciocaja' && producto.preciocaja) precio = producto.preciocaja;

    // Verificar si ya está en el ticket con el mismo tipo de precio
    const index = this.cart.findIndex(i => i.idproducto === producto.idproducto && i.tipoPrecio === tipoPrecio);

    if (index > -1) {
      const item = this.cart[index];
      if (item.cantidad + 1 > stockActual) {
        this.toastr.warning(`Stock máximo alcanzado para ${producto.nombre} (${stockActual} disponibles).`);
        return;
      }
      item.cantidad += 1;
      item.subtotal = item.cantidad * item.precioUnitario;
    } else {
      this.cart.unshift({
        idproducto: producto.idproducto,
        nombre: producto.nombre,
        precioUnitario: precio,
        tipoPrecio: tipoPrecio,
        cantidad: 1,
        subtotal: precio,
        stockDisponible: stockActual,
        productoOriginal: producto
      });
    }

    this.calcularTotales();
    this.toastr.success(`+1 ${producto.nombre}`, '', { timeOut: 1200, positionClass: 'toast-bottom-left' });
  }

  incrementarCantidad(item: PosCartItem): void {
    if (item.cantidad + 1 > item.stockDisponible) {
      this.toastr.warning(`Stock máximo disponible: ${item.stockDisponible}`);
      return;
    }
    item.cantidad += 1;
    item.subtotal = item.cantidad * item.precioUnitario;
    this.calcularTotales();
  }

  decrementarCantidad(item: PosCartItem): void {
    if (item.cantidad > 1) {
      item.cantidad -= 1;
      item.subtotal = item.cantidad * item.precioUnitario;
      this.calcularTotales();
    } else {
      this.eliminarDelTicket(item);
    }
  }

  actualizarCantidadManual(item: PosCartItem, valorStr: string): void {
    const val = parseInt(valorStr, 10);
    if (isNaN(val) || val <= 0) {
      item.cantidad = 1;
    } else if (val > item.stockDisponible) {
      this.toastr.warning(`Supera el stock disponible (${item.stockDisponible})`);
      item.cantidad = item.stockDisponible;
    } else {
      item.cantidad = val;
    }
    item.subtotal = item.cantidad * item.precioUnitario;
    this.calcularTotales();
  }

  eliminarDelTicket(item: PosCartItem): void {
    const idx = this.cart.indexOf(item);
    if (idx > -1) {
      this.cart.splice(idx, 1);
      this.calcularTotales();
    }
  }

  calcularTotales(): void {
    this.totalVenta = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    this.calcularVuelto();
  }

  // --- CÁLCULO DE VUELTO & MEDIOS DE PAGO ---
  setMetodoPago(metodo: 'EFECTIVO' | 'YAPE' | 'TARJETA'): void {
    this.metodoPago = metodo;
    if (metodo !== 'EFECTIVO') {
      this.montoPagado = this.totalVenta;
      this.vuelto = 0;
    } else {
      this.montoPagado = null;
      this.vuelto = 0;
    }
  }

  setMontoRapido(monto: number): void {
    this.montoPagado = monto;
    this.calcularVuelto();
  }

  calcularVuelto(): void {
    if (this.metodoPago === 'EFECTIVO' && this.montoPagado !== null && this.montoPagado >= this.totalVenta) {
      this.vuelto = Number((this.montoPagado - this.totalVenta).toFixed(2));
    } else {
      this.vuelto = 0;
    }
  }

  // --- GESTIÓN DE CLIENTE ---
  setClienteGeneral(): void {
    this.clienteTipo = 'GENERAL';
    this.clienteId = 4;
    this.clienteNombre = 'PÚBLICO GENERAL';
    this.clienteDni = '';
  }

  buscarDniCliente(): void {
    const dni = this.clienteDni.trim();
    if (dni.length !== 8) {
      this.toastr.warning('Ingrese un DNI válido de 8 dígitos');
      return;
    }

    this.buscandoCliente = true;
    this.buscarDniService.BuscarDni(dni).subscribe({
      next: (data: any) => {
        this.buscandoCliente = false;
        if (data && data.nombres) {
          this.clienteNombre = `${data.nombres} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
          this.toastr.success(`Cliente: ${this.clienteNombre}`);
        } else {
          this.toastr.warning('DNI no encontrado en RENIEC. Se usará como nuevo.');
          this.clienteNombre = `Cliente DNI ${dni}`;
        }
      },
      error: () => {
        this.buscandoCliente = false;
        this.clienteNombre = `Cliente DNI ${dni}`;
      }
    });
  }

  // --- COBRO E IMPRESIÓN DIRECTA DE TICKET ---
  cobrarVenta(): void {
    if (this.cart.length === 0) {
      this.toastr.warning('El ticket está vacío. Agregue productos para cobrar.');
      return;
    }

    if (this.metodoPago === 'EFECTIVO' && this.montoPagado !== null && this.montoPagado < this.totalVenta) {
      this.toastr.warning('El monto pagado es menor al total de la venta.');
      return;
    }

    this.procesoEnCurso = true;

    // 1. Obtener correlativo secuencial
    this.ventasService.List(1, 1).subscribe({
      next: (res) => {
        const count = res.total || (res.list ? res.list.length : 0);
        const correlativoStr = String(count + 1).padStart(6, '0');
        const serieStr = 'TK01';

        const ventaPayload: any = {
          serie: serieStr,
          correlativo: correlativoStr,
          fechaventa: new Date().toISOString().split('T')[0],
          costoventa: Number(this.totalVenta.toFixed(2)),
          cliente: { idcliente: this.clienteId },
          empleado: { idempleado: 1 },
          tipocomprobante: { idtipocomprobante: 3 } // Ticket
        };

        // 2. Guardar cabecera de la venta
        this.ventasService.saveVenta(ventaPayload).subscribe({
          next: (saveRes) => {
            const body: any = saveRes.body;
            const idVentaGenerado = body?.idVenta || body?.idventa;

            if (!idVentaGenerado) {
              this.procesoEnCurso = false;
              this.toastr.error('No se recibió ID de venta del servidor.');
              return;
            }

            // 3. Ejecutar detalles y actualización de stock con forkJoin
            this.guardarDetallesYDescontarStock(idVentaGenerado, ventaPayload);
          },
          error: (err) => {
            this.procesoEnCurso = false;
            console.error('Error al guardar venta:', err);
            this.toastr.error('Error al registrar la venta en el servidor.');
          }
        });
      },
      error: (err) => {
        this.procesoEnCurso = false;
        console.error('Error al obtener lista de ventas:', err);
        this.toastr.error('Error al consultar correlativo.');
      }
    });
  }

  private guardarDetallesYDescontarStock(idVenta: number, ventaData: any): void {
    const operaciones = [];
    const detallesParaTicket: any[] = [];

    for (const item of this.cart) {
      const prodOriginal = item.productoOriginal;

      // Objeto Detalle de Venta
      const detalleVenta = {
        venta: { idventa: idVenta },
        producto: { idproducto: item.idproducto },
        codigodetalleventa: `DV-POS-${Date.now()}-${item.idproducto}`,
        unidades: item.cantidad,
        costounidad: item.precioUnitario,
        total: item.subtotal
      };
      operaciones.push(this.detalleVentaService.Save(detalleVenta));

      // Guardar para impresión
      detallesParaTicket.push({
        idproducto: item.idproducto,
        nombre: item.nombre,
        cantidadLlevar: item.cantidad,
        precioventa: item.precioUnitario,
        subTotal: item.subtotal
      });

      // Actualizar Stock
      const nuevoStock = Math.max(0, (prodOriginal.stock || 0) - item.cantidad);
      const productoupdate: any = {
        idproducto: prodOriginal.idproducto,
        codigoproducto: prodOriginal.codigoproducto,
        nombre: prodOriginal.nombre,
        vencimiento: prodOriginal.vencimiento || '2030-01-01',
        estado: prodOriginal.estado,
        composicion: prodOriginal.composicion,
        ubicacion: prodOriginal.ubicacion,
        stock: nuevoStock,
        precioventa: prodOriginal.precioventa,
        precioblister: prodOriginal.precioblister,
        preciocaja: prodOriginal.preciocaja,
        codbarra: prodOriginal.codbarra,
        imagen_path: prodOriginal.imagen_path || '',
        idlaboratorio: prodOriginal.laboratorio?.idlaboratorio,
        idpresentacion: prodOriginal.presentacion?.idpresentacion,
        idunidadmedida: prodOriginal.unidadmedida?.idunidadmedida,
        laboratorio: prodOriginal.laboratorio,
        presentacion: prodOriginal.presentacion,
        unidadmedida: prodOriginal.unidadmedida
      };

      const formData = new FormData();
      const productoBlob = new Blob([JSON.stringify(productoupdate)], { type: 'application/json' });
      formData.append('producto', productoBlob);

      operaciones.push(this.productoService.saveProducto(formData));
    }

    // Ejecutar todas las operaciones de forma atómica
    forkJoin(operaciones).subscribe({
      next: () => {
        // 4. Imprimir Ticket Directamente en Iframe Oculto (1 Clic)
        try {
          const ticketHTML = this.ticketService.createTicketHTML(
            ventaData,
            detallesParaTicket,
            this.clienteNombre,
            'TICKET DE VENTA'
          );
          this.ticketService.printDirect(ticketHTML);
        } catch (e) {
          console.warn('Error al imprimir ticket:', e);
        }

        this.toastr.success(`¡Venta #${idVenta} completada con éxito!`);
        this.resetTicketCompleto();
        this.procesoEnCurso = false;
        this.cargarCatalogo(); // Refrescar stock en pantalla
        this.enfocarBuscador();
      },
      error: (err) => {
        console.error('Error al guardar detalles de venta o stock:', err);
        this.toastr.warning('La venta se registró pero hubo una observación al actualizar inventario.');
        this.resetTicketCompleto();
        this.procesoEnCurso = false;
        this.cargarCatalogo();
        this.enfocarBuscador();
      }
    });
  }

  cancelarVenta(): void {
    if (this.cart.length === 0) return;
    if (confirm('¿Desea limpiar el ticket actual?')) {
      this.resetTicketCompleto();
      this.toastr.info('Ticket cancelado.');
      this.enfocarBuscador();
    }
  }

  private resetTicketCompleto(): void {
    this.cart = [];
    this.totalVenta = 0;
    this.montoPagado = null;
    this.vuelto = 0;
    this.setClienteGeneral();
    this.metodoPago = 'EFECTIVO';
  }
}
