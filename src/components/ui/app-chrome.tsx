/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
