import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface KeyboardHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const Mod = isMac ? '⌘' : 'Ctrl'
const Shift = '⇧'
const _Alt = isMac ? '⌥' : 'Alt'
const Tab = 'Tab'

interface ShortcutRow {
  keys: string[]
  description: string
}

interface ShortcutSection {
  title: string
  shortcuts: ShortcutRow[]
}

const SECTIONS: ShortcutSection[] = [
  {
    title: 'Canvas',
    shortcuts: [
      { keys: [Mod, '+'], description: 'Zoom in' },
      { keys: [Mod, '-'], description: 'Zoom out' },
      { keys: [Mod, '0'], description: 'Fit to screen' },
      { keys: ['Drag'], description: 'Pan canvas' },
      { keys: ['Scroll'], description: 'Zoom' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: [Mod, '\\'], description: 'Toggle sidebar' },
      { keys: [Mod, '/'], description: 'Focus editor' },
      { keys: ['Esc'], description: 'Blur / dismiss' },
    ],
  },
  {
    title: 'Pages',
    shortcuts: [
      { keys: [Mod, 'T'], description: 'New diagram' },
      { keys: [Mod, Shift, ']'], description: 'Next tab' },
      { keys: [Mod, Shift, '['], description: 'Previous tab' },
      { keys: [Mod, Tab], description: 'Next (alt)' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: [Mod, Shift, 'S'], description: 'Export' },
      { keys: [Mod, Shift, 'D'], description: 'Toggle theme' },
      { keys: ['?'], description: 'This dialog' },
    ],
  },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center px-1.5 py-0.5 rounded-md',
      'border border-border/60 bg-muted/50 text-muted-foreground',
      'font-mono text-[11px] min-w-[18px] font-medium',
    )}>
      {children}
    </kbd>
  )
}

export function KeyboardHelp({ open, onOpenChange }: KeyboardHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif italic">
            Shortcuts
            <Badge variant="secondary" className="text-[10px] font-mono font-normal">
              {isMac ? 'macOS' : 'Win/Linux'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-1">
          {SECTIONS.map((section, si) => (
            <div key={section.title}>
              {si > 0 && <div className="h-px bg-border/30 mb-4" />}
              <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-2">
                {section.title}
              </h3>
              <div className="flex flex-col gap-1.5">
                {section.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-foreground/80">{s.description}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && <span className="text-muted-foreground/40 text-[10px]">+</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// suppress unused
void _Alt
