import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { fmt } from "@/lib/debtStore"

interface Member {
  id: string
  name: string
  user_id?: number
}

interface ApiMember {
  id: number
  name: string
  phone: string | null
  email: string | null
}

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

type Step = "info" | "members" | "confirm"

export function CreateTripModal({ open, onClose, onCreated }: CreateTripModalProps) {
  const [step, setStep] = useState<Step>("info")

  // Step 1
  const [tripName, setTripName] = useState("")
  const [amountStr, setAmountStr] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [proofUrl, setProofUrl] = useState("")
  const [proofName, setProofName] = useState("")

  // Step 2
  const [members, setMembers] = useState<Member[]>([])
  const [searchQ, setSearchQ] = useState("")
  const [nameInput, setNameInput] = useState("")

  // Search state
  const [searchResults, setSearchResults] = useState<ApiMember[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [saving, setSaving] = useState(false)
  const amount = parseFloat(amountStr) || 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProofName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setProofUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Debounced search — เรียก API ทุกครั้งที่พิมพ์
  useEffect(() => {
    if (step !== "members") return
    if (!searchQ.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setShowDropdown(true)
      try {
        // ส่ง search param ไปที่ API
        const data = await api.getMembers(searchQ.trim())
        setSearchResults(data)
      } catch {
        toast.error("ค้นหาไม่สำเร็จ")
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQ, step])

  const reset = () => {
    setStep("info"); setTripName(""); setAmountStr(""); setDueDate("")
    setMembers([]); setSearchQ(""); setNameInput(""); setSaving(false)
    setSearchResults([]); setShowDropdown(false)
    setProofUrl(""); setProofName("")
  }

  const handleClose = () => { reset(); onClose() }

  const canNext1 = tripName.trim().length > 0 && amount > 0 && !!proofUrl

  // แยก search results เป็น เพิ่มแล้ว / ยังไม่เพิ่ม
  const notAdded = searchResults.filter((m) => !members.some((sel) => sel.user_id === m.id))
  const alreadyAdded = searchResults.filter((m) => members.some((sel) => sel.user_id === m.id))

  const addApiMember = (m: ApiMember) => {
    setMembers((prev) => [...prev, { id: `u${m.id}`, name: m.name, user_id: m.id }])
    setSearchQ("")
    setSearchResults([])
    setShowDropdown(false)
  }

  const addManual = () => {
    const n = nameInput.trim()
    if (!n) return
    const duplicate = members.some((m) => m.name.toLowerCase() === n.toLowerCase())
    if (duplicate) { toast.warning(`"${n}" อยู่ในรายชื่อแล้ว`); return }
    setMembers((prev) => [...prev, { id: `m${Date.now()}`, name: n }])
    setNameInput("")
  }

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id))

  const handleCreate = async () => {
    if (!proofUrl) {
      toast.error("กรุณาแนบภาพหลักฐานการโอนเงินก่อน")
      return
    }
    setSaving(true)
    try {
      await api.createGroup({
        name: tripName.trim(),
        amount_per_person: amount,
        due_date: dueDate || undefined,
        members: members.map((m) => ({ name: m.name, user_id: m.user_id })),
        proof_url: proofUrl,
      })
      toast.success(`สร้างทริป "${tripName}" สำเร็จ!`)
      reset(); onCreated()
    } catch (e: any) {
      toast.error(e.message ?? "สร้างกลุ่มไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = amount * members.length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            สร้างกลุ่มทริป
          </DialogTitle>
          <DialogDescription>
            {step === "info" && "กรอกข้อมูลทริปและยอดคนละเท่าไหร่"}
            {step === "members" && "เพิ่มรายชื่อคนในทริป"}
            {step === "confirm" && "ตรวจสอบก่อนสร้าง"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-1">
          {(["info", "members", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                step === s ? "bg-foreground text-background"
                : i < ["info","members","confirm"].indexOf(step) ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
              }`}>
                {i < ["info","members","confirm"].indexOf(step) ? "✓" : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-px w-8 ${i < ["info","members","confirm"].indexOf(step) ? "bg-emerald-500" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* ======== Step 1 ======== */}
        {step === "info" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">ชื่อทริป / งาน</label>
              <Input placeholder="เช่น ทริปเชียงใหม่ มีค. 68" value={tripName} onChange={(e) => setTripName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">ยอดคนละ (บาท)</label>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-background">
                <span className="text-sm font-medium text-muted-foreground">฿</span>
                <Input type="number" placeholder="0" value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">กำหนดชำระ (ไม่บังคับ)</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">หลักฐานการยืมเงิน (รูปสลิปหรือสัญญา) *</label>
              <div className="flex flex-col gap-1.5">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer"
                />
                {proofName && (
                  <p className="text-[10px] text-emerald-600 font-medium truncate">
                    📎 {proofName} (แนบแล้ว)
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>ยกเลิก</Button>
              <Button className="flex-1" disabled={!canNext1} onClick={() => setStep("members")}>ถัดไป →</Button>
            </div>
          </div>
        )}

        {/* ======== Step 2 ======== */}
        {step === "members" && (
          <div className="space-y-3">
            {/* ค้นหาจาก user ในระบบ */}
            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                ค้นหาจากรายชื่อที่มีในระบบ
              </label>
              <Input
                placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                autoComplete="off"
              />

              {/* Dropdown */}
              {showDropdown && searchQ && (
                <div className="mt-1 border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                  {searching && (
                    <p className="text-xs text-muted-foreground px-3 py-2 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      กำลังค้นหา...
                    </p>
                  )}

                  {/* ยังไม่เพิ่ม — กดได้ */}
                  {!searching && notAdded.slice(0, 5).map((m) => (
                    <button key={m.id} onClick={() => addApiMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {m.name[0]}
                      </div>
                      <span className="flex-1">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">+ เพิ่ม</span>
                    </button>
                  ))}

                  {/* เพิ่มแล้ว — แสดง disabled */}
                  {!searching && alreadyAdded.slice(0, 3).map((m) => (
                    <div key={`added-${m.id}`}
                      className="w-full px-3 py-2 text-sm flex items-center gap-2 opacity-50 cursor-not-allowed select-none">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[11px] font-semibold shrink-0 text-emerald-700 dark:text-emerald-300">
                        ✓
                      </div>
                      <span className="flex-1">{m.name}</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        เพิ่มแล้ว
                      </span>
                    </div>
                  ))}

                  {/* ไม่พบ */}
                  {!searching && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">ไม่พบชื่อ "{searchQ}" ในระบบ</p>
                  )}
                </div>
              )}
            </div>

            {/* เพิ่มชื่อเอง */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                หรือเพิ่มชื่อเอง (ไม่มีในระบบ)
              </label>
              <div className="flex gap-2">
                <Input placeholder="ชื่อเพื่อน..." value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()} />
                <Button variant="outline" onClick={addManual} disabled={!nameInput.trim()}>+ เพิ่ม</Button>
              </div>
            </div>

            {/* รายชื่อที่เลือก */}
            {members.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  รายชื่อในทริป ({members.length} คน)
                </p>
                <div className="bg-muted/30 rounded-xl overflow-hidden">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {m.name[0]}
                      </div>
                      <span className="flex-1 text-sm">{m.name}</span>
                      {m.user_id && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                          มีบัญชี
                        </span>
                      )}
                      <button onClick={() => removeMember(m.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                {amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    ยอดรวม: <span className="font-semibold text-foreground">{fmt(totalAmount)}</span>
                    {" "}({members.length} × {fmt(amount)})
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("info")}>← ย้อนกลับ</Button>
              <Button className="flex-1" disabled={members.length === 0} onClick={() => setStep("confirm")}>ถัดไป →</Button>
            </div>
          </div>
        )}

        {/* ======== Step 3 ======== */}
        {step === "confirm" && (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✈️</span>
                <div>
                  <p className="text-sm font-semibold">{tripName}</p>
                  {dueDate && <p className="text-xs text-muted-foreground">ครบกำหนด {new Date(dueDate).toLocaleDateString("th-TH")}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[["คนละ", fmt(amount)], ["จำนวน", `${members.length} คน`], ["รวม", fmt(totalAmount)]].map(([label, val]) => (
                  <div key={label} className="text-center bg-background rounded-lg p-2">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">รายชื่อ</p>
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                    <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <span className="flex-1 text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{fmt(amount)}</span>
                    {m.user_id
                      ? <span className="text-[10px] text-emerald-600 dark:text-emerald-400">สร้าง link ได้</span>
                      : <span className="text-[10px] text-muted-foreground">บันทึกชื่อ</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
              💡 คนที่มีบัญชีในระบบจะมี guest link ให้ส่งไปแจ้งจ่ายได้เลย
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("members")}>← ย้อนกลับ</Button>
              <Button className="flex-1" disabled={saving} onClick={handleCreate}>
                {saving ? "กำลังสร้าง..." : "✓ สร้างทริป"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}