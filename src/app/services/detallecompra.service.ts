import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { DetalleCompra, DetalleCompraList } from "../models/detallecompra";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DetalleCompraService {
  private readonly baseUrl = `${environment.apiUrl}/detallecompra`;

  constructor(private http: HttpClient) {}

  List() {
    return this.http.get<DetalleCompraList>(`${this.baseUrl}?page=1&xpage=10`);
  }

  Save(detalle: any) {
    return this.http.post<DetalleCompra>(this.baseUrl, detalle, {
      observe: 'response'
    });
  }

  getDetallesPorCompra(compraId: number) {
    return this.http.get<DetalleCompraList>(`${this.baseUrl}/${compraId}`);
  }

  getLastPrecioCompra(ProductId: number) {
    return this.http.get<DetalleCompraList>(`${this.baseUrl}/producto/${ProductId}`);
  }
}
