"use client";

import { useToast } from "@/hooks/use-toast";

interface SafeAlertOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

/**
 * Safe alert function that prevents XSS by using toast notifications
 * instead of browser alerts
 */
export function useSafeAlert() {
  const { toast } = useToast();

  const safeAlert = ({ title, description, variant = "default" }: SafeAlertOptions) => {
    // Sanitize any HTML/script tags from the input
    const sanitizeText = (text: string) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    toast({
      title: sanitizeText(title),
      description: description ? sanitizeText(description) : undefined,
      variant,
    });
  };

  return { safeAlert };
}