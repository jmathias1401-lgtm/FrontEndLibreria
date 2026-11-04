import { Producto } from "./producto";
import { Venta } from "./venta.model";

export interface DetalleVenta {
    iddetalleventa?: number;
    idDetalleVenta?: number;
    venta: Venta;
    producto: Producto;
    codigodetalleventa: string;
    codigoDetalleVenta?: string;
    unidades: number;
    costounidad: number;
    costoUnidad?: number;
    subtotal: number;
    descuentounidad: number;
    descuentoUnidad?: number;
    total: number;
}

export interface DetalleVentaList {
    total: number;
    xpage: number;
    page: number;
    list: DetalleVenta[];
}
