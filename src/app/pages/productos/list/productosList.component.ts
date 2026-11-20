import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { PaginateComponent } from '../../../shared/paginate/paginate.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { Producto } from '../../../models/producto';
import { DatosService } from '../../../services/datos.service';
import { ProductoService } from '../../../services/producto.service';
import { FiltroPipe } from "../../../shared/pipes/filtro.pipe";
import { CartService } from '../../../services/cart.service';
import { ToastrService } from 'ngx-toastr';
import { InventarioService, ResumenValorizado, MovimientoKardex, VentaTrazabilidadDto } from '../../../services/inventario.service';
import { StockNotificationService } from '../../../services/stock-notification.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-productos',
  standalone: true,
  templateUrl: './productosList.component.html',
  styleUrl: './productosList.component.css',
  imports: [PaginateComponent, CommonModule, FormsModule, DialogModule, RouterModule, FiltroPipe],
})
export class ProductosListComponent implements OnInit {
  @Output() borrado: EventEmitter<number> = new EventEmitter();

  prod: any[] = [];
  total: number = 0;
  xpage: number = 0;
  current: number = 0;
  pages: any[] = [];
  index: number = 0;
  search: string = "";
  codBarra: string = "";
  modalEditar: boolean = false;
  soloStockBajo: boolean = false;
  public pagesNumber: number = 1;
  public nextCount: number = 1;

  // --- MODO DE VISUALIZACIÓN ---
  modoVista: 'CATALOGO' | 'VALORIZADO' = 'CATALOGO';
  resumenValorizado: ResumenValorizado | null = null;
  cargandoValorizado: boolean = false;
  todosLosProductos: any[] = [];

  // --- MODAL DE AJUSTE RÁPIDO DE INVENTARIO ---
  mostrarModalAjuste: boolean = false;
  productoAjuste: any = null;
  tipoAjuste: 'CONTEO' | 'ENTRADA' | 'SALIDA' = 'CONTEO';
  cantidadAjuste: number = 0;
  motivoAjuste: string = 'Conteo físico de inventario';
  nuevoStockAjuste: number = 0;
  guardandoAjuste: boolean = false;

  // --- MODAL DE KARDEX / HISTORIAL ---
  mostrarModalKardex: boolean = false;
  productoKardex: any = null;
  movimientosKardex: MovimientoKardex[] = [];
  cargandoKardex: boolean = false;

  // --- TRAZABILIDAD DE VENTAS ---
  pestanaModalKardex: 'KARDEX' | 'VENTAS' = 'KARDEX';
  ventasTrazabilidad: VentaTrazabilidadDto[] = [];
  cargandoTrazabilidad: boolean = false;
  totalUnidadesVendidas: number = 0;
  totalMontoVendido: number = 0;

  constructor(
    private productoService: ProductoService,
    private Datosservice: DatosService,
    private cartService: CartService,
    private toastr: ToastrService,
    private inventarioService: InventarioService,
    private stockNotificationService: StockNotificationService
  ) { }

  ngOnInit(): void {
    this.vertodos(1);
    this.pages = this.generatePageRange(1, 30);
  }

  onindexClic(index: number) {
    this.vertodos(index);
  }

  vertodos(index: number): void {
    this.soloStockBajo = false;
    this.modoVista = 'CATALOGO';
    this.productoService.getProductos(index).subscribe(response => {
      this.prod = response.list;
      this.total = response.total;
      this.xpage = response.xpage;
    });
  }

  // --- GESTIÓN DE MODOS (CATÁLOGO / VALORIZADO) ---
  activarModoCatalogo(): void {
    this.modoVista = 'CATALOGO';
    this.vertodos(1);
  }

  activarModoValorizado(): void {
    this.modoVista = 'VALORIZADO';
    this.cargandoValorizado = true;
    this.soloStockBajo = false;

    this.productoService.getAllProductos(1, 2500).subscribe({
      next: (response) => {
        this.todosLosProductos = response.list || [];
        this.prod = this.todosLosProductos;
        this.total = this.todosLosProductos.length;
        this.resumenValorizado = this.inventarioService.calcularValorizado(this.todosLosProductos);
        this.cargandoValorizado = false;
        this.toastr.info(`Inventario valorizado calculado para ${this.total} productos.`);
      },
      error: (err) => {
        console.error('Error calculando inventario valorizado:', err);
        this.cargandoValorizado = false;
        this.toastr.error('No se pudo cargar el inventario valorizado');
      }
    });
  }

