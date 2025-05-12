"use client";

import * as React from "react";
import { Send, Trash2, X } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Textarea } from "~/app/_components/ui/textarea";
import { Separator } from "~/app/_components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/app/_components/ui/dialog";
import { useComposeMail } from "~/lib/hooks/useMail";
import { useMail } from "~/lib/hooks/useMail";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function EmailChips({
  emails,
  onRemove,
}: {
  emails: string[];
  onRemove: (email: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {emails.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded bg-gray-200 px-2 py-0.5 text-sm"
        >
          {email}
          <button onClick={() => onRemove(email)}>
            <X className="h-3 w-3 text-gray-600" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  const { sendEmail } = useComposeMail();
  const { syncEmails } = useMail();
  const [subject, setSubject] = React.useState("");
  const [to, setTo] = React.useState<string[]>([]);
  const [cc, setCc] = React.useState<string[]>([]);
  const [bcc, setBcc] = React.useState<string[]>([]);
  const [showCc, setShowCc] = React.useState(false);
  const [showBcc, setShowBcc] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [currentInput, setCurrentInput] = React.useState("");
  const [inputMode, setInputMode] = React.useState<"to" | "cc" | "bcc">("to");

  const addRecipient = () => {
    const value = currentInput.trim();
    if (!value) return;

    const updater = {
      to: setTo,
      cc: setCc,
      bcc: setBcc,
    }[inputMode];

    updater((prev) => {
      if (!prev.includes(value)) {
        return [...prev, value];
      }
      return prev;
    });
    setCurrentInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: "to" | "cc" | "bcc") => {
    if (e.key === "Tab") {
      if (currentInput.trim()) {
        // Only prevent tab when converting to chip
        e.preventDefault();
        addRecipient();
      } else {
        let nextField: HTMLInputElement | null = null;
        if (field === "to" && showCc) {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="cc"]');
        } else if (field === "to" && showBcc) {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="bcc"]');
        } else if (field === "to") {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="subject"]');
        } else if (field === "cc" && showBcc) {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="bcc"]');
        } else if (field === "cc") {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="subject"]');
        } else if (field === "bcc") {
          nextField = document.querySelector<HTMLInputElement>('input[data-field="subject"]');
        }

        if (nextField) {
          e.preventDefault();
          nextField.focus();
        }
      }
    } else if (e.key === "Backspace" && !currentInput) {
      e.preventDefault();
      const updater = { to: setTo, cc: setCc, bcc: setBcc }[field];
      updater((prev) => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (to.length === 0 || !subject || !content) return;

    setIsSending(true);
    setError(null);
    try {
      await sendEmail.mutateAsync({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        text: content,
      });
      syncEmails();
      handleClose();
    } catch (err) {
      setError("Failed to send email. Please try again.");
      console.error("Error sending email:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSubject("");
    setTo([]);
    setCc([]);
    setBcc([]);
    setContent("");
    setCurrentInput("");
    setShowCc(false);
    setShowBcc(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          return;
        }
      }}
    >
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col" showClose={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{subject || "New Message"}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-500 mb-2">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1 mb-1">
          {/* TO Field */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-sm text-muted-foreground">To</span>
            <div className="flex flex-wrap flex-1 items-center gap-1 border rounded p-1 bg-gray-50/50">
              <EmailChips emails={to} onRemove={(email) => setTo(to.filter((e) => e !== email))} />
              <input
                className="flex-1 border-0 focus:ring-0 outline-none bg-transparent"
                placeholder="recipient@example.com"
                value={inputMode === "to" ? currentInput : ""}
                onChange={(e) => {
                  setInputMode("to");
                  setCurrentInput(e.target.value);
                }}
                onKeyDown={(e) => handleKeyDown(e, "to")}
                data-field="to"
              />
            </div>
            <div className="flex gap-1 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setShowCc(!showCc)}>
                Cc
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowBcc(!showBcc)}>
                Bcc
              </Button>
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="flex items-center gap-2">
              <span className="w-8 text-sm text-muted-foreground">Cc</span>
              <div className="flex flex-wrap flex-1 items-center gap-1 border rounded p-1 bg-gray-50/50">
                <EmailChips emails={cc} onRemove={(email) => setCc(cc.filter((e) => e !== email))} />
                <input
                  className="flex-1 border-0 focus:ring-0 outline-none bg-transparent"
                  placeholder="cc@example.com"
                  value={inputMode === "cc" ? currentInput : ""}
                  onChange={(e) => {
                    setInputMode("cc");
                    setCurrentInput(e.target.value);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, "cc")}
                  data-field="cc"
                />
              </div>
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <span className="w-8 text-sm text-muted-foreground">Bcc</span>
              <div className="flex flex-wrap flex-1 items-center gap-1 border rounded p-1 bg-gray-50/50">
                <EmailChips emails={bcc} onRemove={(email) => setBcc(bcc.filter((e) => e !== email))} />
                <input
                  className="flex-1 border-0 focus:ring-0 outline-none bg-transparent"
                  placeholder="bcc@example.com"
                  value={inputMode === "bcc" ? currentInput : ""}
                  onChange={(e) => {
                    setInputMode("bcc");
                    setCurrentInput(e.target.value);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, "bcc")}
                  data-field="bcc"
                />
              </div>
            </div>
          )}
        </div>

        <Separator className="mb-1" />

        <div className="mb-2">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="h-8 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 bg-gray-50/50"
            data-field="subject"
          />
        </div>

        <Separator className="mb-1" />

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your message here..."
          className="flex-1 resize-none border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 bg-gray-50/50"
        />

        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleClose}
            disabled={isSending}
          >
            <Trash2 className="h-4 w-4" />
            Discard
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            disabled={to.length === 0 || !subject || !content || isSending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
 