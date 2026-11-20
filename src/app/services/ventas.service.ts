import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Venta, ventaList } from '../models/venta.model';
import { RespuestaVenta } from '../models/RespuestaVenta';
import { environment } from '../../environments/environment';

export interface VentasHoraDto {
  hora: number;
  cantidad: number;
  total: number;
}

export interface VentasComprobanteDto {
  tipoComprobante: string;
  cantidad: number;
  total: number;
}

export interface VendedorRendimientoDto {
  idEmpleado: number;
  vendedor: string;
  cantidadVentas: number;
  totalMonto: number;
}

export interface DashboardKpiResponse {
  ventasHoyMonto: number;
  ventasHoyCantidad: number;
  ticketPromedioHoy: number;
  ventasMesMonto: number;
  ventasMesCantidad: number;
  productosStockCritico: number;
  productosAgotados: number;
  totalProductos: number;
  ventasPorHoraHoy: VentasHoraDto[];
  ventasPorComprobanteMes: VentasComprobanteDto[];
  topVendedoresMes: VendedorRendimientoDto[];
}

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private readonly baseUrl = `${environment.apiUrl}/venta`;
  private url: string = this.baseUrl;
  urlList = this.baseUrl;

  constructor(private http: HttpClient) { }

  List(page: number, xpage: number) {
    return this.http.get<ventaList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  ListWithFilters(page: number, xpage: number, filters: { 
    serie?: string; 
    correlativo?: string; 
    search?: string;
    fechaInicio?: string;
    fechaFin?: string;
    idTipoComprobante?: number;
    idEmpleado?: number;
  }) {
    let query = `${this.baseUrl}?page=${page}&xpage=${xpage}`;
    if (filters.serie) query += `&serie=${encodeURIComponent(filters.serie)}`;
    if (filters.correlativo) query += `&correlativo=${encodeURIComponent(filters.correlativo)}`;
    if (filters.search) query += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.fechaInicio) query += `&fechaInicio=${encodeURIComponent(filters.fechaInicio)}`;
    if (filters.fechaFin) query += `&fechaFin=${encodeURIComponent(filters.fechaFin)}`;
    if (filters.idTipoComprobante) query += `&idTipoComprobante=${filters.idTipoComprobante}`;
    if (filters.idEmpleado) query += `&idEmpleado=${filters.idEmpleado}`;
    return this.http.get<ventaList>(query);
  }

  saveVenta(venta: any) {
    console.log("Datos de venta a enviar:", venta);
    return this.http.post<RespuestaVenta>(this.baseUrl, venta, {
      observe: 'response',
    });
  }

  getKpisTiempoReal(): Observable<DashboardKpiResponse> {
    return this.http.get<DashboardKpiResponse>(`${this.baseUrl}/kpis-tiempo-real`);
  }
}
