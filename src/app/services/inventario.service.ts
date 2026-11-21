import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface KardexBackendItem {
  idkardex?: number;
  producto?: any;
  fecha: string;
  tipoOperacion: string;
  motivo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  usuario: string;
}

export interface KardexBackendResponse {
  total: number;
  list: KardexBackendItem[];
}

export interface MovimientoKardex {
  fecha: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  origen: string;
  detalle: string;
  cantidadEntrada: number;
  cantidadSalida: number;
  stockAnterior: number;
  stockResultante: number;
  usuario: string;
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

export interface VentaTrazabilidadDto {
  idDetalleVenta: number;
  fechaVenta: string;
  comprobante: string;
  unidades: number;
  precioUnitario: number;
  total: number;
  vendedor: string;
  cliente: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ==========================================
  // GESTIÓN DE AJUSTES EN BASE DE DATOS (MYSQL)
  // ==========================================

  registrarAjusteEnBD(params: {
    idProducto: number;
    tipoOperacion: string;
    motivo: string;
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
  }): Observable<any> {
    const usuarioActual = this.authService.getCurrentUser()?.nombreusuario || 'Administrador';

    const payload = {
      idProducto: params.idProducto,
      tipoOperacion: params.tipoOperacion,
      motivo: params.motivo,
      cantidad: params.cantidad,
      stockAnterior: params.stockAnterior,
      stockNuevo: params.stockNuevo,
      usuario: usuarioActual
    };

    return this.http.post<any>(`${this.baseUrl}/kardex`, payload);
  }

  // ==========================================
  // OBTENER HISTORIAL DE KARDEX DESDE BASE DE DATOS (MYSQL)
  // ==========================================

  obtenerKardexProducto(producto: any): Observable<MovimientoKardex[]> {
    const idProducto = producto.idproducto;

    return this.http.get<KardexBackendResponse>(`${this.baseUrl}/kardex/producto/${idProducto}`).pipe(
      map(res => {
        const list = res?.list || [];

        // Mapear los registros reales de MySQL a la estructura de visualización
        const movimientos: MovimientoKardex[] = list.map(item => {
          const esEntrada = item.tipoOperacion === 'ENTRADA' || 
                           item.tipoOperacion === 'COMPRA' || 
                           (item.tipoOperacion === 'CONTEO' && item.stockNuevo > item.stockAnterior);
          const dif = Math.abs(item.stockNuevo - item.stockAnterior);
          const cantReal = item.cantidad > 0 ? item.cantidad : dif;

          let tipoVisual: 'ENTRADA' | 'SALIDA' | 'AJUSTE' = 'AJUSTE';
          if (item.tipoOperacion === 'COMPRA') tipoVisual = 'ENTRADA';
          else if (item.tipoOperacion === 'VENTA') tipoVisual = 'SALIDA';

          return {
            fecha: item.fecha,
            tipo: tipoVisual,
            origen: item.tipoOperacion,
            detalle: item.motivo,
            cantidadEntrada: esEntrada ? cantReal : 0,
            cantidadSalida: !esEntrada ? cantReal : 0,
            stockAnterior: item.stockAnterior,
            stockResultante: item.stockNuevo,
            usuario: item.usuario || 'Sistema'
          };
        });

        // Si la tabla aún no tiene movimientos grabados, mostrar el estado inicial actual de la base de datos
        if (movimientos.length === 0) {
          movimientos.push({
            fecha: new Date().toISOString(),
            tipo: 'AJUSTE',
            origen: 'EXISTENCIA_ACTUAL',
            detalle: 'Existencia registrada en base de datos',
            cantidadEntrada: producto.stock || 0,
            cantidadSalida: 0,
            stockAnterior: producto.stock || 0,
            stockResultante: producto.stock || 0,
            usuario: 'Base de Datos'
          });
        }

        return movimientos;
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

  // ==========================================
  // TRAZABILIDAD DE VENTAS POR PRODUCTO (QUIÉN, CUÁNDO, CUÁNTOS)
  // ==========================================

  obtenerTrazabilidadVentas(idProducto: number): Observable<VentaTrazabilidadDto[]> {
    return this.http.get<VentaTrazabilidadDto[]>(`${this.baseUrl}/detalleventa/trazabilidad/producto/${idProducto}`);
  }

  // ==========================================
  // AUDITORÍA GLOBAL DE MOVIMIENTOS Y MERMAS (FASE 3)
  // ==========================================

  obtenerAuditoriaGlobal(filtros?: {
    tipoOperacion?: string;
    usuario?: string;
    search?: string;
  }): Observable<KardexBackendItem[]> {
    let url = `${this.baseUrl}/kardex`;
    const params: string[] = [];

    if (filtros?.tipoOperacion && filtros.tipoOperacion !== 'TODOS') {
      params.push(`tipoOperacion=${encodeURIComponent(filtros.tipoOperacion)}`);
    }
    if (filtros?.usuario) {
      params.push(`usuario=${encodeURIComponent(filtros.usuario)}`);
    }
    if (filtros?.search) {
      params.push(`search=${encodeURIComponent(filtros.search)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<KardexBackendResponse>(url).pipe(
      map(res => res?.list || [])
    );
  }
}
