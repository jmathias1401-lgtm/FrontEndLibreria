import { Cliente } from "./cliente";
import { Empleado } from "./empleado";
import { TipoComprobante } from "./tipocomprobante";

export interface Venta {
    idventa?: number;
    idVenta?: number;
    serie?: string;
    correlativo?: string;
    fechaventa?: Date;
    fechaVenta?: Date;
    igv?: number;
    subtotal?: number;
    costoventa?: number;
    costoVenta?: number;
    cliente?: Cliente;
    empleado?: Empleado;
    tipoComprobante?: TipoComprobante;
}

export interface ventaList {
    total: number;
    xpage: number;
    page: number;
    list: Venta[];
}
