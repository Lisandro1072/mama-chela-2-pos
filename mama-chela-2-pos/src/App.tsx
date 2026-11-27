import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Perfil } from './types/database'
import { InventarioView } from './components/InventarioView'
import { CamaraScanner } from './components/CamaraScanner'
import {
  Store,
  LogIn,
  LogOut,
  ShieldCheck,
  Package,
  ShoppingCart,
} from 'lucide-react'

type ModuloActivo = 'inventario' | 'pos'

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modulo, setModulo] = useState<ModuloActivo>('inventario')

  const [callbackCamara, setCallbackCamara] = useState<((codigo: string) => void) | null>(null)
  const [ultimoCodigoEscaneado, setUltimoCodigoEscaneado] = useState<string | null>(null)

  const cargarPerfil = async (userId: string) => {
    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (perfilError) {
      setError('No se pudo cargar el perfil: ' + perfilError.message)
      return
    }
    setPerfil(perfilData)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setCargando(false))
      } else {
        setCargando(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Credenciales incorrectas: ' + error.message)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        Cargando Mamá Chela 2...
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <form
          onSubmit={iniciarSesion}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mamá Chela 2</h1>
              <p className="text-xs text-slate-400">Sistema POS e Inventario</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lisandro@gmail.com"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4" />
            Ingresar al sistema
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 sm:pb-8">
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">Mamá Chela 2</h1>
              <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">{perfil.nombre}</span>
                <span>•</span>
                <span className="uppercase font-semibold text-emerald-400">{perfil.rol}</span>
              </p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setModulo('pos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                modulo === 'pos'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Caja / Ventas
            </button>
            <button
              type="button"
              onClick={() => setModulo('inventario')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                modulo === 'inventario'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Inventario
            </button>
          </nav>

          <button
            type="button"
            onClick={cerrarSesion}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-5">
        {modulo === 'inventario' ? (
          <InventarioView
            esAdmin={perfil.rol === 'admin'}
            onAbrirCamara={(fn) => setCallbackCamara(() => fn)}
            ultimoCodigoEscaneado={ultimoCodigoEscaneado}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <ShoppingCart className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold">Módulo de Caja y Ventas (POS)</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Aquí cobraremos con escáner láser o cámara, efectivo, QR y cierre de turno.
            </p>
            <button
              type="button"
              onClick={() => setModulo('inventario')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
            >
              Ir a Inventario
            </button>
          </div>
        )}
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-2">
        <button
          type="button"
          onClick={() => setModulo('pos')}
          className={`py-2.5 flex flex-col items-center gap-1 text-xs font-medium ${
            modulo === 'pos' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Caja / POS
        </button>
        <button
          type="button"
          onClick={() => setModulo('inventario')}
          className={`py-2.5 flex flex-col items-center gap-1 text-xs font-medium ${
            modulo === 'inventario' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          Inventario
        </button>
      </nav>

      {callbackCamara && (
        <CamaraScanner
          onDetectado={(codigo) => {
            callbackCamara(codigo)
            setUltimoCodigoEscaneado(codigo)
            setCallbackCamara(null)
          }}
          onCerrar={() => setCallbackCamara(null)}
        />
      )}
    </div>
  )
}