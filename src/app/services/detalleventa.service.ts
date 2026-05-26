import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { DetalleVenta, DetalleVentaList } from "../models/detalleventa";

@Injectable({
    providedIn: 'root'
})
export class DetalleVentaService {
    constructor(private http: HttpClient) { }
    url = "/api/detalleventa";

    List(page: number = 1, xpage: number = 10) {
        return this.http.get<DetalleVentaList>(`${this.url}?page=${page}&xpage=${xpage}`);
    }
    Save(detalle: any) {
        return this.http.post<DetalleVenta>(this.url, detalle, {
            observe: 'response'
        })
    }
    getDetallesPorVenta(ventaId: number) {
        return this.http.get<DetalleVentaList>(`${this.url}/${ventaId}`);
    }
    getVentasMes(mes: number, anio: number) {
        // Enviamos anio en la ruta y también como query param por si acaso el backend no tiene @PathVariable
        return this.http.get<DetalleVentaList>(`${this.url}/ventasMes/${mes}/${anio}`);
    }
}
