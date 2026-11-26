import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Categoria, Producto } from '../types/database'
import {
  ScanBarcode,
  Camera,
  Plus,
  Search,
  AlertTriangle,
  PackagePlus,
  Pencil,
  CheckCircle2,
  X,
} from 'lucide-react'

interface InventarioViewProps {
  esAdmin: boolean
  onAbrirCamara: (onCodigo: (codigo: string) => void) => void
  ultimoCodigoEscaneado: string | null
}

const formInicial = {
  id: '' as string,
  codigo_barras: '',
  nombre: '',
  categoria_id: '',
  precio_costo: '0',
  precio_venta: '0',
  stock_actual: '0',
  stock_minimo: '2',
  permite_decimales: false,
  fecha_vencimiento: '',
}

export function InventarioView({
  esAdmin,
  onAbrirCamara,
  ultimoCodigoEscaneado,
}: InventarioViewProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [soloBajoStock, setSoloBajoStock] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Modal crear/editar producto
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(formInicial)

  // Modal entrada rápida de stock
  const [productoStock, setProductoStock] = useState<Producto | null>(null)
  const [cantidadEntrada, setCantidadEntrada] = useState('')
  const [nuevoCostoEntrada, setNuevoCostoEntrada] = useState('')

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const [{ data: cats }, { data: prods, error: errProds }] = await Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    ])

    if (cats) setCategorias(cats)
    if (errProds) setError(errProds.message)
    if (prods) setProductos(prods)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const manejarCodigoDetectado = useCallback(
    (codigo: string) => {
      const limpio = codigo.trim()
      if (!limpio) return
      setError(null)

      const encontrado = productos.find(
        (p) => (p.codigo_barras ?? '').trim().toLowerCase() === limpio.toLowerCase()
      )

      if (encontrado) {
        setProductoStock(encontrado)
        setCantidadEntrada('')
        setNuevoCostoEntrada(String(encontrado.precio_costo))
        setMensaje(`Código ${limpio} encontrado: ${encontrado.nombre}`)
      } else {
        setForm({
          ...formInicial,
          codigo_barras: limpio,
          categoria_id: categorias[0]?.id ?? '',
        })
        setModalAbierto(true)
        setMensaje(`Código ${limpio} nuevo: completa los datos para registrarlo.`)
      }
    },
    [productos, categorias]
  )

  // Reaccionar cuando llegue un código desde el listener global de lector láser
  useEffect(() => {
    if (ultimoCodigoEscaneado) {
      manejarCodigoDetectado(ultimoCodigoEscaneado)
    }
  }, [ultimoCodigoEscaneado, manejarCodigoDetectado])

  // Listener global para lector láser de código de barras (teclas rápidas + Enter)
  useEffect(() => {
    let buffer = ''
    let ultimoTiempo = Date.now()

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const escribiendoEnInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')

      const ahora = Date.now()
      if (ahora - ultimoTiempo > 120) {
        buffer = ''
      }
      ultimoTiempo = ahora

      if (e.key === 'Enter') {
        if (buffer.length >= 4 && !escribiendoEnInput) {
          e.preventDefault()
          const codigoCapturado = buffer
          buffer = ''
          manejarCodigoDetectado(codigoCapturado)
        } else {
          buffer = ''
        }
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [manejarCodigoDetectado])

  const abrirNuevoProducto = () => {
    setForm({
      ...formInicial,
      categoria_id: categorias[0]?.id ?? '',
    })
    setModalAbierto(true)
  }

  const abrirEditarProducto = (p: Producto) => {
    setForm({
      id: p.id,
      codigo_barras: p.codigo_barras ?? '',
      nombre: p.nombre,
      categoria_id: p.categoria_id ?? '',
      precio_costo: String(p.precio_costo),
      precio_venta: String(p.precio_venta),
      stock_actual: String(p.stock_actual),
      stock_minimo: String(p.stock_minimo),
      permite_decimales: p.permite_decimales,
      fecha_vencimiento: p.fecha_vencimiento ?? '',
    })
    setModalAbierto(true)
  }

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!esAdmin) {
      setError('Solo el rol Administrador puede crear o editar productos.')
      return
    }
    setGuardando(true)
    setError(null)

    const payload = {
      codigo_barras: form.codigo_barras.trim() || null,
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id || null,
      precio_costo: Number(form.precio_costo) || 0,
      precio_venta: Number(form.precio_venta) || 0,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      permite_decimales: form.permite_decimales,
      fecha_vencimiento: form.fecha_vencimiento || null,
      actualizado_en: new Date().toISOString(),
    }

    const res = form.id
      ? await supabase.from('productos').update(payload).eq('id', form.id)
      : await supabase.from('productos').insert(payload)

    setGuardando(false)

    if (res.error) {
      setError('Error al guardar producto: ' + res.error.message)
      return
    }

    setModalAbierto(false)
    setMensaje(form.id ? 'Producto actualizado correctamente.' : 'Producto registrado en el inventario.')
    await cargarDatos()
  }

  const confirmarEntradaStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoStock) return
    const cant = Number(cantidadEntrada)
    if (!cant || cant <= 0) {
      setError('Ingresa una cantidad mayor a 0.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id ?? null
    const stockAnterior = Number(productoStock.stock_actual)
    const stockNuevo = stockAnterior + cant
    const costoActualizado =
      nuevoCostoEntrada !== '' ? Number(nuevoCostoEntrada) : productoStock.precio_costo

    const { error: errUpdate } = await supabase
      .from('productos')
      .update({
        stock_actual: stockNuevo,
        precio_costo: costoActualizado,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', productoStock.id)

    if (errUpdate) {
      setError('No se pudo actualizar stock: ' + errUpdate.message)
      return
    }

    await supabase.from('movimientos_stock').insert({
      producto_id: productoStock.id,
      usuario_id: userId,
      tipo: 'entrada_compra',
      cantidad: cant,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo: 'Entrada rápida de inventario',
    })

    setProductoStock(null)
    setMensaje(`Stock sumado: +${cant} a ${productoStock.nombre} (Nuevo stock: ${stockNuevo})`)
    await cargarDatos()
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (soloBajoStock && Number(p.stock_actual) > Number(p.stock_minimo)) return false
      if (!q) return true
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q)
      )
    })
  }, [productos, busqueda, soloBajoStock])

  const nombreCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'

  const margenPorcentaje = useMemo(() => {
    const costo = Number(form.precio_costo) || 0
    const venta = Number(form.precio_venta) || 0
    if (venta <= 0) return '0.0'
    return (((venta - costo) / venta) * 100).toFixed(1)
  }, [form.precio_costo, form.precio_venta])

  return (
    <div className="space-y-4">
      {/* Barra superior de acciones y escáner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código de barras..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoloBajoStock((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
              soloBajoStock
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock bajo
          </button>

          <button
            type="button"
            onClick={() => onAbrirCamara(manejarCodigoDetectado)}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Camera className="w-4 h-4" />
            Cámara
          </button>

          {esAdmin && (
            <button
              type="button"
              onClick={abrirNuevoProducto}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Nuevo producto
            </button>
          )}
        </div>
      </div>

      {/* Indicador lector láser listo */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <ScanBarcode className="w-4 h-4 text-emerald-400" />
          Lector láser activo: escanea un código en cualquier momento para buscar o registrar.
        </span>
        <span>{productosFiltrados.length} productos</span>
      </div>

      {mensaje && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {mensaje}
          </span>
          <button onClick={() => setMensaje(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Categoría</th>
                {esAdmin && <th className="px-4 py-3 text-right">Costo</th>}
                <th className="px-4 py-3 text-right">Venta</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando inventario...
                  </td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No hay productos registrados todavía. Usa <b>Nuevo producto</b> o escanea un código.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const bajo = Number(p.stock_actual) <= Number(p.stock_minimo)
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {p.nombre}
                        {p.permite_decimales && (
                          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">
                            Granel
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {p.codigo_barras ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {nombreCategoria(p.categoria_id)}
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-3 text-right text-slate-400">
                          {Number(p.precio_costo).toFixed(2)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        {Number(p.precio_venta).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            bajo
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {bajo && <AlertTriangle className="w-3 h-3" />}
                          {Number(p.stock_actual)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setProductoStock(p)
                              setCantidadEntrada('')
                              setNuevoCostoEntrada(String(p.precio_costo))
                            }}
                            title="Sumar entrada de mercadería"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 transition"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          {esAdmin && (
                            <button
                              type="button"
                              onClick={() => abrirEditarProducto(p)}
                              title="Editar producto"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={guardarProducto}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-lg">
                {form.id ? 'Editar producto' : 'Registrar nuevo producto'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Código de barras</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={form.codigo_barras}
                    onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    placeholder="Ej. 7771234567890"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onAbrirCamara((cod) => setForm((prev) => ({ ...prev, codigo_barras: cod })))
                    }
                    title="Leer código con cámara"
                    className="px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre del producto *</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Coca Cola 2L / Arroz por kg"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Precio costo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_costo}
                  onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Precio venta *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.precio_venta}
                  onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Margen: </span>
                  <span className="font-bold text-emerald-400">{margenPorcentaje}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stock inicial</label>
                <input
                  type="number"
                  step={form.permite_decimales ? '0.001' : '1'}
                  min="0"
                  value={form.stock_actual}
                  onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Stock mínimo</label>
                <input
                  type="number"
                  step={form.permite_decimales ? '0.001' : '1'}
                  min="0"
                  value={form.stock_minimo}
                  onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Vencimiento</label>
                <input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.permite_decimales}
                onChange={(e) => setForm({ ...form, permite_decimales: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              Permitir cantidades decimales (para venta por kg o gramos)
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Entrada Rápida de Mercadería */}
      {productoStock && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={confirmarEntradaStock}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Entrada de mercadería</h3>
              <button type="button" onClick={() => setProductoStock(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-100 text-sm">{productoStock.nombre}</p>
              <p className="text-slate-400">
                Stock actual: <span className="text-emerald-400 font-bold">{productoStock.stock_actual}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Cantidad a sumar *</label>
              <input
                type="number"
                step={productoStock.permite_decimales ? '0.001' : '1'}
                min="0.001"
                required
                autoFocus
                value={cantidadEntrada}
                onChange={(e) => setCantidadEntrada(e.target.value)}
                placeholder="Ej. 12"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            {esAdmin && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Precio costo unitario</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoCostoEntrada}
                  onChange={(e) => setNuevoCostoEntrada(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductoStock(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs"
              >
                Sumar stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}