import { useState, useCallback } from "react"
import { ChevronDown, Link2, Check, Copy } from "lucide-react"
import { fmt, isPaid, remaining, type Debtor, type Group } from "@/lib/debtStore"
import { DebtorRow } from "./DebtorRow"
import { cn } from "@/lib/utils"
import { api, type ApiGroupGuestLink } from "@/lib/api"
import { toast } from "sonner"

interface GroupCardProps {
  group: Group
  debtors: Debtor[]
  onSelect: (id: number) => void
}

type CopiedMap = Record<number, boolean>

export function GroupCard({ group, debtors, onSelect }: GroupCardProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"members" | "links">("members")
  const [guestLinks, setGuestLinks] = useState<ApiGroupGuestLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [copiedMap, setCopiedMap] = useState<CopiedMap>({})

  const totalRemaining = debtors.reduce((s, d) => s + remaining(d), 0)
  const totalAmount    = debtors.reduce((s, d) => s + d.total, 0)
  const totalPaid      = debtors.reduce((s, d) => s + d.paid, 0)
  const pct            = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
  const pendingCount   = debtors.filter((d) => !isPaid(d)).length

  const fetchGuestLinks = useCallback(async () => {
    if (guestLinks.length > 0) return
    setLoadingLinks(true)
    try {
      const links = await api.getGroupGuestLinks(group.id)
      setGuestLinks(links)
    } catch {
      toast.error("โหลด guest links ไม่สำเร็จ")
    } finally {
      setLoadingLinks(false)
    }
  }, [group.id, guestLinks.length])

  const handleTabChange = (tab: "members" | "links") => {
    setActiveTab(tab)
    if (tab === "links") fetchGuestLinks()
  }

  const copyLink = async (loanId: number, link: string) => {
    await navigator.clipboard.writeText(link)
    setCopiedMap((p) => ({ ...p, [loanId]: true }))
    setTimeout(() => setCopiedMap((p) => ({ ...p, [loanId]: false })), 2000)
  }

  const copyAllLinks = async () => {
    const text = guestLinks
      .map((l) => `${l.borrower?.name ?? "ไม่ระบุ"}: ${l.guest_link}`)
      .join("\n")
    await navigator.clipboard.writeText(text)
    toast.success("คัดลอก link ทุกคนแล้ว")
  }

  return (
    <div className="bg-background rounded-xl overflow-hidden mb-2 border border-border/50">
      {/* Header — คลิกเพื่อ expand */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-sm shrink-0">
          {group.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-snug">{group.name}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {pendingCount > 0 ? `${pendingCount} คนยังค้าง` : "ชำระครบแล้ว ✓"}
            {group.date ? ` · ${group.date}` : ""}
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
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            <button
              onClick={() => handleTabChange("members")}
              className={cn(
                "flex-1 py-2 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5",
                activeTab === "members"
                  ? "text-foreground border-b-2 border-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              รายบุคคล ({debtors.length})
            </button>
            <button
              onClick={() => handleTabChange("links")}
              className={cn(
                "flex-1 py-2 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5",
                activeTab === "links"
                  ? "text-foreground border-b-2 border-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link2 className="w-3 h-3" />
              Guest Links
            </button>
          </div>

          {/* Tab: รายบุคคล */}
          {activeTab === "members" && (
            <>
              {debtors.length > 0 ? (
                debtors.map((d) => (
                  <DebtorRow key={d.id} debtor={d} onSelect={onSelect} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  ยังไม่มีรายชื่อในกลุ่มนี้
                </p>
              )}
            </>
          )}

          {/* Tab: Guest Links */}
          {activeTab === "links" && (
            <div className="p-3 space-y-2">
              {loadingLinks && (
                <p className="text-xs text-muted-foreground text-center py-2">กำลังโหลด...</p>
              )}

              {!loadingLinks && guestLinks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  ยังไม่มี guest links (ต้องเพิ่มสมาชิกที่มีบัญชีในระบบ)
                </p>
              )}

              {guestLinks.length > 0 && (
                <>
                  {/* Copy all */}
                  <button
                    onClick={copyAllLinks}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-muted/40 rounded-lg py-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    คัดลอก link ทุกคน
                  </button>

                  {/* แต่ละคน */}
                  {guestLinks.map((link) => (
                    <div key={link.loan_id} className="flex items-center gap-2.5 bg-muted/30 rounded-xl px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {(link.borrower?.name ?? "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground leading-tight">
                          {link.borrower?.name ?? "ไม่ระบุ"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          ค้าง {fmt(parseFloat(link.remaining as any))}
                          {link.status === "settled" && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">· จ่ายแล้ว ✓</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => copyLink(link.loan_id, link.guest_link)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                          copiedMap[link.loan_id]
                            ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                            : "bg-foreground/8 text-foreground hover:bg-foreground/15"
                        )}
                      >
                        {copiedMap[link.loan_id] ? (
                          <><Check className="w-3 h-3" /> คัดลอกแล้ว</>
                        ) : (
                          <><Copy className="w-3 h-3" /> คัดลอก</>
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
