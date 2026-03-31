   export interface Product {
        idproducto: number;
        codigoproducto: string;
        nombre: string;
        vencimiento: Date;
        estado: string;
        composicion: string;
        ubicacion: string;
        stock: number;
        precioventa: number;
        precioblister: number;
        preciocaja: number;
        codbarra: string;
        laboratorio: {
          idlaboratorio: number;
          nombrelaboratorio: string;
        };
        presentacion: {
          idpresentacion: number;
          nombrepresentacion: string;
        };
        unidadmedida: {
          idunidadmedida: number;
          nombreunidad: string;
        };
        cantidadLlevar: number;
        subTotal: number;
        tipoPrecioSeleccionado: 'PU' | 'PB' | 'PC';
      }
      
     export interface ProductList {
        total: number;
        xpage: number;
        page: number;
        list: Product[];
      }
      export interface Productos{
        prod:Product;
      }
