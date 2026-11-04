import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Compra, CompraList } from '../models/compra';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private readonly baseUrl = `${environment.apiUrl}/compra`;

  constructor(private http: HttpClient) { }

  List(page: number, xpage: number) {
    return this.http.get<CompraList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  saveCompra(compra: any) {
    console.log("Datos de compra a enviar:", compra);
    return this.http.post<any>(this.baseUrl, compra, {
      observe: 'response',
    });
  }
}
