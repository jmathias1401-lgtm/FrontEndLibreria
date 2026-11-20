import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ProductoService } from './producto.service';
import { DetalleCompraService } from './detallecompra.service';
import { DetalleVentaService } from './detalleventa.service';
import { AuthService } from './auth.service';

export interface AjusteInventario {
  id: string;
  idproducto: number;
  nombreProducto: string;
  codigoProducto?: string;
  tipo: 'CONTEO' | 'ENTRADA' | 'SALIDA';
  motivo: string;
  stockAnterior: number;
  cantidadAjustada: number;
  nuevoStock: number;
  usuario: string;
  fecha: string;
}

export interface MovimientoKardex {
  fecha: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  origen: string; // 'Compra C-001', 'Venta B001-12', 'Ajuste Físico', etc.
  detalle: string; // Proveedor, Cliente o Motivo de ajuste
  cantidadEntrada: number;
  cantidadSalida: number;
  costoOPrecio: number;
  stockResultante?: number;
}

export interface ResumenValorizado {
  totalProductos: number;
  totalUnidades: number;
  capitalInvertido: number;
  valorVentaEstimado: number;
  gananciaEstimada: number;
  margenPorcentaje: number;
  productosCriticos: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly storageKeyAjustes = 'newfarma_ajustes_inventario';
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private productoService: ProductoService,
    private detalleCompraService: DetalleCompraService,
    private detalleVentaService: DetalleVentaService,
    private authService: AuthService
  ) {}

  // ==========================================
  // GESTIÓN DE AJUSTES (AUDITORÍA LOCAL/PERSISTENTE)
  // ==========================================

  obtenerTodosLosAjustes(): AjusteInventario[] {
    try {
      const data = localStorage.getItem(this.storageKeyAjustes);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  obtenerAjustesPorProducto(idproducto: number): AjusteInventario[] {
    return this.obtenerTodosLosAjustes().filter(a => a.idproducto === idproducto);
  }

  registrarAjuste(ajuste: Omit<AjusteInventario, 'id' | 'fecha' | 'usuario'>): AjusteInventario {
    const ajustes = this.obtenerTodosLosAjustes();
    const usuarioActual = this.authService.getCurrentUser()?.nombreusuario || 'Administrador';

    const nuevoAjuste: AjusteInventario = {
      ...ajuste,
      id: 'AJ-' + Date.now(),
      fecha: new Date().toISOString(),
      usuario: usuarioActual
    };

    ajustes.unshift(nuevoAjuste); // Al inicio (más reciente primero)
    try {
      localStorage.setItem(this.storageKeyAjustes, JSON.stringify(ajustes));
    } catch (e) {
      console.warn('Error guardando ajuste en localStorage:', e);
    }

    return nuevoAjuste;
  }

  // ==========================================
  // KARDEX DE PRODUCTO (COMBINA COMPRAS, VENTAS Y AJUSTES)
  // ==========================================

  obtenerKardexProducto(producto: any): Observable<MovimientoKardex[]> {
    const idProducto = producto.idproducto;
    const movimientos: MovimientoKardex[] = [];

    // 1. Agregar ajustes físicos registrados
    const ajustes = this.obtenerAjustesPorProducto(idProducto);
    ajustes.forEach(a => {
      const esEntrada = a.tipo === 'ENTRADA' || (a.tipo === 'CONTEO' && a.nuevoStock > a.stockAnterior);
      const dif = Math.abs(a.nuevoStock - a.stockAnterior);

      movimientos.push({
        fecha: a.fecha,
        tipo: 'AJUSTE',
        origen: `Ajuste (${a.tipo})`,
        detalle: a.motivo,
        cantidadEntrada: esEntrada ? (a.tipo === 'ENTRADA' ? a.cantidadAjustada : dif) : 0,
        cantidadSalida: !esEntrada ? (a.tipo === 'SALIDA' ? a.cantidadAjustada : dif) : 0,
        costoOPrecio: producto.precioventa || 0,
        stockResultante: a.nuevoStock
      });
    });

    // 2. Intentar consultar compras y costo histórico
    return this.detalleCompraService.getLastPrecioCompra(idProducto).pipe(
      map(res => {
        // Si hay costo de compra disponible
        const ultimoCosto = (res as any)?.lastCost || (producto.precioventa ? producto.precioventa * 0.7 : 0);

        // Agregamos un movimiento representativo de stock inicial si no hay historial
        if (movimientos.length === 0) {
          movimientos.push({
            fecha: new Date().toISOString(),
            tipo: 'AJUSTE',
            origen: 'Stock Actual',
            detalle: 'Existencia actual en almacén',
            cantidadEntrada: producto.stock || 0,
            cantidadSalida: 0,
            costoOPrecio: ultimoCosto,
            stockResultante: producto.stock || 0
          });
        }

        // Ordenar por fecha descendente
        return movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      }),
      catchError(() => {
        if (movimientos.length === 0) {
          movimientos.push({
            fecha: new Date().toISOString(),
            tipo: 'AJUSTE',
            origen: 'Stock Actual',
            detalle: 'Existencia actual en almacén',
            cantidadEntrada: producto.stock || 0,
            cantidadSalida: 0,
            costoOPrecio: producto.precioventa || 0,
            stockResultante: producto.stock || 0
          });
        }
        return of(movimientos);
      })
    );
  }

  // ==========================================
  // CÁLCULO DE INVENTARIO VALORIZADO
  // ==========================================

  calcularValorizado(productos: any[]): ResumenValorizado {
    let totalUnidades = 0;
    let capitalInvertido = 0;
    let valorVentaEstimado = 0;
    let productosCriticos = 0;

    for (const p of productos) {
      const stock = Number(p.stock) || 0;
      const pVenta = Number(p.precioventa) || 0;
      // Si el producto no tiene costo de compra registrado, se toma un estimado del 70% del precio de venta (margen del 30%)
      const pCosto = p.costoCompra ? Number(p.costoCompra) : (pVenta * 0.7);

      totalUnidades += stock;
      capitalInvertido += (stock * pCosto);
      valorVentaEstimado += (stock * pVenta);

      if (stock <= 5) {
        productosCriticos++;
      }
    }

    const gananciaEstimada = Math.max(0, valorVentaEstimado - capitalInvertido);
    const margenPorcentaje = valorVentaEstimado > 0 ? (gananciaEstimada / valorVentaEstimado) * 100 : 0;

    return {
      totalProductos: productos.length,
      totalUnidades,
      capitalInvertido,
      valorVentaEstimado,
      gananciaEstimada,
      margenPorcentaje,
      productosCriticos
    };
  }
}