  filtrarStockBajo(): void {
    this.soloStockBajo = !this.soloStockBajo;
    if (this.soloStockBajo) {
      this.productoService.getAllProductos(1, 1000).subscribe(response => {
        const list = response?.list || [];
        this.prod = list.filter((p: any) => p.stock !== null && p.stock !== undefined && Number(p.stock) <= 5)
          .sort((a: any, b: any) => Number(a.stock) - Number(b.stock));
        this.total = this.prod.length;
        this.toastr.info(`Mostrando ${this.prod.length} producto(s) con stock crítico (≤ 5)`);
      });
    } else {
      this.vertodos(1);
    }
  }

  // --- MODAL DE AJUSTE DE INVENTARIO ---
  abrirModalAjuste(producto: any): void {
    this.productoAjuste = { ...producto };
    this.tipoAjuste = 'CONTEO';
    this.cantidadAjuste = Number(producto.stock) || 0;
    this.motivoAjuste = 'Conteo físico de estante';
    this.nuevoStockAjuste = Number(producto.stock) || 0;
    this.mostrarModalAjuste = true;
  }

  cerrarModalAjuste(): void {
    this.mostrarModalAjuste = false;
    this.productoAjuste = null;
    this.guardandoAjuste = false;
  }

  onCambioTipoAjuste(tipo: 'CONTEO' | 'ENTRADA' | 'SALIDA'): void {
    this.tipoAjuste = tipo;
    if (tipo === 'CONTEO') {
      this.motivoAjuste = 'Conteo físico de inventario';
      this.cantidadAjuste = Number(this.productoAjuste.stock) || 0;
    } else if (tipo === 'ENTRADA') {
      this.motivoAjuste = 'Devolución / Ingreso no registrado';
      this.cantidadAjuste = 1;
    } else {
      this.motivoAjuste = 'Merma / Producto dañado o deteriorado';
      this.cantidadAjuste = 1;
    }
    this.recalcularNuevoStock();
  }

  recalcularNuevoStock(): void {
    const stockActual = Number(this.productoAjuste?.stock) || 0;
    const cant = Math.max(0, Number(this.cantidadAjuste) || 0);

    if (this.tipoAjuste === 'CONTEO') {
      this.nuevoStockAjuste = cant;
    } else if (this.tipoAjuste === 'ENTRADA') {
      this.nuevoStockAjuste = stockActual + cant;
    } else if (this.tipoAjuste === 'SALIDA') {
      this.nuevoStockAjuste = Math.max(0, stockActual - cant);
    }
  }

