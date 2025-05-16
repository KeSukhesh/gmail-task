"use client";

import * as React from "react";
import { Button } from "~/app/_components/ui/button";
import { Send } from "lucide-react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { ActivityTab } from "./ActivityTab";
import { getStrengthColor, getStrengthLabel } from "./helpers";
import type {
  PersonRecord,
  CompanyRecord,
  MainRecordTab,
  SidebarRecordTab,
} from "./types";

interface NetworkRecordProps {
  onBack: () => void;
  record: PersonRecord | CompanyRecord | null;
  currentIndex: number;
  totalCount: number;
  recordTypeLabel: string;
  onNavigate: (direction: "next" | "previous") => void;
  onComposeEmail: (email: string) => void;
}

export function NetworkRecord({
  onBack,
  record,
  currentIndex,
  totalCount,
  recordTypeLabel,
  onNavigate,
  onComposeEmail,
}: NetworkRecordProps) {
  const [activeMainTab, setActiveMainTab] = React.useState<MainRecordTab>("Activity");
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<SidebarRecordTab>("Details");
  const { data: session } = useSession();

  // Type guard to distinguish PersonRecord from CompanyRecord
  const isPersonRecord = (rec: PersonRecord | CompanyRecord | null): rec is PersonRecord => {
    return !!rec && 'email' in rec && typeof rec.email === 'string';
  };

  const mainTabsForPerson: MainRecordTab[] = React.useMemo(() =>
    ["Activity", "Email", "Company", "Notes", "Tasks", "Files"],
  []);
  const mainTabsForCompany: MainRecordTab[] = React.useMemo(() =>
    ["Activity", "Email", "Team", "Notes", "Tasks", "Files"],
  []);

  const currentMainTabs = isPersonRecord(record) ? mainTabsForPerson : mainTabsForCompany;

  React.useEffect(() => {
    if (record) {
      const tabsForCurrentRecord = isPersonRecord(record) ? mainTabsForPerson : mainTabsForCompany;
      if (!tabsForCurrentRecord.includes(activeMainTab)) {
        setActiveMainTab(tabsForCurrentRecord[0]!);
      }
    } else {
      setActiveMainTab(mainTabsForPerson[0]!);
    }
  }, [record, activeMainTab, mainTabsForPerson, mainTabsForCompany]);

  if (!record) {
    return null;
  }

  const currentRecord = record;
  const isPerson = isPersonRecord(currentRecord);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < totalCount - 1;

  const personActivityQuery = isPerson
    ? api.people.getByIdWithActivity.useQuery({ id: currentRecord.id })
    : null;

  const companyActivityQuery = !isPerson
    ? api.companies.getByIdWithActivity.useQuery({ id: currentRecord.id })
    : null;

  const displayName =
    isPerson &&
    typeof currentRecord.email === 'string' &&
    session?.user?.email &&
    currentRecord.email === session.user.email
      ? session.user.name
      : isPerson && currentRecord.name && currentRecord.name.trim().length > 0
        ? currentRecord.name
        : isPerson && typeof currentRecord.email === 'string'
          ? currentRecord.email.split("@")[0]
          : "Unknown";

  console.log("[name]", currentRecord.name);
  return (
    <div className="flex h-full flex-col pt-4">
      {/* Nav Div - Outer container for full-width border and space for border */}
      <div className="mb-4 border-b pb-2">
        {/* Inner container for flex items - items-center with py-2 for item padding */}
        <div className="flex items-center gap-1.5 px-4 py-1">
          <button
            onClick={onBack}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Back to table"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate("previous")}
            disabled={!canNavigatePrev}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate("next")}
            disabled={!canNavigateNext}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {totalCount > 0 && (
            <span className="ml-1.5 text-sm text-gray-600">
              {currentIndex + 1} of {totalCount} in {recordTypeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Record Details Title - gets horizontal padding */}
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className="text-2xl font-semibold">
          {displayName}
        </h2>
        {/* Show button if it's a person with an email OR a company with an email */}
        {isPerson && currentRecord.email ? (
          <Button
            variant="outline"
            size="sm" 
            onClick={() => {
              if (currentRecord.email) {
                onComposeEmail(currentRecord.email);
              }
            }}
            className="ml-auto flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Compose Email
          </Button>
        ) : null}
      </div>

      {/* Tags Row - Reduced bottom margin */}
      <div className="mb-2 flex flex-wrap items-center gap-2 px-4">
        {isPerson ? (
          <>
            {currentRecord.companyDomain && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Company: {currentRecord.companyDomain}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Last Interaction: {currentRecord.lastInteracted ? new Date(currentRecord.lastInteracted).toLocaleDateString() : 'Never'}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStrengthColor(getStrengthLabel(currentRecord.interactionCount))}`}>
              Strength: {getStrengthLabel(currentRecord.interactionCount)}
            </span>
          </>
        ) : (
          <>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStrengthColor(getStrengthLabel(currentRecord.interactionCount))}`}>
              Strength: {getStrengthLabel(currentRecord.interactionCount)}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Domains: {currentRecord.domains.join(', ')}
            </span>
          </>
        )}
      </div>

      {/* New 70/30 Split Layout for Tabs */}
      <div className="mt-2 flex flex-1 overflow-hidden border-t px-4 pt-2">
        {/* Component 1: 70% width */}
        <div className="w-[70%] flex-col border-r pr-2 pt-2 flex overflow-y-auto">
          {/* Tabs for Component 1 */}
          <div className="mb-3 flex border-b">
            {currentMainTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium
                  ${activeMainTab === tab
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Content for Component 1 Tabs (Placeholders) */}
          <div className="flex-1 p-2">
            {activeMainTab === "Activity" && (
              <div className="space-y-2">
                {isPerson && personActivityQuery?.data ? (
                  <ActivityTab
                    inboundEmails={personActivityQuery.data.inboundEmails.map(email => ({
                      id: email.id,
                      subject: email.subject ?? '(No Subject)',
                      date: email.internalDate ?? email.createdAt ?? null,
                    }))}
                    outboundEmails={personActivityQuery.data.outboundEmails.map(email => ({
                      id: email.id,
                      subject: email.subject ?? '(No Subject)',
                      date: email.internalDate ?? email.createdAt ?? null,
                    }))}
                  />
                ) : !isPerson && companyActivityQuery?.data ? (
                  <ActivityTab
                    inboundEmails={companyActivityQuery.data.inboundEmails.map(email => ({
                      id: email.id,
                      subject: email.subject ?? '(No Subject)',
                      date: email.internalDate ?? email.createdAt ?? null,
                    }))}
                    outboundEmails={companyActivityQuery.data.outboundEmails.map(email => ({
                      id: email.id,
                      subject: email.subject ?? '(No Subject)',
                      date: email.internalDate ?? email.createdAt ?? null,
                    }))}
                  />
                ) : (
                  <div>Loading activity...</div>
                )}
                {/* Company people list remains below for companies */}
                {!isPerson && companyActivityQuery?.data && (
                  <>
                    <h3 className="text-lg font-semibold mt-6 mb-2 border-b pb-1">People in Company</h3>
                    <ul className="space-y-2">
                      {companyActivityQuery.data.people.map(person => (
                        <li key={person.id}>{person.name} ({person.email})</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {activeMainTab === "Email" && <div>Email Content Placeholder...</div>}
            {/* Conditional content for the third tab */}
            {isPerson && activeMainTab === "Company" && <div>Person&apos;s Company Info Placeholder...</div>}
            {!isPerson && activeMainTab === "Team" && <div>Company&apos;s Team Info Placeholder...</div>}
            {activeMainTab === "Notes" && <div>Notes Content Placeholder...</div>}
            {activeMainTab === "Tasks" && <div>Tasks Content Placeholder...</div>}
            {activeMainTab === "Files" && <div>Files Content Placeholder...</div>}
          </div>
        </div>

        {/* Component 2: 30% width */}
        <div className="w-[30%] flex-col pl-2 pt-2 flex overflow-y-auto">
          {/* Tabs for Component 2 */}
          <div className="mb-3 flex border-b">
            {(["Details", "Comments"] as SidebarRecordTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSidebarTab(tab)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium
                  ${activeSidebarTab === tab
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Content for Component 2 Tabs */}
          <div className="flex-1 p-2 space-y-3">
            {activeSidebarTab === "Details" && (
              <>
                {isPerson ? (
                  <>
                    {currentRecord.companyDomain && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">Company Domain</p>
                        <p className="text-sm text-gray-900">{currentRecord.companyDomain}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{currentRecord.email ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Last Interacted</p>
                      <p className="text-sm text-gray-900">{currentRecord.lastInteracted ? new Date(currentRecord.lastInteracted).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Interaction Count</p>
                      <p className="text-sm text-gray-900">{currentRecord.interactionCount}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Domains</p>
                      <p className="text-sm text-gray-900">{currentRecord.domains.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Last Interacted</p>
                      <p className="text-sm text-gray-900">{currentRecord.lastInteracted ? new Date(currentRecord.lastInteracted).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Interaction Count</p>
                      <p className="text-sm text-gray-900">{currentRecord.interactionCount}</p>
                    </div>
                  </>
                )}
              </>
            )}
            {activeSidebarTab === "Comments" && <div>Comments Content Placeholder...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}