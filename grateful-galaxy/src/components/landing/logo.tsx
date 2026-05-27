export const LogoIcon = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="40" height="40" rx="10" fill="#111827"/>
    <rect x="8" y="8" width="10" height="10" rx="2" fill="white"/>
    <rect x="22" y="8" width="10" height="10" rx="2" fill="white"/>
    <rect x="8" y="22" width="10" height="10" rx="2" fill="white" opacity="0.35"/>
    <rect x="22" y="22" width="10" height="10" rx="2" fill="white"/>
    <rect x="14" y="14" width="12" height="12" rx="2" fill="#111827"/>
    <rect x="16" y="16" width="8" height="8" rx="1.5" fill="#FFF200"/>
  </svg>
);

export const Logo = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 130 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="0" y="2" width="9" height="9" rx="2" fill="currentColor"/>
    <rect x="11" y="2" width="9" height="9" rx="2" fill="currentColor"/>
    <rect x="0" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.3"/>
    <rect x="11" y="13" width="9" height="9" rx="2" fill="currentColor"/>
    <rect x="5.5" y="7.5" width="9" height="9" rx="1.5" fill="white"/>
    <rect x="7" y="9" width="6" height="6" rx="1" fill="#FFF200"/>
    <text x="30" y="17"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="15" font-weight="700" letter-spacing="1.5"
      fill="currentColor">PINGPAY</text>
  </svg>
);