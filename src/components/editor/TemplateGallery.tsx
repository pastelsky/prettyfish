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
          'text-ui-ink-strong',
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
                  ? 'bg-ui-surface-soft border-ui-border-soft hover:bg-ui-surface-hover hover:border-primary/30'
                  : 'bg-ui-surface-elevated border-ui-border-soft hover:border-primary/40 hover:bg-ui-surface-soft dark:bg-ui-surface-soft dark:border-ui-border-soft dark:hover:bg-ui-surface-hover dark:hover:border-primary/30',
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Icon */}
              <span className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                isDark
                  ? 'bg-ui-surface-hover group-hover:bg-primary/20 text-ui-ink-muted group-hover:text-primary dark:bg-ui-surface-hover dark:group-hover:bg-primary/20 dark:text-ui-ink-muted dark:group-hover:text-primary'
                  : 'bg-ui-surface-soft group-hover:bg-primary/10 text-ui-ink-muted group-hover:text-primary dark:bg-ui-surface-hover dark:group-hover:bg-primary/20 dark:text-ui-ink-muted dark:group-hover:text-primary',
              )}>
                <Icon className="w-5 h-5" />
              </span>

              {/* Text */}
              <div className="flex flex-col gap-0.5 min-w-0 w-full">
                <span className={cn(
                  'text-xs font-semibold leading-tight truncate',
                  'text-ui-ink-soft dark:text-ui-ink-strong',
                )}>
                  {tmpl.name}
                </span>
                <span className={cn(
                  'text-[10px] leading-tight',
                  'text-ui-ink-faint',
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
