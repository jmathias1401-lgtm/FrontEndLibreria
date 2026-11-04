import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Laboratorio, LaboratorioList } from '../models/laboratorio';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LaboratorioService {
  private readonly baseUrl = `${environment.apiUrl}/laboratorio`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 100) {
    return this.http.get<LaboratorioList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(laboratorio: any) {
    return this.http.post<any>(this.baseUrl, laboratorio, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=10&idlaboratorio=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