  guardarAjusteStock(): void {
    if (!this.productoAjuste) return;
    this.guardandoAjuste = true;

    const stockActual = Number(this.productoAjuste.stock) || 0;
    const nuevoStock = this.nuevoStockAjuste;
    const vencimientoFormatted = this.productoAjuste.vencimiento ? String(this.productoAjuste.vencimiento) : '2030-01-01';

    const productoUpdate: any = {
      idproducto: this.productoAjuste.idproducto,
      codigoproducto: this.productoAjuste.codigoproducto,
      nombre: this.productoAjuste.nombre,
      vencimiento: vencimientoFormatted,
      estado: this.productoAjuste.estado || 'Activo',
      composicion: this.productoAjuste.composicion || '',
      ubicacion: this.productoAjuste.ubicacion || '',
      stock: nuevoStock,
      precioventa: this.productoAjuste.precioventa,
      precioblister: this.productoAjuste.precioblister,
      preciocaja: this.productoAjuste.preciocaja,
      codbarra: this.productoAjuste.codbarra,
      presentacion: this.productoAjuste.presentacion,
      unidadmedida: this.productoAjuste.unidadmedida,
      laboratorio: this.productoAjuste.laboratorio
    };

    const formData = new FormData();
    const productoBlob = new Blob([JSON.stringify(productoUpdate)], { type: 'application/json' });
    formData.append('producto', productoBlob);

    this.productoService.saveProducto(formData).subscribe({
      next: () => {
        // Registrar en la tabla kardex en MySQL en tiempo real
        this.inventarioService.registrarAjusteEnBD({
          idProducto: this.productoAjuste.idproducto,
          tipoOperacion: this.tipoAjuste,
          motivo: this.motivoAjuste,
          cantidad: Math.abs(nuevoStock - stockActual),
          stockAnterior: stockActual,
          stockNuevo: nuevoStock
        }).subscribe({
          next: () => {
            console.log('Movimiento de Kardex guardado en MySQL con éxito');
          },
          error: (errK) => {
            console.error('Error registrando Kardex en MySQL:', errK);
          }
        });

        // Actualizar en memoria local
        const prodEnLista = this.prod.find(p => p.idproducto === this.productoAjuste.idproducto);
        if (prodEnLista) {
          prodEnLista.stock = nuevoStock;
        }

        // Si estamos en modo valorizado, recalcular
        if (this.modoVista === 'VALORIZADO' && this.todosLosProductos.length > 0) {
          const itemVal = this.todosLosProductos.find(p => p.idproducto === this.productoAjuste.idproducto);
          if (itemVal) itemVal.stock = nuevoStock;
          this.resumenValorizado = this.inventarioService.calcularValorizado(this.todosLosProductos);
        }

        this.toastr.success(`Stock actualizado a ${nuevoStock} und. (${this.motivoAjuste})`);
        this.stockNotificationService.checkStock(false);
        this.cerrarModalAjuste();
      },
      error: (err) => {
        console.error('Error al actualizar stock:', err);
        this.toastr.error('Ocurrió un error al guardar el ajuste de stock.');
        this.guardandoAjuste = false;
      }
    });
  }

  // --- MODAL DE KARDEX & TRAZABILIDAD ---
  abrirModalKardex(producto: any, pestana: 'KARDEX' | 'VENTAS' = 'KARDEX'): void {
    this.productoKardex = producto;
    this.pestanaModalKardex = pestana;
    this.mostrarModalKardex = true;
    this.cargandoKardex = true;
    this.cargandoTrazabilidad = true;
    this.movimientosKardex = [];
    this.ventasTrazabilidad = [];
    this.totalUnidadesVendidas = 0;
    this.totalMontoVendido = 0;

    // Cargar Kardex
    this.inventarioService.obtenerKardexProducto(producto).subscribe({
      next: (movs) => {
        this.movimientosKardex = movs;
        this.cargandoKardex = false;
      },
      error: (err) => {
        console.error('Error obteniendo Kardex:', err);
        this.cargandoKardex = false;
      }
    });

    // Cargar Trazabilidad de Ventas reales desde base de datos
    this.inventarioService.obtenerTrazabilidadVentas(producto.idproducto).subscribe({
      next: (ventas) => {
        this.ventasTrazabilidad = ventas || [];
        this.totalUnidadesVendidas = this.ventasTrazabilidad.reduce((acc, v) => acc + (v.unidades || 0), 0);
        this.totalMontoVendido = this.ventasTrazabilidad.reduce((acc, v) => acc + (v.total || 0), 0);
        this.cargandoTrazabilidad = false;
      },
      error: (err) => {
        console.error('Error obteniendo trazabilidad de ventas:', err);
        this.cargandoTrazabilidad = false;
      }
    });
  }

  cambiarPestanaModalKardex(pestana: 'KARDEX' | 'VENTAS'): void {
    this.pestanaModalKardex = pestana;
  }

  cerrarModalKardex(): void {
    this.mostrarModalKardex = false;
    this.productoKardex = null;
    this.movimientosKardex = [];
    this.ventasTrazabilidad = [];
    this.totalUnidadesVendidas = 0;
    this.totalMontoVendido = 0;
  }

  // --- ACCIONES GENERALES ---
  modificarProducto(productIndex: number) {
    this.Datosservice.disparadorProducto.emit({
      data: productIndex
    });
  }

