export class Producto {
  idproducto?: number;
  idProducto?: number;
  codigoproducto?: string;
  codigoProducto?: string;
  nombre?: string;
  vencimiento?: string;
  estado?: string;
  composicion?: string;
  ubicacion?: string;
  stock?: number;
  precioventa?: number;
  precioVenta?: number;
  precioblister?: number;
  precioBlister?: number;
  preciocaja?: number;
  precioCaja?: number;
  codbarra?: string;
  codBarra?: string;
  imagen_path?: string;
  imagenPath?: string;
  laboratorio?: {
    idlaboratorio?: number;
    idLaboratorio?: number;
    nombrelaboratorio?: string;
    nombreLaboratorio?: string;
  };
  presentacion?: {
    idpresentacion?: number;
    idPresentacion?: number;
    nombrepresentacion?: string;
    nombrePresentacion?: string;
  };
  unidadmedida?: {
    idunidadmedida?: number;
    idUnidadMedida?: number;
    nombreunidad?: string;
    nombreUnidad?: string;
  };
}
