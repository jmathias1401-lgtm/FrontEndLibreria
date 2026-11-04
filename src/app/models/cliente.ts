import { Persona } from "./persona";

export interface Cliente {
    idcliente: number;
    idCliente?: number;
    persona?: Persona;
}

export interface ClienteList {
    total: number;
    xpage: number;
    page: number;
    list: Cliente[];
}
