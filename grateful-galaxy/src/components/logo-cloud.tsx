"use client";

import { InfiniteSlider } from "@/components/ui/infinite-slider";

export function LogoCloud() {
  return (
    <div
      className="overflow-hidden py-4"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
      }}
    >
      <InfiniteSlider gap={40} speed={60} speedOnHover={20}>
        {logos.map((logo) => (
          <img
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            loading="lazy"
            className="pointer-events-none max-h-6 w-auto object-contain opacity-80 dark:invert"
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}

const logos = [
  {
    src: "https://storage.efferd.com/logo/nvidia-wordmark.svg",
    alt: "ZRAWHOUSE",
  },
  {
    src: "https://storage.efferd.com/logo/supabase-wordmark.svg",
    alt: "Supabase Logo",
  },
];
