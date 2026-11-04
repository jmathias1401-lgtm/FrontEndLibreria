import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Proveedor, ProveedorList } from '../models/proveedor';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private readonly baseUrl = `${environment.apiUrl}/proveedor`;

  constructor(private http: HttpClient) { }

  listar(page: number, xpage: number) {
    return this.http.get<any>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }
  
  listarByIdPersona(personaId: number) {
    return this.http.get<ProveedorList>(`${this.baseUrl}?page=1&xpage=100&persona_idpersona=${personaId}`);
  }

  guardar(proveedor: any) {
    return this.http.post<any>(this.baseUrl, proveedor, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=100&idproveedor=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  update(id: number, proveedor: Proveedor) {
    return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, proveedor);
  }
}
