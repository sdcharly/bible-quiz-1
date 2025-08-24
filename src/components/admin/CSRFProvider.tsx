"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface CSRFContextType {
  csrfToken: string | null;
  getHeaders: () => HeadersInit;
}

const CSRFContext = createContext<CSRFContextType>({
  csrfToken: null,
  getHeaders: () => ({}),
});

export function useCSRF() {
  return useContext(CSRFContext);
}

export function CSRFProvider({ 
  children,
  initialToken 
}: { 
  children: React.ReactNode;
  initialToken?: string;
}) {
  const [csrfToken, setCSRFToken] = useState<string | null>(initialToken || null);

  useEffect(() => {
    // Fetch CSRF token if not provided
    if (!csrfToken) {
      fetch("/api/admin/csrf")
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            setCSRFToken(data.token);
          }
        })
        .catch(console.error);
    }
  }, [csrfToken]);

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
    
    return headers;
  };

  return (
    <CSRFContext.Provider value={{ csrfToken, getHeaders }}>
      {children}
    </CSRFContext.Provider>
  );
}