  eliminarProducto(index: number) {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      this.productoService.deleteProducto(index).subscribe(() => {
        this.borrado.emit(index);
        this.vertodos(1);
        this.toastr.success('Producto eliminado correctamente');
      });
    }
  }

  addToCart(product: any): void {
    this.cartService.addToCart(product);
    this.toastr.success(`${product.nombre} agregado al carrito`);
  }

  generatePageRange(star: number, end: number) {
    let pages_ = [];
    const visiblePages = end - star;
    const totalPages = Math.ceil(this.total / this.xpage);
    const middlePage = Math.ceil(visiblePages / 2);
    let startPage = this.current - middlePage + 1;
    let endPage = this.current + middlePage - 1;
    if (startPage <= 0) {
      startPage = star;
      endPage = Math.min(end, totalPages);
    } else if (endPage >= totalPages) {
      startPage = 1;
      endPage = 30;
    }
    for (let i = startPage; i <= endPage; i++) {
      pages_.push(i);
    }
    return pages_;
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
    } else {
      this.vertodos(1);
    }
  }

  // --- EXPORTACIÓN A EXCEL CON VALORIZACIÓN ---
  exportToExcel(): void {
    this.productoService.getAllProductos(1, this.total > 0 ? this.total : 1000).subscribe(response => {
      const dataToExport = response.list.map(producto => {
        const stock = Number(producto.stock) || 0;
        const pVenta = Number(producto.precioventa) || 0;
        const pCosto = producto.costoCompra ? Number(producto.costoCompra) : (pVenta * 0.7);
        const totalInvertido = stock * pCosto;
        const totalVenta = stock * pVenta;

        return {
          'ID': producto.idproducto,
          'Código': producto.codigoproducto || '',
          'Nombre': producto.nombre,
          'Laboratorio / Marca': producto.laboratorio?.nombrelaboratorio || '',
          'Presentación': producto.presentacion?.nombrepresentacion || '',
          'Unidad': producto.unidadmedida?.nombreunidad || '',
          'Ubicación': producto.ubicacion || '',
          'Stock Físico': stock,
          'Costo Unit. (S/)': pCosto.toFixed(2),
          'Precio Venta (S/)': pVenta.toFixed(2),
          'Total Invertido (S/)': totalInvertido.toFixed(2),
          'Total Venta Estimado (S/)': totalVenta.toFixed(2),
          'Margen Ganancia (S/)': (totalVenta - totalInvertido).toFixed(2),
          'Estado': producto.estado || 'Activo'
        };
      });

      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_Valorizado');

      const fileName = `inventario_valorizado_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      this.toastr.success('Inventario valorizado exportado a Excel.');
    });
  }

  // --- IMPRIMIR HOJA DE CONTEO FÍSICO ---
  imprimirTomaFisica(): void {
    const fecha = new Date().toLocaleDateString('es-PE');
    let tablaHtml = `
      <html>
        <head>
          <title>Toma de Inventario Físico - Librería New Farma</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
            h2, p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-center { text-align: center; }
            .col-conteo { width: 90px; background-color: #fafafa; }
            .col-obs { width: 150px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px;">
            <div>
              <h2>LIBRERÍA MATHIAS</h2>
              <p><strong>HOJA DE TOMA DE INVENTARIO FÍSICO</strong></p>
              <p>Fecha de Conteo: ${fecha} | Responsable: _______________________</p>
            </div>
            <div style="text-align: right;">
              <p>Página: 1</p>
              <p>Total Items: ${this.prod.length}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 80px;">CÓDIGO</th>
                <th>DESCRIPCIÓN DEL PRODUCTO</th>
                <th>MARCA</th>
                <th>UBICACIÓN</th>
                <th class="text-center" style="width: 70px;">STOCK SISTEMA</th>
                <th class="text-center col-conteo">CONTEO FÍSICO</th>
                <th class="col-obs">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
    `;

    this.prod.forEach((p, index) => {
      tablaHtml += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${p.codigoproducto || p.idproducto}</td>
          <td><strong>${p.nombre}</strong></td>
          <td>${p.laboratorio?.nombrelaboratorio || ''}</td>
          <td>${p.ubicacion || '-'}</td>
          <td class="text-center"><strong>${p.stock}</strong></td>
          <td class="col-conteo"></td>
          <td class="col-obs"></td>
        </tr>
      `;
    });

    tablaHtml += `
            </tbody>
          </table>
          <div style="margin-top: 40px; display: flex; justify-content: space-around;">
            <div style="border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 5px;">
              Firma del Responsable del Conteo
            </div>
            <div style="border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 5px;">
              Firma de Supervisión / Administración
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(tablaHtml);
      printWindow.document.close();
    }
  }
}
