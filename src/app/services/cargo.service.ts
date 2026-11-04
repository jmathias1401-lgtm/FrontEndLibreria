import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { cargo, CargoList } from '../models/cargo';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CargoService {
  private readonly baseUrl = `${environment.apiUrl}/cargo`;

  constructor(private http: HttpClient) { }

  List(page: number = 1, xpage: number = 100) {
    return this.http.get<CargoList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }

  guardar(cargo: any) {
    return this.http.post<any>(this.baseUrl, cargo, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=10&idcargo=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
