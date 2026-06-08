import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  let theme: ToasterProps['theme'] = 'system';
  try {
    const themeContext = useTheme();
    if (themeContext && themeContext.theme) {
      theme = themeContext.theme as ToasterProps['theme'];
    }
  } catch (e) {
    // Ignore error if useTheme is used outside of ThemeProvider
  }

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4 text-emerald-500" />,
        info: <Info className="size-4 text-blue-500" />,
        warning: <AlertTriangle className="size-4 text-amber-500" />,
        error: <XCircle className="text-destructive size-4" />,
        loading: (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
