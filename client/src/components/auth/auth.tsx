"use client";

import { Logo } from "@/components/landing/logo";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { AuthDivider } from "@/components/ui/auth-divider";
import { FloatingPaths } from "./floating-paths";
import { ChevronLeftIcon, AtSignIcon, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function AuthPage() {
  const [lineLoading, setLineLoading] = useState(false);

  async function handleLineLogin() {
    setLineLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/line");
      const data = await res.json();
      window.location.href = data.url; // redirect ไป LINE
    } catch (err) {
      console.error("LINE login error:", err);
      setLineLoading(false);
    }
  }

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-[2fr_5fr]">
      {/* Left Panel */}
      <div className="relative hidden h-full flex-col border-r bg-secondary/60 rounded-r-3xl p-10 lg:flex dark:bg-secondary/10">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/80 rounded-r-3xl" />
        <Logo className="mr-auto h-4.5 opacity-80" />
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative flex min-h-screen flex-col justify-center px-8">
        {/* Soft background shades */}
        <div
          aria-hidden
          className="absolute inset-0 isolate -z-10 opacity-40 contain-strict"
        >
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.04)_0,hsla(0,0%,55%,.01)_50%,transparent_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.03)_0,transparent_100%)] [translate:5%_-50%]" />
        </div>

        <Button
          asChild
          className="absolute top-7 left-5 text-muted-foreground hover:text-foreground"
          variant="ghost"
          size="sm"
        >
          <a href="/">
            <ChevronLeftIcon data-icon="inline-start" />
            Home
          </a>
        </Button>

        <div className="mx-auto w-full space-y-5 sm:w-sm">
          <Logo className="h-4.5 lg:hidden opacity-80" />

          {/* Heading */}
          <div className="flex flex-col space-y-1.5">
            <h1 className="font-semibold text-xl tracking-tight text-foreground/90">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="text-sm text-muted-foreground/80">
              เข้าสู่ระบบบัญชีของคุณหรือสร้างบัญชีใหม่
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={handleLineLogin}
              disabled={lineLoading}
            >
              {lineLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="size-4">
                  <path d="M375 260.8L375 342.1C375 344.2 373.4 345.8 371.3 345.8L358.3 345.8C357 345.8 355.9 345.1 355.3 344.3L318 294L318 342.2C318 344.3 316.4 345.9 314.3 345.9L301.3 345.9C299.2 345.9 297.6 344.3 297.6 342.2L297.6 260.9C297.6 258.8 299.2 257.2 301.3 257.2L314.2 257.2C315.3 257.2 316.6 257.8 317.2 258.8L354.5 309.1L354.5 260.9C354.5 258.8 356.1 257.2 358.2 257.2L371.2 257.2C373.3 257.1 375 258.8 375 260.7L375 260.8zM281.3 257.1L268.3 257.1C266.2 257.1 264.6 258.7 264.6 260.8L264.6 342.1C264.6 344.2 266.2 345.8 268.3 345.8L281.3 345.8C283.4 345.8 285 344.2 285 342.1L285 260.8C285 258.9 283.4 257.1 281.3 257.1zM249.9 325.2L214.3 325.2L214.3 260.8C214.3 258.7 212.7 257.1 210.6 257.1L197.6 257.1C195.5 257.1 193.9 258.7 193.9 260.8L193.9 342.1C193.9 343.1 194.2 343.9 194.9 344.6C195.6 345.2 196.4 345.6 197.4 345.6L249.6 345.6C251.7 345.6 253.3 344 253.3 341.9L253.3 328.9C253.3 327 251.7 325.2 249.8 325.2L249.9 325.2zM443.6 257.1L391.3 257.1C389.4 257.1 387.6 258.7 387.6 260.8L387.6 342.1C387.6 344 389.2 345.8 391.3 345.8L443.5 345.8C445.6 345.8 447.2 344.2 447.2 342.1L447.2 329C447.2 326.9 445.6 325.3 443.5 325.3L408 325.3L408 311.7L443.5 311.7C445.6 311.7 447.2 310.1 447.2 308L447.2 294.9C447.2 292.8 445.6 291.2 443.5 291.2L408 291.2L408 277.5L443.5 277.5C445.6 277.5 447.2 275.9 447.2 273.8L447.2 260.8C447.1 258.9 445.5 257.1 443.5 257.1L443.6 257.1zM576 157.4L576 483.4C575.9 534.6 533.9 576.1 482.6 576L156.6 576C105.4 575.9 63.9 533.8 64 482.6L64 156.6C64.1 105.4 106.2 63.9 157.4 64L483.4 64C534.6 64.1 576.1 106.1 576 157.4zM505.6 297.5C505.6 214.1 421.9 146.2 319.2 146.2C216.5 146.2 132.8 214.1 132.8 297.5C132.8 372.2 199.1 434.9 288.7 446.8C310.5 451.5 308 459.5 303.1 488.9C302.3 493.6 299.3 507.3 319.2 499C339.1 490.7 426.5 435.8 465.7 390.8C492.7 361.1 505.6 331 505.6 297.7L505.6 297.5z"/>
                </svg>
              )}
              Continue with LINE
            </Button>
          </div>

          {/* Terms */}
          <p className="text-muted-foreground/60 text-xs leading-relaxed">
            By continuing, you agree to our{" "}
            <a
              className="underline underline-offset-4 hover:text-primary"
              href="#"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="underline underline-offset-4 hover:text-primary"
              href="#"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}