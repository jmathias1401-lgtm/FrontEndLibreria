import { Persona } from "./persona";

export interface Proveedor {
    idproveedor?: number;
    idProveedor?: number;
    persona?: Persona;
    nombre?: string;
    ruc?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
}

export interface ProveedorList {
    total: number;
    xpage: number;
    page: number;
    list: Proveedor[];
}
