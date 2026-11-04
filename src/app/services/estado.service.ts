import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EstadoList } from '../models/estado';
import { Pedido } from '../models/pedido';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EstadoService {
  private readonly baseUrl = `${environment.apiUrl}/estado`;

  constructor(private http: HttpClient) { }

  List() {
    return this.http.get<EstadoList>(`${this.baseUrl}?page=1&xpage=10`);
  }

  savePedido(pedido: Pedido) {
    console.log("Datos de pedido a enviar:", pedido);
    return this.http.post<EstadoService>(`${this.baseUrl}?page=1&xpage=10`, pedido, {
      observe: 'response'
    });
  }
}
