import { Routes } from '@angular/router';
import { NopageFoundComponent } from './nopage-found/nopage-found.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DashboardProductosComponent } from './pages/dashboard-productos/dashboard-productos.component';
import { ProductosListComponent } from './pages/productos/list/productosList.component';

import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { CartComponent } from './pages/cart/cart.component';
import { OrdersComponent } from './pages/orders/orders.component';

import { productFormComponent } from './pages/productos/edit/productForm.component';
import { VentaComponent } from './pages/ventas/ventas/ventas.component';
import { ModalVentasComponent } from './pages/modal/modal-ventas/modal-ventas.component';
import { ClientFormComponent } from './pages/client-form/client-form.component';
import { ReportsComponent } from './pages/reports/reports.ventas/reports.component';
import { ReportsComprasComponent } from './pages/reports/reports.compras/reports-compras.component';
import { ClienteListComponent } from './pages/clientes/list/list.component';
import { ClienteFormComponent } from './pages/clientes/form/form.component';
import { ProveedorListComponent } from './pages/proveedores/list/list.component';
import { ProveedorFormComponent } from './pages/proveedores/form/form.component';
import { ComprasComponent } from './pages/compras/compras';
import { EmpleadosListComponent } from './pages/empleados/list/list.component';
import { FormComponent } from './pages/empleados/form/form.component';
import { CargosListComponent } from './pages/cargos/list/list.component';
import { CargoFormComponent } from './pages/cargos/form/form.component';
import { EmpresasListComponent } from './pages/empresa/list/list.component';
import { EmpresaFormComponent } from './pages/empresa/form/form.component';
import { LaboratoriosListComponent } from './pages/laboratorios/list/list.component';
import { LaboratorioFormComponent } from './pages/laboratorios/form/form.component';
import { UnidadesmedidaListComponent } from './pages/unidadesmedida/list/list.component';
import { UnidadmedidaFormComponent } from './pages/unidadesmedida/form/form.component';
import { PresentacionesListComponent } from './pages/presentaciones/list/list.component';
import { PresentacionFormComponent } from './pages/presentaciones/form/form.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
    {path: "",redirectTo: "/home", pathMatch: "full"},
    {path: "login", component: LoginComponent},
    {path: "register", component: RegisterComponent},
    {path:"home", component: HomeComponent},
    {path:"cart", component: CartComponent, canActivate: [RoleGuard]},
    {path:"orders", component: OrdersComponent, canActivate: [RoleGuard]},
    {path: "dashboard", component: DashboardComponent, canActivate: [RoleGuard]},
    {path: "dashboard-productos", component: DashboardProductosComponent, canActivate: [RoleGuard]},
    {path: "reports", 
        canActivate: [RoleGuard],
        children: 
        [
            { path: "ventas", component: ReportsComponent },
            { path: "compras", component: ReportsComprasComponent }
        ]
    },
    {path:"ventas", component: VentaComponent, canActivate: [RoleGuard]},
    {path:"clientes", component: ClienteListComponent, canActivate: [RoleGuard]},
    {path:"empleados", component: EmpleadosListComponent, canActivate: [RoleGuard]},
    { path: 'empleados/agregar', component: FormComponent, canActivate: [RoleGuard] },
    { path: 'empleados/editar/:id', component: FormComponent, canActivate: [RoleGuard] },
    {path:"cargos", component: CargosListComponent, canActivate: [RoleGuard]},
    { path: 'cargos/form', component: CargoFormComponent, canActivate: [RoleGuard] },
    { path: 'cargos/form/:id', component: CargoFormComponent, canActivate: [RoleGuard] },
    {path:"empresas", component: EmpresasListComponent, canActivate: [RoleGuard]},
    { path: 'empresas/form', component: EmpresaFormComponent, canActivate: [RoleGuard] },
    { path: 'empresas/form/:id', component: EmpresaFormComponent, canActivate: [RoleGuard] },
    {path:"usuarios", component: UsuariosComponent, canActivate: [RoleGuard]},
    {path:"laboratorio", component: LaboratoriosListComponent, canActivate: [RoleGuard]},
    { path: 'laboratorio/form', component: LaboratorioFormComponent, canActivate: [RoleGuard] },
    { path: 'laboratorio/form/:id', component: LaboratorioFormComponent, canActivate: [RoleGuard] },
    {path:"unidadmedida", component: UnidadesmedidaListComponent, canActivate: [RoleGuard]},
    { path: 'unidadmedida/form', component: UnidadmedidaFormComponent, canActivate: [RoleGuard] },
    { path: 'unidadmedida/form/:id', component: UnidadmedidaFormComponent, canActivate: [RoleGuard] },
    {path:"presentacion", component: PresentacionesListComponent, canActivate: [RoleGuard]},
    { path: 'presentacion/form', component: PresentacionFormComponent, canActivate: [RoleGuard] },
    { path: 'presentacion/form/:id', component: PresentacionFormComponent, canActivate: [RoleGuard] },
    { path: 'form', component: ClienteFormComponent, canActivate: [RoleGuard] },//nuevo cliente o editar cliente
    { path: 'client-form', component: ClientFormComponent, canActivate: [RoleGuard] },//este es para el formulario de cliente al hacer venta
    {path: 'proveedores',component: ProveedorListComponent, canActivate: [RoleGuard], data: { title: 'Proveedores' }},
    {path: 'proveedores-form', component: ProveedorFormComponent, canActivate: [RoleGuard] },//nuevo proveedor o editar proveedor
    { path: "add", component: productFormComponent, canActivate: [RoleGuard] },
    { path:"edit/:id",component:productFormComponent, canActivate: [RoleGuard]},
    { path: "productos", component: ProductosListComponent, canActivate: [RoleGuard] },
    { path: "compras", component: ComprasComponent, canActivate: [RoleGuard] },
    {path: "**",component:NopageFoundComponent},
    
    
];
