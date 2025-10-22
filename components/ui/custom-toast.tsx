"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function CustomToaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className={cn(
              "fixed top-6 left-1/2 -translate-x-1/2 w-[360px] md:w-[400px] z-[9999] rounded-none border shadow-lg",
              variant === "destructive"
                ? "bg-[#2A0000] border-[#FF3B3B] text-[#FF8A8A]"
                : "bg-[#121212] border-[#FCD404] text-white"
            )}
          >
            <div className="flex flex-col space-y-1 p-3">
              {title && <ToastTitle className="font-semibold text-yellow-400">{title}</ToastTitle>}
              {description && <ToastDescription className="text-sm text-gray-300">{description}</ToastDescription>}
            </div>

            {action}
            <ToastClose className="absolute right-2 top-2 text-gray-400 hover:text-white" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
