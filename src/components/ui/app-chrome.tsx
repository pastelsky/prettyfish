/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ChromeMode = 'light' | 'dark'

export function chromePillClass(): string {
  return cn(
    'pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-xl border backdrop-blur-md shadow-sm',
    'bg-background/88 border-primary/12 supports-[backdrop-filter]:bg-background/72',
    'dark:bg-background/82 dark:border-primary/18 dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
  )
}

export function chromeDividerClass(): string {
  return 'w-px h-4 mx-0.5 shrink-0 bg-black/10 dark:bg-white/10'
}

export function chromeIconButtonClass(): string {
  return cn(
    'rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-black/5',
    'dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/8',
  )
}

export function chromeActiveIconButtonClass(): string {
  return cn(
    chromeIconButtonClass(),
    'bg-black/5 text-zinc-900 dark:bg-white/8 dark:text-zinc-100',
  )
}

export function chromeTextButtonClass(): string {
  return cn(
    'h-6 px-2 text-xs gap-1 rounded-lg font-medium text-zinc-600 hover:text-zinc-900 hover:bg-black/5',
    'dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/8',
  )
}

export function chromePopoverClass(): string {
  return 'rounded-xl border bg-white border-black/10 dark:bg-[oklch(0.17_0.018_260)] dark:border-white/12'
}

export function chromeGlassPanelClass(mode: ChromeMode): string {
  return cn(
    'rounded-xl border backdrop-blur-xl',
    mode === 'dark'
      ? 'bg-[oklch(0.16_0.015_280/.76)] border-white/8 [box-shadow:0_4px_24px_rgba(0,0,0,0.35)]'
      : 'bg-white/76 border-black/6 [box-shadow:0_4px_24px_rgba(0,0,0,0.08)]',
  )
}

export function chromeFloatingActionClass(mode: ChromeMode): string {
  return cn(
    'rounded-xl border backdrop-blur-[6px] shadow-lg transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.985]',
    mode === 'dark'
      ? 'bg-[oklch(0.16_0.015_260)]/70 border-white/10 text-zinc-100 hover:bg-[oklch(0.19_0.015_260)]/82 hover:border-white/16 hover:text-zinc-100 active:bg-[oklch(0.21_0.018_260)]/86'
      : 'bg-background/82 border-border text-foreground ring-1 ring-border/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:bg-background hover:border-border hover:text-foreground active:bg-background/95',
  )
}

export function chromeMenuItemClass(mode: ChromeMode, options?: { active?: boolean; danger?: boolean; muted?: boolean }): string {
  if (options?.danger) {
    return cn(
      'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors',
      mode === 'dark'
        ? 'text-red-300 hover:bg-red-500/10'
        : 'text-red-600 hover:bg-red-50',
    )
  }

  if (options?.active) {
    return cn(
      'transition-colors',
      mode === 'dark' ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary',
    )
  }

  if (options?.muted) {
    return cn(
      'transition-colors',
      mode === 'dark'
        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-white/6'
        : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/4',
    )
  }

  return cn(
    'transition-colors',
    mode === 'dark'
      ? 'text-zinc-100 hover:bg-white/6'
      : 'text-zinc-700 hover:bg-black/4',
  )
}

type ButtonProps = React.ComponentProps<typeof Button>

interface ChromeIconButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  active?: boolean
}

export function ChromeIconButton({ active = false, className, ...props }: ChromeIconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(active ? chromeActiveIconButtonClass() : chromeIconButtonClass(), className)}
      {...props}
    />
  )
}

type ChromeTextButtonProps = Omit<ButtonProps, 'variant' | 'size'>

export function ChromeTextButton({ className, ...props }: ChromeTextButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(chromeTextButtonClass(), className)}
      {...props}
    />
  )
}
