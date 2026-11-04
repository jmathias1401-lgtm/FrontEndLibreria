export interface Laboratorio {
    idlaboratorio: number;
    idLaboratorio?: number;
    nombrelaboratorio: string;
    nombreLaboratorio?: string;
}

export interface LaboratorioList {
    total: number;
    xpage: number;
    page: number;
    list: Laboratorio[];
}
