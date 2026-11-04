import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Empleado, EmpleadoList } from '../models/empleado';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private readonly baseUrl = `${environment.apiUrl}/empleado`;

  constructor(private http: HttpClient) { }

  listar(page: number, xpage: number) {
    return this.http.get<EmpleadoList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(empleado: any) {
    return this.http.post<any>(this.baseUrl, empleado, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=100&idempleado=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  updateEmpleado(id: number, empleado: Empleado) {
    return this.http.put<Empleado>(`${this.baseUrl}/${id}`, empleado);
  }
}
