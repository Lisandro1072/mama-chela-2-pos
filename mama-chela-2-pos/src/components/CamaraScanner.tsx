import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, X } from 'lucide-react'

interface CamaraScannerProps {
  onDetectado: (codigo: string) => void
  onCerrar: () => void
}

export function CamaraScanner({ onDetectado, onCerrar }: CamaraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const yaDetectoRef = useRef(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: { stop: () => void } | null = null

    const iniciarCamara = async () => {
      try {
        if (!videoRef.current) return
        controls = await reader.decodeFromConstraints(
          {
            video: { facingMode: { ideal: 'environment' } },
          },
          videoRef.current,
          (result, err) => {
            if (result && !yaDetectoRef.current) {
              yaDetectoRef.current = true
              const texto = result.getText().trim()
              controls?.stop()
              onDetectado(texto)
            }
            if (err && err.name !== 'NotFoundException') {
              // NotFoundException es normal mientras busca un código en el cuadro
            }
          }
        )
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al acceder a la cámara'
        setErrorCamara(
          `No se pudo abrir la cámara (${msg}). Verifica permisos del navegador y que estés en HTTPS o localhost.`
        )
      }
    }

    iniciarCamara()

    return () => {
      controls?.stop()
    }
  }, [onDetectado])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Camera className="w-4 h-4" />
            Escanear código de barras
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {errorCamara ? (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
              {errorCamara}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_12px_#34d399]" />
            </div>
          )}
          <p className="text-xs text-slate-400 text-center">
            Apunta la cámara al código de barras del producto (EAN-13, UPC, Code-128).
          </p>
        </div>
      </div>
    </div>
  )
}