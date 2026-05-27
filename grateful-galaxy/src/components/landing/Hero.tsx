import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// import { ArrowRightIcon, PhoneCallIcon } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden pt-16">
      {/* Shades */}
      <div
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-hidden"
      >
        <div
          className={cn(
            "absolute inset-0 isolate -z-10",
            "bg-[radial-gradient(20%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]",
          )}
        />
      </div>
      <div className="relative z-10 flex max-w-2xl flex-col gap-5 px-4 mt-20">
        <h1
          className={cn(
            "text-balance font-medium text-4xl text-foreground leading-tight md:text-5xl",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out",
          )}
        >
          Built to End “เดี๋ยวโอนให้”
        </h1>

        <p
          className={cn(
            "text-muted-foreground text-sm tracking-wider sm:text-lg md:text-xl",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out",
          )}
        >
          เนื่องจากว่าเพื่อนในกลุ่มเรานั้น มีการยืมเงินกันบ่อยๆ
          แล้วเกิดเหตุการณ์ลืมว่าเคยยืมเงิน หรือ ยืมไปกี่บาท
          <br />
          จึงได้สร้างโปรเจคนี้ขึ้นมาเพื่อย้ำเตือน
        </p>

        <div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
          <Button variant="outline">
            {/* <PhoneCallIcon data-icon="inline-start" />{" "} */}
            Book a Call
          </Button>
          <Button>
            Get started {/* <ArrowRightIcon data-icon="inline-end" /> */}
          </Button>
        </div>
      </div>
      <div className="relative">
        <div
          className={cn(
            "absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-120 rounded-full",
            "bg-[radial-gradient(ellipse_at_center,theme(--color-foreground/.1),transparent,transparent)]",
            "blur-[50px]",
          )}
        />
        <div
          className={cn(
            "mask-b-from-60% relative mt-8 -mr-56 overflow-hidden px-2 sm:mt-12 sm:mr-0 md:mt-20",
            "fade-in slide-in-from-bottom-5 animate-in fill-mode-backwards delay-100 duration-1000 ease-out",
          )}
        >
          <div className="relative inset-shadow-2xs inset-shadow-foreground/10 mx-auto max-w-5xl overflow-hidden rounded-lg border bg-background p-2 shadow-xl ring-1 ring-card dark:inset-shadow-foreground/20 dark:inset-shadow-xs">
            <img
              alt="app screen"
              className="z-2 aspect-video rounded-lg border"
              height="1080"
              src="https://easysunday.com/blog/wp-content/uploads/2024/06/how-to-ask-for-money-back-from-friends.webp"
              width="1920"
            />
            {/* <img
              alt="app screen"
              className="hidden aspect-video rounded-lg bg-background dark:block"
              height="1080"
              src="https://storage.efferd.com/screen/dashboard-dark.webp"
              width="1920"
            /> */}
          </div>
        </div>
      </div>
    </section>
  );
}
