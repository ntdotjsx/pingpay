import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '';

function ApproveFriendAppInner() {
  const [token, setToken] = useState<string>('');
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
    const pathParts = window.location.pathname.split('/');
    const tokenFromPath = pathParts[pathParts.length - 1] || '';
    setToken(tokenFromPath);

    // Check query params for success=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setIsSuccess(true);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/approve-friend/${token}/info`)
      .then((res) => {
        if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลคำเชิญได้');
        return res.json();
      })
      .then((res) => {
        if (res.success) {
          setInfo(res.data);
          if (res.data.status === 'approved') {
            setIsSuccess(true);
          }
        } else {
          toast.error(res.message || 'เกิดข้อผิดพลาด');
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message || 'ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleApprove = async () => {
    setConnecting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/auth/line/approve-friend?token=${token}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'ไม่สามารถดึงลิงก์ LINE login ได้');
      }
      const data = await res.json();
      if (data.url) {
        // Redirect to LINE Auth
        window.location.href = data.url;
      } else {
        throw new Error('ไม่พบ URL สำหรับการเชื่อมต่อ');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="relative h-16 w-16">
          <div className="border-primary/20 absolute top-0 left-0 h-full w-full rounded-full border-4"></div>
          <div className="border-primary absolute top-0 left-0 h-full w-full animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
        <p className="text-muted-foreground animate-pulse text-sm font-medium">
          กำลังโหลดข้อมูลคำเชิญ...
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
        <Card className="bg-background/80 relative overflow-hidden border-emerald-500/20 shadow-xl backdrop-blur-md">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardHeader className="pt-8 pb-2 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
              <ShieldCheck className="h-10 w-10 animate-bounce text-emerald-500" />
            </div>
            <CardTitle className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-2xl font-bold text-transparent">
              อนุมัติการเชื่อมต่อสำเร็จ!
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm">
              คุณ {info?.member_name} ได้เชื่อมต่อ LINE กับ {info?.owner_name}{' '}
              เรียบร้อยแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-4 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              ยินดีด้วย! บัญชี LINE ของคุณได้รับการเชื่อมต่อเข้ากับระบบทวงเงิน{' '}
              <strong>PingPay</strong> แล้ว
              คุณจะได้รับข้อความแจ้งเตือนรายละเอียดการยืมเงิน หลักฐาน
              และสามารถแจ้งชำระผ่านช่องทาง LINE ได้โดยตรง
              ซึ่งช่วยเพิ่มความแฟร์และชัดเจนกับทุกฝ่าย
            </p>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>
                ตอนนี้คุณสามารถแจ้งยืมเงิน
                หรือเจ้าหนี้เพิ่มรายการหนี้กับคุณได้แล้ว
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-2 pb-8">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/5 font-medium text-emerald-600 dark:text-emerald-400"
            >
              สถานะ: เชื่อมต่อ LINE สำเร็จ
            </Badge>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
        <Card className="border-destructive/20 bg-background/80 relative overflow-hidden shadow-xl backdrop-blur-md">
          <div className="bg-destructive absolute top-0 left-0 h-1.5 w-full" />
          <CardHeader className="pt-8 pb-2 text-center">
            <div className="bg-destructive/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-8 w-8" />
            </div>
            <CardTitle className="text-destructive text-xl font-bold">
              ไม่สามารถดึงข้อมูลคำเชิญได้
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm">
              ลิงก์นี้อาจหมดอายุ ถูกยกเลิก หรือไม่มีอยู่ในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground px-6 py-4 text-center text-sm">
            โปรดติดต่อเจ้าหนี้ของคุณเพื่อขอรับลิงก์อนุมัติเชื่อมต่อ LINE
            ใหม่อีกครั้ง
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
      <Card className="border-border bg-background/80 relative overflow-hidden shadow-xl backdrop-blur-md">
        <div className="from-primary absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r to-violet-500" />
        <CardHeader className="pt-8 pb-4 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <UserCheck className="text-primary h-9 w-9" />
          </div>
          <CardTitle className="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent">
            อนุมัติและเชื่อมต่อ LINE
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-sm">
            <strong>คุณ {info.owner_name}</strong> เชิญให้คุณเชื่อมต่อ LINE บน
            PingPay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="border-muted bg-muted/20 space-y-3 rounded-2xl border p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-green-500/10 p-1.5">
                <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-foreground text-xs font-semibold">
                  แจ้งเตือนผ่านไลน์
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  เมื่อมีการเพิ่มรายการ ยืนยันชำระเงิน หรือยอดใกล้ครบกำหนด
                  ระบบจะส่งแชทไลน์แจ้งเตือนคุณอัตโนมัติ
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-blue-500/10 p-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-foreground text-xs font-semibold">
                  อนุมัติก่อนยืม
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  คุณต้องกดยอมรับ/อนุมัติทุกรายการที่เจ้าหนี้เพิ่มเข้ามาด้วยตนเองเพื่อความชัดเจน
                  แฟร และตรวจสอบได้
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 pt-4 pb-8">
          <Button
            onClick={handleApprove}
            disabled={connecting}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-medium text-white shadow-md shadow-emerald-500/10 transition-all duration-200 hover:from-emerald-600 hover:to-green-700"
          >
            {connecting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                กำลังเปิด LINE Login...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                เชื่อมต่อ LINE และเริ่มอนุมัติ{' '}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
          <p className="text-muted-foreground text-center text-[10px]">
            การเชื่อมต่อจะบันทึกเพียงข้อมูลโปรไฟล์พื้นฐานและ LINE ID
            เพื่อส่งข้อความทวงเท่านั้น
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export function ApproveFriendApp() {
  return (
    <>
      <ApproveFriendAppInner />
      <Toaster />
    </>
  );
}
