import { Estado } from "./estado";

export interface cargo {
    idcargo: number;
    idCargo?: number;
    nombrecargo: string;
    nombreCargo?: string;
    descripcion?: string;
    estado?: Estado;
}

export type Cargo = cargo;

export interface CargoList {
    total: number;
    xpage: number;
    page: number;
    list: cargo[];
}
