declare module 'mailparser' {
  export interface ParsedMail {
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