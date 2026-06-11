import { toast as sonnerToast } from "sonner"

const toastSurface = (token: '--success' | '--destructive', foreground: '--success-foreground' | '--destructive-foreground') => ({
  background: `hsl(var(${token}))`,
  color: `hsl(var(${foreground}))`,
})

export const toast = {
  success: (message: string) => sonnerToast.success(message, { 
    duration: 3000,
    style: toastSurface('--success', '--success-foreground'),
  }),
  error: (message: string, error?: unknown) => {
    sonnerToast.error(message, { 
      duration: 5000,
      style: toastSurface('--destructive', '--destructive-foreground'),
    })
    if (error) console.error(message, error)
  },
  info: (message: string) => sonnerToast(message, { duration: 3000 }),
  loading: (message: string) => sonnerToast.loading(message),
  promise: async <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => {
    return sonnerToast.promise(promise, messages)
  },
}
