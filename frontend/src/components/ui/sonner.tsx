import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/lib/theme'

// Bottom right, lifted over the zoom buttons of the canvas.
const OFFSET = { bottom: 108, right: 16 }

function Toaster(props: ToasterProps) {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      offset={OFFSET}
      mobileOffset={OFFSET}
      icons={{
        success: <CircleCheck className="text-sync-ok size-4" strokeWidth={1.75} />,
        info: <Info className="size-4" strokeWidth={1.75} />,
        warning: <TriangleAlert className="text-warning size-4" strokeWidth={1.75} />,
        error: <OctagonX className="text-destructive size-4" strokeWidth={1.75} />,
        loading: <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          fontFamily: 'var(--font-sans)',
        } as CSSProperties
      }
      // A modal dialog switches pointer events off for the rest of the page.
      toastOptions={{
        classNames: { toast: 'pointer-events-auto', description: 'whitespace-pre-line' },
      }}
      {...props}
    />
  )
}

export { Toaster }
