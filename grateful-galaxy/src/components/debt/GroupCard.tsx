import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { fmt, isPaid, remaining, type Debtor, type Group } from "@/lib/debtStore"
import { DebtorRow } from "./DebtorRow"
import { cn } from "@/lib/utils"

interface GroupCardProps {
  group: Group
  debtors: Debtor[]
  onSelect: (id: number) => void
}

export function GroupCard({ group, debtors, onSelect }: GroupCardProps) {
  const [open, setOpen] = useState(false)

  const totalRemaining = debtors.reduce((s, d) => s + remaining(d), 0)
  const totalAmount    = debtors.reduce((s, d) => s + d.total, 0)
  const totalPaid      = debtors.reduce((s, d) => s + d.paid, 0)
  const pct            = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
  const pendingCount   = debtors.filter((d) => !isPaid(d)).length

  return (
    <div className="bg-background rounded-xl overflow-hidden mb-2">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-sm shrink-0">
          {group.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-snug">{group.name}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {group.date} · {pendingCount} คนยังค้าง
          </p>
        </div>
        <div className="text-right mr-1 shrink-0">
          <p className="text-[13px] font-medium text-foreground leading-snug">{fmt(totalRemaining)}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{pct}% ชำระแล้ว</p>
        </div>
        <ChevronDown
          className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          {debtors.map((d) => (
            <DebtorRow key={d.id} debtor={d} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}