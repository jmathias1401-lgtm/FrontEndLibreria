import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { DetalleVenta, DetalleVentaList } from "../models/detalleventa";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DetalleVentaService {
  private readonly baseUrl = `${environment.apiUrl}/detalleventa`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 10) {
    return this.http.get<DetalleVentaList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  Save(detalle: any) {
    return this.http.post<DetalleVenta>(this.baseUrl, detalle, {
      observe: 'response'
    });
  }

  getDetallesPorVenta(ventaId: number) {
    return this.http.get<DetalleVentaList>(`${this.baseUrl}/${ventaId}`);
  }

  getVentasMes(mes: number, anio: number) {
    return this.http.get<DetalleVentaList>(`${this.baseUrl}/ventasMes/${mes}/${anio}`);
  }
}
