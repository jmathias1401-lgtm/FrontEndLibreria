import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Presentacion, PresentacionList } from '../models/presentacion';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PresentacionService {
  private readonly baseUrl = `${environment.apiUrl}/presentacion`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 100) {
    return this.http.get<PresentacionList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(presentacion: any) {
    return this.http.post<any>(this.baseUrl, presentacion, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=10&idpresentacion=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
