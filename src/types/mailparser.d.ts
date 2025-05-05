import type { Attachment } from "mailparser";

declare module 'mailparser' {
  export interface ParsedMail {
    attachments: Attachment;
    subject?: string | null;
    from?: {
      text?: string | null;
    } | null;
    text?: string | null;
    html?: string | null;
    date?: Date | null;
  }

  export function simpleParser(source: Buffer): Promise<ParsedMail>;
}