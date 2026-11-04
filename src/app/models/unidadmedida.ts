export interface UnidadMedida {
    idunidadmedida: number;
    idUnidadMedida?: number;
    nombreunidad: string;
    nombreUnidad?: string;
}

export interface UnidadMedidaList {
    total: number;
    xpage: number;
    page: number;
    list: UnidadMedida[];
}
