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
    src: "https://static2.wongnai.com/static2/images/2FZ8pLK.png",
    alt: "WONGNAI Logo",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg",
    alt: "LINE Logo",
  },
  {
    src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgkviHHlHzJQAdJKm7k4mtxcC-AiNdW1_hUA&s",
    alt: "ป้านวล Logo",
  },
  {
    src: "https://tipmse.fti.or.th/wp-content/uploads/2024/12/kbank-01.jpg",
    alt: "Kbank Logo",
  },
  {
    src: "https://miro.medium.com/1*nueyBV0RNEpETYMKpsYWhA.png",
    alt: "... Logo",
  },
  {
    src: "https://www.thaipr.net/wp-content/uploads/2022/12/LOGO-e1671413476934.jpg",
    alt: "thaipr Logo",
  },
  {
    src: "https://framerusercontent.com/images/kslpXI1wjc5mQ5SO4CNQt1LY8.png?width=3348&height=1152",
    alt: "... Logo",
  },
];
