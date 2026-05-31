import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

function AddFriendModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [lineId, setLineId] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setName(""); setLineId(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("กรุณาใส่ชื่อ"); return; }
    setLoading(true);
    try {
      await api.createMember({ name: name.trim(), line_id: lineId.trim() || undefined });
      toast.success("เพิ่มเพื่อนสำเร็จ");
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>เพิ่มเพื่อน</DialogTitle>
          <DialogDescription>กรอกชื่อและ LINE ID เพื่อเพิ่มเพื่อนในระบบ</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">ชื่อ *</p>
            <Input
              placeholder="เช่น สมชาย ใจดี"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">LINE ID (ไม่บังคับ)</p>
            <Input
              placeholder="เช่น somchai123"
              value={lineId}
              onChange={e => setLineId(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={handleClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "เพิ่มเพื่อน"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FriendsContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    api.getMembers()
      .then(setMembers)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); }, []);

  if (loading) return (
    <div className="space-y-3 p-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">เพื่อนทั้งหมด</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{members.length} คน</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          เพิ่มเพื่อน
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-medium text-foreground text-sm">ยังไม่มีเพื่อน</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-xs text-primary underline underline-offset-2"
          >
            เพิ่มเพื่อนคนแรก
          </button>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-2xl overflow-hidden">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
              <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-700 shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                {m.email && !m.email.startsWith("manual_") && (
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddFriendModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchMembers}
      />
    </div>
  );
}
