import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UnidadMedida, UnidadMedidaList } from '../models/unidadmedida';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UnidadmedidaService {
  private readonly baseUrl = `${environment.apiUrl}/unidadmedida`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 100) {
    return this.http.get<UnidadMedidaList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(unidadmedida: any) {
    return this.http.post<any>(this.baseUrl, unidadmedida, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=10&idunidadmedida=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
