"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { brouParser } from "@/lib/importers/brou"
import { brouRecompensaParser } from "@/lib/importers/brou-recompensa"
import { prexParser } from "@/lib/importers/prex"
import type { RawMovement } from "@/lib/importers/types"
import { getImportFormData, checkDuplicates } from "./actions"
import { ReviewList } from "./review-list"
import type { Account, Category, Concept } from "@/lib/generated/prisma/client"

type SerializedAccount = Omit<Account, "balance"> & { balance: number }
type CategoryWithConcepts = Category & { concepts: Concept[] }

const PARSERS: Record<string, typeof brouParser> = {
  brou: brouParser,
  "brou-recompensa": brouRecompensaParser,
  prex: prexParser,
}

type Step = "select" | "preview" | "review"

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [bank, setBank] = useState("")
  const [step, setStep] = useState<Step>("select")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [movements, setMovements] = useState<(RawMovement & { accountId: string })[]>([])
  const [duplicateFlags, setDuplicateFlags] = useState<boolean[]>([])
  const [formData, setFormData] = useState<{
    accounts: SerializedAccount[]
    categories: CategoryWithConcepts[]
  } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  async function handleProcess() {
    if (!file || !bank) return
    setLoading(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const parser = PARSERS[bank]
      const parsed = parser.parse(buffer)

      const data = await getImportFormData()

      // Resolve accountName → accountId
      const resolved = parsed.map((m) => {
        const account = data.accounts.find((a) => a.name === m.accountName)
        if (!account) throw new Error(`Cuenta no encontrada: "${m.accountName}"`)
        return { ...m, accountId: account.id }
      })

      const duplicates = await checkDuplicates(
        resolved.map((m) => ({
          date: m.date.toISOString(),
          amount: m.amount,
          accountId: m.accountId,
        }))
      )

      setMovements(resolved)
      setDuplicateFlags(duplicates)
      setFormData(data)
      setStep("preview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el archivo")
    } finally {
      setLoading(false)
    }
  }

  if (step === "preview") {
    const duplicateCount = duplicateFlags.filter(Boolean).length
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Archivo: <span className="font-medium text-foreground">{file?.name}</span></p>
        <div className="border rounded-lg p-6 space-y-2">
          <p className="text-lg font-medium">Se encontraron {movements.length} movimientos</p>
          {duplicateCount > 0 && (
            <p className="text-sm text-amber-600">
              ⚠ {duplicateCount} posible{duplicateCount > 1 ? "s" : ""} duplicado{duplicateCount > 1 ? "s" : ""} detectado{duplicateCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setStep("review")}>Continuar</Button>
          <Button variant="outline" onClick={() => setStep("select")}>Volver</Button>
        </div>
      </div>
    )
  }

  if (step === "review") {
    return (
      <ReviewList
        movements={movements}
        duplicateFlags={duplicateFlags}
        accounts={formData!.accounts}
        categories={formData!.categories}
        onBack={() => setStep("preview")}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Banco</label>
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Seleccioná un banco</option>
          <option value="brou">BROU</option>
          <option value="brou-recompensa">BROU Recompensa</option>
          <option value="prex">Prex</option>
        </select>
      </div>

      <div
        className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {file ? file.name : "Seleccioná un archivo"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">xlsx o csv</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {file && bank && (
        <Button className="w-full" onClick={handleProcess} disabled={loading}>
          {loading ? "Procesando..." : "Procesar archivo"}
        </Button>
      )}
    </div>
  )
}
