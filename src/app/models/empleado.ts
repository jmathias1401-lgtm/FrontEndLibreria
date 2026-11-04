import { Estado } from "./estado";
import { Persona } from "./persona";
import { usuario } from "./usuario";

export interface Empleado {
    idempleado: number;
    idEmpleado?: number;
    estado?: Estado;
    persona?: Persona;
    usuario?: usuario;
}

export interface EmpleadoList {
    total: number;
    xpage: number;
    page: number;
    list: Empleado[];
}
