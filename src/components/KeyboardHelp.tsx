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
const BrowserMod = 'Ctrl'
const Shift = '⇧'

interface ShortcutRow { keys: string[]; description: string }
interface ShortcutSection { title: string; shortcuts: ShortcutRow[] }

const SECTIONS: ShortcutSection[] = [
  {
    title: 'Canvas',
    shortcuts: [
      { keys: ['Scroll'], description: 'Zoom' },
      { keys: ['Drag'], description: 'Pan canvas' },
      { keys: ['Click'], description: 'Select diagram' },
      { keys: ['Click name'], description: 'Rename diagram' },
    ],
  },
  {
    title: 'Diagrams',
    shortcuts: [
      { keys: [BrowserMod, 'T'], description: 'New diagram' },
      { keys: [Mod, 'C'], description: 'Copy selected diagram' },
      { keys: [Mod, 'V'], description: 'Paste duplicated diagram' },
      { keys: ['⌫'], description: 'Delete selected diagram' },
    ],
  },
  {
    title: 'Pages',
    shortcuts: [
      { keys: [BrowserMod, Shift, 'T'], description: 'New page' },
      { keys: [BrowserMod, Shift, ']'], description: 'Next page' },
      { keys: [BrowserMod, Shift, '['], description: 'Previous page' },
    ],
  },
  {
    title: 'Panels',
    shortcuts: [
      { keys: [Mod, '\\'], description: 'Toggle editor sidebar' },
      { keys: [BrowserMod, Shift, 'R'], description: 'Toggle reference docs' },
      { keys: [Mod, '/'], description: 'Focus editor' },
      { keys: ['Esc'], description: 'Blur / dismiss' },
    ],
  },
  {
    title: 'File & Actions',
    shortcuts: [
      { keys: [Mod, 'Z'], description: 'Undo canvas/page operation' },
      { keys: [Mod, Shift, 'Z'], description: 'Redo canvas/page operation' },
      { keys: [BrowserMod, 'S'], description: 'Save project' },
      { keys: [BrowserMod, 'O'], description: 'Open project' },
      { keys: [BrowserMod, Shift, 'D'], description: 'Toggle dark mode' },
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
              {isMac ? 'macOS mixed' : 'Win/Linux'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-1">
          {isMac && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Standard editing uses ⌘. Browser-conflicting actions use Ctrl.
            </p>
          )}
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
