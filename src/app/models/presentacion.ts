export interface Presentacion {
    idpresentacion: number;
    idPresentacion?: number;
    nombrepresentacion: string;
    nombrePresentacion?: string;
}

export interface PresentacionList {
    total: number;
    xpage: number;
    page: number;
    list: Presentacion[];
}
