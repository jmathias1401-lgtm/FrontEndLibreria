export interface Product {
  idproducto: number;
  idProducto?: number;
  codigoproducto: string;
  codigoProducto?: string;
  nombre: string;
  vencimiento: any;
  estado: string;
  composicion: string;
  ubicacion: string;
  stock: number;
  precioventa: number;
  precioVenta?: number;
  precioblister: number;
  precioBlister?: number;
  preciocaja: number;
  precioCaja?: number;
  codbarra: string;
  codBarra?: string;
  laboratorio: {
    idlaboratorio?: number;
    idLaboratorio?: number;
    nombrelaboratorio?: string;
    nombreLaboratorio?: string;
  };
  presentacion: {
    idpresentacion?: number;
    idPresentacion?: number;
    nombrepresentacion?: string;
    nombrePresentacion?: string;
  };
  unidadmedida: {
    idunidadmedida?: number;
    idUnidadMedida?: number;
    nombreunidad?: string;
    nombreUnidad?: string;
  };
  cantidadLlevar: number;
  subTotal: number;
  tipoPrecioSeleccionado: 'PU' | 'PB' | 'PC';
  imagen_path: string;
  imagenPath?: string;
}

export interface ProductList {
  total: number;
  xpage: number;
  page: number;
  list: Product[];
}

export interface Productos {
  prod: Product;
}
