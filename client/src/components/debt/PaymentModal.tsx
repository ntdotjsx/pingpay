import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { fmt, remaining, type Debtor } from "@/lib/debtStore"
import { DebtorAvatar } from "./DebtorAvatar"

interface PaymentModalProps {
  debtor: Debtor | null
  open: boolean
  onClose: () => void
  onConfirm: (debtorId: number, amount: number) => void
}

export function PaymentModal({ debtor, open, onClose, onConfirm }: PaymentModalProps) {
  const [mode, setMode] = useState<"full" | "part">("full")
  const [partAmt, setPartAmt] = useState("")
  const [error, setError] = useState("")

  if (!debtor) return null

  const owed = remaining(debtor)
  const quickAmounts = [
    Math.ceil((owed * 0.25) / 100) * 100,
    Math.ceil((owed * 0.5) / 100) * 100,
    owed,
  ].filter((v, i, a) => a.indexOf(v) === i && v > 0)

  const handleConfirm = () => {
    if (mode === "full") {
      onConfirm(debtor.id, owed)
    } else {
      const amt = parseFloat(partAmt) || 0
      if (amt <= 0)  { setError("กรุณาใส่จำนวนเงิน"); return }
      if (amt > owed) { setError("จำนวนเงินมากเกินยอดค้าง"); return }
      onConfirm(debtor.id, amt)
    }
    setPartAmt("")
    setError("")
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setPartAmt(""); setError("") }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>รับเงินจาก</DialogTitle>
          <DialogDescription>เลือกวิธีชำระด้านล่าง</DialogDescription>
        </DialogHeader>

        {/* Debtor info */}
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3.5">
          <DebtorAvatar debtor={debtor} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{debtor.name}</p>
            <p className="text-xs text-muted-foreground truncate">{debtor.note}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">ค้างอยู่</p>
            <p className="text-lg font-medium text-destructive">{fmt(owed)}</p>
          </div>
        </div>

        {/* Payment mode selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("full")}
            className={`border rounded-xl p-3.5 text-center transition-all ${
              mode === "full"
                ? "border-2 border-foreground bg-foreground/5"
                : "border-border bg-muted/30"
            }`}
          >
            <svg className="w-5 h-5 mx-auto mb-1 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm font-medium text-foreground">จ่ายหมดเลย</p>
            <p className="text-xs text-muted-foreground mt-0.5">ตัดยอดทั้งหมด</p>
          </button>
          <button
            onClick={() => setMode("part")}
            className={`border rounded-xl p-3.5 text-center transition-all ${
              mode === "part"
                ? "border-2 border-foreground bg-foreground/5"
                : "border-border bg-muted/30"
            }`}
          >
            <svg className="w-5 h-5 mx-auto mb-1 text-muted-foreground stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
            </svg>
            <p className="text-sm font-medium text-foreground">ผ่อนจ่าย</p>
            <p className="text-xs text-muted-foreground mt-0.5">จ่ายบางส่วน</p>
          </button>
        </div>

        {/* Partial amount input */}
        {mode === "part" && (
          <div className="bg-muted/50 rounded-xl p-3.5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">จำนวนที่จ่าย</p>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">฿</span>
              <Input
                type="number"
                placeholder="0"
                value={partAmt}
                onChange={(e) => { setPartAmt(e.target.value); setError("") }}
                className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-1.5 flex-wrap">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  onClick={() => setPartAmt(String(q))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {fmt(q)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            ยืนยันรับเงิน
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}