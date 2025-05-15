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
              {email.direction === "inbound" ? (
                <div className="flex w-full justify-start">
                  <div className="p-2 bg-blue-50 max-w-sm text-left shadow-sm rounded-l-2xl rounded-tr-2xl mr-2">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-200 text-blue-800">Inbound</span>
                    <div className="font-medium mt-1">{email.subject}</div>
                    <div className="text-xs text-gray-500">{email.date ? new Date(email.date).toLocaleString() : "No date"}</div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full justify-end">
                  <div className="p-2 bg-green-50 max-w-sm text-right shadow-sm rounded-r-2xl rounded-tl-2xl ml-2">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-200 text-green-800">Outbound</span>
                    <div className="font-medium mt-1">{email.subject}</div>
                    <div className="text-xs text-gray-500">{email.date ? new Date(email.date).toLocaleString() : "No date"}</div>
                  </div>
                </div>
              )}
            </li>
          ))
        ) : (
          <li className="text-gray-400">No activity.</li>
        )}
      </ul>
    </div>
  );
} 