export interface MessagePartHeader {
  name?: string | null;
  value?: string | null;
}

export interface MessagePartBody {
  data?: string | null;
}

export interface MessagePart {
  headers?: MessagePartHeader[];
  body?: MessagePartBody;
  parts?: MessagePart[];
}

export interface GmailMessage {
  id: string;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: MessagePart | null;
  labelIds?: string[] | null;
  htmlUrl?: string | null;
  text?: string | null;
}

export interface Mail {
  id: string;
  name: string;
  email: string;
  subject: string;
  text: string;
  date: string;
  snippet: string;
  internalDate: string;
  from: string;
  payload: MessagePart | null;
  labelIds?: string[];
  labels: string[];
  read: boolean;
  htmlUrl: string | null;
  threadId: string | null;
}

export interface MailState {
  selected: string | null;
}

export interface MailContextType {
  selected: string | null;
  setMail: (mail: { selected: string | null }) => void;
}