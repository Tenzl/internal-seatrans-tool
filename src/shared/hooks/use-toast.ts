'use client'

/**
 * Compatibility shim: the legacy app used a Radix-based `useToast()` hook.
 * dashboard_admin uses `sonner`, so this re-implements the same surface
 * (`toast({ title, description, variant })`) on top of sonner.
 */
import { type ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

type ToastInput = {
  title?: ReactNode
  description?: ReactNode
  variant?: 'default' | 'destructive' | string
}

function showToast({ title, description, variant }: ToastInput) {
  const message = (title ?? description ?? '') as ReactNode
  const options =
    title && description ? { description: description as ReactNode } : undefined
  if (variant === 'destructive') {
    return sonnerToast.error(message as string, options)
  }
  return sonnerToast(message as string, options)
}

export function toast(input: ToastInput) {
  const id = showToast(input)
  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (next: ToastInput) => showToast(next),
  }
}

export function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    toasts: [] as unknown[],
  }
}
