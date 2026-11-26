import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Perfil } from './types/database'
import { InventarioView } from './components/InventarioView'
import { CamaraScanner } from './components/CamaraScanner'
import { Store, LogIn, LogOut, ShieldCheck, Package } from 'lucide-react'

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Mamá Chela 2</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {perfil.nombre} • Rol:{' '}
                <span className="uppercase font-semibold text-emerald-400">{perfil.rol}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Inventario
            </span>
            <button
              onClick={cerrarSesion}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </header>

        <InventarioView
          esAdmin={perfil.rol === 'admin'}
          onAbrirCamara={(fn) => setCallbackCamara(() => fn)}
          ultimoCodigoEscaneado={ultimoCodigoEscaneado}
        />
      </div>

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