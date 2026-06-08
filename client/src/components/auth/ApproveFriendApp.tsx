import React, { useEffect, useState } from 'react';
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
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // Extract token from path: /approve-friend/:token
    const pathParts = window.location.pathname.split('/');
    const tokenFromPath = pathParts[pathParts.length - 1] || '';
    setToken(tokenFromPath);

    // Check query params for success=true or error=...
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setIsSuccess(true);
    }
    const err = urlParams.get('error');
    if (err === 'self_approval') {
      setErrorMsg(
        'คุณไม่สามารถอนุมัติตัวเองเป็นลูกหนี้ได้ เจ้าหนี้และลูกหนี้ต้องเป็นคนละคนกัน',
      );
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
        }
      })
      .catch((err) => {
        console.error(err);
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
      console.error(err);
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-muted-foreground text-xs font-medium">
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight">PingPay</h1>
        </div>

        <Card className="bg-card text-card-foreground rounded-2xl border-0 shadow-none">
          <CardHeader className="space-y-1.5 pt-6 pb-3 text-center">
            <div className="bg-destructive/10 text-destructive mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive text-lg font-semibold tracking-tight">
              ไม่สามารถอนุมัติตัวเองได้
            </CardTitle>
            <CardDescription className="text-muted-foreground mx-auto max-w-xs text-xs leading-normal">
              {errorMsg}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground px-6 py-4 text-center text-xs leading-relaxed">
            ระบบไม่อนุญาตให้เจ้าหนี้เพิ่มตัวเองเป็นลูกหนี้
            เจ้าหนี้และลูกหนี้ต้องเป็นคนละคนกันในระบบ PingPay เพื่อความโปร่งใส
          </CardContent>
          <CardFooter className="flex justify-center px-6 pt-2 pb-6">
            <Button
              className="h-10 w-full rounded-xl border-0 text-xs font-semibold shadow-none"
              variant="outline"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
            >
              กลับสู่หน้าหลัก
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight">PingPay</h1>
        </div>

        <Card className="bg-card text-card-foreground rounded-2xl border-0 shadow-none">
          <CardHeader className="space-y-1.5 pt-6 pb-2 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              เชื่อมต่อสำเร็จแล้ว!
            </CardTitle>
            <CardDescription className="text-muted-foreground mx-auto max-w-xs text-xs leading-normal">
              คุณ{' '}
              <span className="text-foreground font-semibold">
                {info?.member_name}
              </span>{' '}
              ได้เชื่อมต่อ LINE กับ{' '}
              <span className="text-foreground font-semibold">
                {info?.owner_name}
              </span>{' '}
              เรียบร้อยแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-4 text-center">
            <p className="text-muted-foreground text-xs leading-relaxed">
              บัญชี LINE ของคุณพร้อมใช้งานในระบบ <strong>PingPay</strong> แล้ว
              คุณจะได้รับข้อความแจ้งเตือนรายละเอียดการยืมเงินและลิงก์ตรวจสอบรายการผ่าน
              LINE ได้ทันที
            </p>
            <div className="flex gap-2.5 rounded-xl bg-emerald-500/5 p-3.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-left leading-normal font-medium">
                ขณะนี้คุณสามารถทำรายการยืมเงิน
                หรือให้เพื่อนเพิ่มหนี้ของคุณในระบบได้แล้ว
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center px-6 pt-2 pb-6">
            <Button
              className="h-10 w-full rounded-xl border-0 text-xs font-semibold shadow-none"
              variant="outline"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
            >
              เข้าสู่แดชบอร์ด
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight">PingPay</h1>
        </div>

        <Card className="bg-card text-card-foreground rounded-2xl border-0 shadow-none">
          <CardHeader className="space-y-1.5 pt-6 pb-3 text-center">
            <div className="bg-destructive/10 text-destructive mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive text-lg font-semibold tracking-tight">
              ไม่พบข้อมูลคำเชิญ
            </CardTitle>
            <CardDescription className="text-muted-foreground mx-auto max-w-xs text-sm leading-normal">
              ลิงก์นี้อาจหมดอายุ ถูกยกเลิก หรือไม่มีอยู่ในระบบแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground px-6 py-4 text-center text-xs leading-relaxed">
            โปรดติดต่อเจ้าหนี้ของคุณเพื่อขอรับลิงก์อนุมัติเชื่อมต่อ LINE
            ใหม่อีกครั้ง
          </CardContent>
          <CardFooter className="flex justify-center px-6 pt-2 pb-6">
            <Button
              className="h-10 w-full rounded-xl border-0 text-xs font-semibold shadow-none"
              variant="outline"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              กลับหน้าแรก
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-md duration-300">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">PingPay</h1>
      </div>

      <Card className="bg-card text-card-foreground rounded-2xl border-0 shadow-none">
        <CardHeader className="space-y-1.5 pt-6 pb-4 text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <UserCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">
            อนุมัติและเชื่อมต่อ LINE
          </CardTitle>
          <CardDescription className="text-muted-foreground mx-auto max-w-xs text-xs leading-normal">
            เพื่อรับการแจ้งเตือนและตรวจสอบรายการยืมเงินกับ{' '}
            <span className="text-foreground font-semibold">
              {info.owner_name}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-4">
          <div className="bg-muted/30 space-y-3 rounded-xl p-4">
            <div className="flex gap-3">
              <MessageSquare className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">
                  แจ้งเตือนอัตโนมัติผ่าน LINE
                </p>
                <p className="text-muted-foreground text-xs leading-normal">
                  ระบบจะส่งรายละเอียดการยืมเงิน ยอดชำระ
                  และหลักฐานสลิปเงินเข้าแชทไลน์โดยตรง
                </p>
              </div>
            </div>
            <div className="bg-muted-foreground/10 h-px" />
            <div className="flex gap-3">
              <CheckCircle2 className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">
                  ปลอดภัย และตรวจสอบได้
                </p>
                <p className="text-muted-foreground text-xs leading-normal">
                  คุณสามารถตรวจสอบรายการหนี้ทั้งหมด
                  และกดอนุมัติหรือแนบหลักฐานชำระเงินได้ด้วยตนเอง
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 pb-6">
          <Button
            onClick={handleApprove}
            disabled={connecting}
            className="h-10 w-full rounded-xl border-0 text-xs font-semibold shadow-none"
          >
            {connecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="border-primary-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                กำลังพาไป LINE Login...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                อนุมัติและเชื่อมต่อ LINE
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
          <p className="text-muted-foreground max-w-[280px] text-center text-[10px] leading-normal">
            การเชื่อมต่อจะบันทึกเฉพาะข้อมูลโปรไฟล์พื้นฐานและ LINE ID
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
    </>
  );
}
