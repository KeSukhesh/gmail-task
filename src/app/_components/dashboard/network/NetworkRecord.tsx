"use client";

import * as React from "react";
import { Button } from "~/app/_components/ui/button";
import { Send } from "lucide-react";

// Assuming these types are co-located or imported from a shared types file
// For this example, I'll redefine them. In a real app, import them.
interface PersonData {
  personName: string;
  email?: string;
  companyName?: string;
  lastEmailInteraction: string;
  connectionStrength: string;
}

interface CompanyData {
  companyName: string;
  domains: string;
  email?: string;
  connectionsInCompany: number;
  connectionStrength: string;
}

// Define types for the new tabs
type MainRecordTab = "Activity" | "Email" | "Company" | "Team" | "Notes" | "Tasks" | "Files";
type SidebarRecordTab = "Details" | "Comments";

interface NetworkRecordProps {
  onBack: () => void;
  record: PersonData | CompanyData | null;
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

  // Define isPerson type guard early, it does not depend on the record instance itself for its definition.
  const isPersonGuard = (rec: PersonData | CompanyData | null): rec is PersonData =>
    !!rec && (rec as PersonData).personName !== undefined;

  const mainTabsForPerson: MainRecordTab[] = React.useMemo(() => 
    ["Activity", "Email", "Company", "Notes", "Tasks", "Files"], 
  []);
  const mainTabsForCompany: MainRecordTab[] = React.useMemo(() => 
    ["Activity", "Email", "Team", "Notes", "Tasks", "Files"], 
  []);

  // Determine currentMainTabs. If record is null, default to person tabs for structure, useEffect will handle it.
  const currentMainTabs = isPersonGuard(record) ? mainTabsForPerson : mainTabsForCompany;
  
  React.useEffect(() => {
    if (record) { 
      const tabsForCurrentRecord = isPersonGuard(record) ? mainTabsForPerson : mainTabsForCompany;
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

  // Now currentRecord is guaranteed to be non-null
  const currentRecord = record;
  // Use the guard with the non-null record for rendering logic
  const isPersonRecord = isPersonGuard(currentRecord);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < totalCount - 1;
  
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
          {isPersonRecord ? currentRecord.personName : currentRecord.companyName}
        </h2>
        {/* Show button if it's a person with an email OR a company with an email */}
        {(isPersonRecord && currentRecord.email) || 
         (!isPersonRecord && currentRecord.email) ? (
          <Button
            variant="outline"
            size="sm" 
            onClick={() => {
              const emailToUse = isPersonRecord 
                ? currentRecord.email 
                : currentRecord.email;
              if (emailToUse) {
                onComposeEmail(emailToUse);
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
        {isPersonRecord ? (
          <>
            {currentRecord.companyName && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Company: {currentRecord.companyName}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Last Interaction: {currentRecord.lastEmailInteraction}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Strength: {currentRecord.connectionStrength}
            </span>
          </>
        ) : (
          <>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Strength: {currentRecord.connectionStrength}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Connections: {currentRecord.connectionsInCompany}
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
            {activeMainTab === "Activity" && <div>Activity Content Placeholder...</div>}
            {activeMainTab === "Email" && <div>Email Content Placeholder...</div>}
            {/* Conditional content for the third tab */}
            {isPersonRecord && activeMainTab === "Company" && <div>Person&apos;s Company Info Placeholder...</div>}
            {!isPersonRecord && activeMainTab === "Team" && <div>Company&apos;s Team Info Placeholder...</div>}
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
                {isPersonRecord ? (
                  <>
                    {currentRecord.companyName && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">Company</p>
                        <p className="text-sm text-gray-900">{currentRecord.companyName}</p>
                      </div>
                    )}
                     <div>
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{currentRecord.email ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Last Email Interaction</p>
                      <p className="text-sm text-gray-900">{currentRecord.lastEmailInteraction}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Connection Strength</p>
                      <p className="text-sm text-gray-900">{currentRecord.connectionStrength}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{currentRecord.email ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Domains</p>
                      <p className="text-sm text-gray-900">{currentRecord.domains}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Connections in Company</p>
                      <p className="text-sm text-gray-900">{currentRecord.connectionsInCompany}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Connection Strength</p>
                      <p className="text-sm text-gray-900">{currentRecord.connectionStrength}</p>
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