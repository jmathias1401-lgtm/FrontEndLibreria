import { Compra } from "./compra";   
import { Producto } from "./producto";

export interface DetalleCompra {
    iddetallecompra?: number;
    idDetalleCompra?: number;
    codigodetallecompra: string;
    codigoDetalleCompra?: string;
    compra: Compra;    
    producto: Producto;
    lote: string;
    unidades: number;
    costounidad: number;
    costoUnidad?: number;
    total: number;
}

export interface DetalleCompraList {
    total: number;
    xpage: number;
    page: number;
    lastCost?: number;
    list: DetalleCompra[];
}
