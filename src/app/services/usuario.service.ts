import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { usuario, EmpleadoList } from '../models/usuario';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly baseUrl = `${environment.apiUrl}/usuario`;
  private readonly authUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  listar(page: number, xpage: number) {
    return this.http.get<EmpleadoList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(usuario: any) {
    return this.http.post<any>(`${this.authUrl}/register`, usuario, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
