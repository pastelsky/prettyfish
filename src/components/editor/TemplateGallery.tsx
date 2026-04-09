import { cn } from '@/lib/utils'
import { captureEvent } from '@/lib/analytics'
import { FALLBACK_TEMPLATE_ICON, TEMPLATE_ICONS } from '@/components/editor/templateIcons'
import { DIAGRAM_TEMPLATES } from '@/lib/templates'
import type { AppMode } from '@/types'

interface TemplateGalleryProps {
  mode: AppMode
  onSelect: (code: string) => void
}

export function TemplateGallery({ mode, onSelect }: TemplateGalleryProps) {
  const isDark = mode === 'dark'

  return (
    <div data-testid="template-gallery" className="flex flex-col h-full overflow-y-auto p-5 gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className={cn(
          'text-xl font-semibold tracking-tight',
          isDark ? 'text-zinc-100' : 'text-zinc-800',
        )}>
          Choose a diagram type
        </h2>
      </div>

      {/* Grid */}
        <div className="grid grid-cols-2 gap-2">
          {DIAGRAM_TEMPLATES.map((tmpl, i) => {
          const Icon = TEMPLATE_ICONS[tmpl.id] ?? FALLBACK_TEMPLATE_ICON
          return (
            <button
              key={tmpl.id}
              data-testid="template-card"
              data-template-id={tmpl.id}
              data-template-name={tmpl.name}
              onClick={() => { captureEvent('template_selected', { template_id: tmpl.id, template_name: tmpl.name }); onSelect(tmpl.code) }}
              className={cn(
                'group flex flex-col items-start gap-2.5 p-3 rounded-lg border text-left',
                'transition-all duration-200 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDark
                  ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-primary/30'
                  : 'bg-white/60 border-zinc-200/80 hover:border-primary/40 hover:bg-white',
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Icon */}
              <span className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                isDark
                  ? 'bg-white/[0.06] group-hover:bg-primary/20 text-zinc-400 group-hover:text-primary'
                  : 'bg-zinc-100 group-hover:bg-primary/10 text-zinc-500 group-hover:text-primary',
              )}>
                <Icon className="w-5 h-5" />
              </span>

              {/* Text */}
              <div className="flex flex-col gap-0.5 min-w-0 w-full">
                <span className={cn(
                  'text-xs font-semibold leading-tight truncate',
                  isDark ? 'text-zinc-200' : 'text-zinc-700',
                )}>
                  {tmpl.name}
                </span>
                <span className={cn(
                  'text-[10px] leading-tight',
                  isDark ? 'text-zinc-600' : 'text-zinc-400',
                )}>
                  {tmpl.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
