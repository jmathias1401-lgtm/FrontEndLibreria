import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { empresa, EmpresaList } from '../models/empresa';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private readonly baseUrl = `${environment.apiUrl}/empresa`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 100) {
    return this.http.get<EmpresaList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(empresa: any) {
    return this.http.post<any>(this.baseUrl, empresa, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=10&idempresa=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
