export type RolUsuario = 'admin' | 'cajero'

export interface Perfil {
  id: string
  nombre: string
  rol: RolUsuario
  activo: boolean
}

export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
}

export interface Producto {
  id: string
  codigo_barras: string | null
  nombre: string
  categoria_id: string | null
  precio_costo: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  permite_decimales: boolean
  fecha_vencimiento: string | null
  activo: boolean
}

export interface ItemCarrito {
  producto: Producto
  cantidad: number
  subtotal: number
}