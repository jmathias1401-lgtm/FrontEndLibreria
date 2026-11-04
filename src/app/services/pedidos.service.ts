import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Venta } from '../models/venta.model';
import { Pedido, PedidoList } from '../models/pedido';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private readonly baseUrl = `${environment.apiUrl}/pedido`;

  constructor(private http: HttpClient) { }

  List() {
    return this.http.get<PedidoList>(`${this.baseUrl}?page=1&xpage=1000`);
  }

  lastPedido() {
    return this.http.get<string>(`${this.baseUrl}/lastpedido`);
  }

  savePedido(venta: Venta) {
    console.log("Datos de pedido a enviar:", venta);
    return this.http.post<PedidosService>(this.baseUrl, venta, {
      observe: 'response'
    });
  }
}
