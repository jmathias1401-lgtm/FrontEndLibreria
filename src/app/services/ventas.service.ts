import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Venta, ventaList } from '../models/venta.model';
import { RespuestaVenta } from '../models/RespuestaVenta';
import { environment } from '../../environments/environment';

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

  ListWithFilters(page: number, xpage: number, filters: { serie?: string, correlativo?: string, search?: string }) {
    let query = `${this.baseUrl}?page=${page}&xpage=${xpage}`;
    if (filters.serie) query += `&serie=${filters.serie}`;
    if (filters.correlativo) query += `&correlativo=${filters.correlativo}`;
    if (filters.search) query += `&search=${filters.search}`;
    return this.http.get<ventaList>(query);
  }

  saveVenta(venta: any) {
    console.log("Datos de venta a enviar:", venta);
    return this.http.post<RespuestaVenta>(this.baseUrl, venta, {
      observe: 'response',
    });
  }
}
