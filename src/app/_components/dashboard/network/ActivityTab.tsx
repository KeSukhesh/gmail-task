import * as React from "react";

export interface Email {
  id: string;
  subject: string;
  date?: string | Date | null;
}

interface ActivityTabProps {
  inboundEmails: Email[];
  outboundEmails: Email[];
}

type TimelineEmail = Email & { direction: "inbound" | "outbound" };

export function ActivityTab({ inboundEmails, outboundEmails }: ActivityTabProps) {
  // Tag emails with direction
  const timelineEmails: TimelineEmail[] = React.useMemo(() => {
    const inbound = inboundEmails.map(e => ({ ...e, direction: "inbound" as const }));
    const outbound = outboundEmails.map(e => ({ ...e, direction: "outbound" as const }));
    return [...inbound, ...outbound].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    );
  }, [inboundEmails, outboundEmails]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold mb-2 border-b pb-1">Activity Timeline</h3>
      <ul className="space-y-2">
        {timelineEmails.length > 0 ? (
          timelineEmails.map(email => (
            <li key={email.id} className="flex">
              <div className="flex w-full">
                <div className={`p-2 w-full shadow-sm rounded-lg flex justify-between items-start ${
                  email.direction === "inbound" ? "bg-blue-50" : "bg-green-50"
                }`}>
                  <div className="flex-1">
                    <div className="font-medium">{email.subject}</div>
                    <div className="text-xs text-gray-500">{email.date ? new Date(email.date).toLocaleString() : "No date"}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ml-2 ${
                    email.direction === "inbound" 
                      ? "bg-blue-200 text-blue-800" 
                      : "bg-green-200 text-green-800"
                  }`}>
                    {email.direction === "inbound" ? "Inbound" : "Outbound"}
                  </span>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="text-gray-400">No activity.</li>
        )}
      </ul>
    </div>
  );
} 