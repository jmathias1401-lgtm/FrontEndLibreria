import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { DetalleVenta, DetalleVentaList } from "../models/detalleventa";
import { response } from "express";


@Injectable({
    providedIn:'root'
})
export class DetalleVentaService{
    constructor(private http:HttpClient){}
    url="/api/detalleventa";
    urlList="/api/detalleventa?page=1&xpage=10";

    List(){
        return this.http.get<DetalleVentaList>(this.urlList);
    }
    Save(detalle:any){
        return this.http.post<DetalleVenta>(this.url,detalle,{
            observe: 'response'
        })
    }
    getDetallesPorVenta(ventaId: number){
        return this.http.get<DetalleVentaList>(`${this.url}/${ventaId}`);
    }
}
