"use client";

import * as React from "react";
import type { MailContextType } from "./types";

const MailContext = React.createContext<MailContextType | undefined>(undefined);

export function MailProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<string | null>(null);

  const setMail = React.useCallback((mail: { selected: string | null }) => {
    setSelected(mail.selected);
  }, []);

  return (
    <MailContext.Provider value={{ selected, setMail }}>
      {children}
    </MailContext.Provider>
  );
}

export function useMail() {
  const context = React.useContext(MailContext);
  if (context === undefined) {
    throw new Error("useMail must be used within a MailProvider");
  }
  return [context.selected, context.setMail] as const;
}