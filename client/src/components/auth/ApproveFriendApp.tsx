import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

export function ApproveFriendApp() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [info, setInfo] = useState<{
    owner_name: string;
    member_name: string;
    status: string;
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);

  useEffect(() => {
    // Extract token from path: /approve-friend/:token
    const pathParts = window.location.pathname.split("/");
    const tokenFromPath = pathParts[pathParts.length - 1] || "";
    setToken(tokenFromPath);

    // Check query params for success=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true") {
      setIsSuccess(true);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/approve-friend/${token}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลคำเชิญได้");
        return res.json();
      })
      .then((res) => {
        if (res.success) {
          setInfo(res.data);
          if (res.data.status === "approved") {
            setIsSuccess(true);
          }
        } else {
          toast.error(res.message || "เกิดข้อผิดพลาด");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message || "ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleApprove = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/line/approve-friend?token=${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "ไม่สามารถดึงลิงก์ LINE login ได้");
      }
      const data = await res.json();
      if (data.url) {
        // Redirect to LINE Auth
        window.location.href = data.url;
      } else {
        throw new Error("ไม่พบ URL สำหรับการเชื่อมต่อ");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ LINE");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-medium">กำลังโหลดข้อมูลคำเชิญ...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Card className="border-emerald-500/20 bg-background/80 backdrop-blur-md shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
              <ShieldCheck className="h-10 w-10 text-emerald-500 animate-bounce" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              อนุมัติการเชื่อมต่อสำเร็จ!
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              คุณ {info?.member_name} ได้เชื่อมต่อ LINE กับ {info?.owner_name} เรียบร้อยแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center px-6 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ยินดีด้วย! บัญชี LINE ของคุณได้รับการเชื่อมต่อเข้ากับระบบทวงเงิน <strong>PingPay</strong> แล้ว 
              คุณจะได้รับข้อความแจ้งเตือนรายละเอียดการยืมเงิน หลักฐาน และสามารถแจ้งชำระผ่านช่องทาง LINE ได้โดยตรง 
              ซึ่งช่วยเพิ่มความแฟร์และชัดเจนกับทุกฝ่าย
            </p>
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>ตอนนี้คุณสามารถแจ้งยืมเงิน หรือเจ้าหนี้เพิ่มรายการหนี้กับคุณได้แล้ว</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-8 pt-2">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-medium">
              สถานะ: เชื่อมต่อ LINE สำเร็จ
            </Badge>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Card className="border-destructive/20 bg-background/80 backdrop-blur-md shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              ไม่สามารถดึงข้อมูลคำเชิญได้
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              ลิงก์นี้อาจหมดอายุ ถูกยกเลิก หรือไม่มีอยู่ในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-4 px-6 text-sm text-muted-foreground">
            โปรดติดต่อเจ้าหนี้ของคุณเพื่อขอรับลิงก์อนุมัติเชื่อมต่อ LINE ใหม่อีกครั้ง
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Card className="border-border bg-background/80 backdrop-blur-md shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-violet-500" />
        <CardHeader className="pb-4 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-9 w-9 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            อนุมัติและเชื่อมต่อ LINE
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            <strong>คุณ {info.owner_name}</strong> เชิญให้คุณเชื่อมต่อ LINE บน PingPay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="p-4 rounded-2xl border border-muted bg-muted/20 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-green-500/10 p-1.5">
                <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">แจ้งเตือนผ่านไลน์</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เมื่อมีการเพิ่มรายการ ยืนยันชำระเงิน หรือยอดใกล้ครบกำหนด ระบบจะส่งแชทไลน์แจ้งเตือนคุณอัตโนมัติ
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-blue-500/10 p-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">อนุมัติก่อนยืม</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  คุณต้องกดยอมรับ/อนุมัติทุกรายการที่เจ้าหนี้เพิ่มเข้ามาด้วยตนเองเพื่อความชัดเจน แฟร และตรวจสอบได้
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 pb-8 pt-4">
          <Button
            onClick={handleApprove}
            disabled={connecting}
            className="w-full h-11 text-sm bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium shadow-md shadow-emerald-500/10 rounded-xl transition-all duration-200"
          >
            {connecting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                กำลังเปิด LINE Login...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                เชื่อมต่อ LINE และเริ่มอนุมัติ <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            การเชื่อมต่อจะบันทึกเพียงข้อมูลโปรไฟล์พื้นฐานและ LINE ID เพื่อส่งข้อความทวงเท่านั้น
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
