"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Separator } from "~/app/_components/ui/separator";
import { Navigation } from "../shared/navigation";
import type { Section } from "../wrapper/dashboardWrapper";
import { NetworkRecord } from "./NetworkRecord";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

interface NetworkProps {
  type: Section;
  currentSection: Section;
  setSection: (section: Section) => void;
  onComposeClick: () => void;
  setComposeRecipient: (email: string | null) => void;
}

// Define data types for the table
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

type PersonRecord = {
  id: string;
  userId: string;
  email: string;
  name: string;
  companyDomain: string | null;
  lastInteracted: Date | null;
  interactionCount: number;
};

type CompanyRecord = {
  id: string;
  userId: string;
  name: string;
  domains: string[];
  lastInteracted: Date | null;
  interactionCount: number;
};


// Color mapping for connection strength
function getStrengthColor(strength: string): string {
  switch (strength) {
    case "Very Strong":
      return "bg-green-500 text-white";
    case "Strong":
      return "bg-lime-400 text-black";
    case "Medium":
      return "bg-yellow-400 text-black";
    case "Weak":
    default:
      return "bg-red-400 text-white";
  }
}

function getStrengthDotColor(strength: string): string {
  switch (strength) {
    case "Very Strong":
      return "bg-green-500";
    case "Strong":
      return "bg-lime-400";
    case "Medium":
      return "bg-yellow-400";
    case "Weak":
    default:
      return "bg-red-400";
  }
}

// Define columns for People
const peopleColumns: ColumnDef<PersonData>[] = [
  {
    accessorKey: "personName",
    header: "Person",
  },
  {
    accessorKey: "lastEmailInteraction",
    header: "Last Email Interaction",
  },
  {
    accessorKey: "connectionStrength",
    header: "Connection Strength",
    cell: ({ getValue }) => {
      const strength = getValue() as string;
      return (
        <span className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${getStrengthDotColor(strength)}`} />
          {strength}
        </span>
      );
    },
  },
];

// Define columns for Companies
const companiesColumns: ColumnDef<CompanyData>[] = [
  {
    accessorKey: "companyName",
    header: "Company",
  },
  {
    accessorKey: "domains",
    header: "Domains",
  },
  {
    accessorKey: "connectionsInCompany",
    header: "Connections in Company",
  },
  {
    accessorKey: "connectionStrength",
    header: "Connection Strength",
    cell: ({ getValue }) => {
      const strength = getValue() as string;
      return (
        <span className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${getStrengthDotColor(strength)}`} />
          {strength}
        </span>
      );
    },
  },
];

export function Network({ type, currentSection, setSection, onComposeClick, setComposeRecipient }: NetworkProps) {
  const [isCollapsed] = React.useState(false);
  const { data: session } = useSession();

  const handleSectionChange = (section: Section) => {
    setSection(section);
  };

  const columns = React.useMemo(
    () => (type === "PEOPLE" ? peopleColumns : companiesColumns),
    [type]
  );

  const peopleQuery = api.people.getAll.useQuery();
  const companiesQuery = api.companies.getAll.useQuery();

  // Use the original records for state and navigation
  const people = React.useMemo(() => peopleQuery.data ?? [], [peopleQuery.data]);
  const filteredPeople = React.useMemo(() => {
    if (!session?.user?.email) return people;
    return people.filter(p => p.email !== session.user.email);
  }, [people, session]);
  const companies = React.useMemo(() => companiesQuery.data ?? [], [companiesQuery.data]);
  const filteredCompanies = React.useMemo(() => {
    return companies.filter(c =>
      c.domains.every(domain => !domain.endsWith("@gmail.com") && domain !== "gmail.com")
    );
  }, [companies]);

  // The data array for navigation and selection
  const data: (PersonRecord | CompanyRecord)[] = React.useMemo(() => {
    if (type === "PEOPLE") return filteredPeople;
    if (type === "COMPANIES") return filteredCompanies;
    return [];
  }, [type, filteredPeople, filteredCompanies]);

  // The display data for rendering the table
  const displayData = React.useMemo(() => {
    if (type === "PEOPLE") {
      return filteredPeople.map((p): PersonData => ({
        personName:
          p.name && p.name.trim().length > 0
            ? p.name
            : p.email?.split("@")[0] ?? "Unknown",
        email: p.email,
        companyName: p.companyDomain ?? "Unknown",
        lastEmailInteraction: p.lastInteracted
          ? new Date(p.lastInteracted).toLocaleDateString()
          : "Never",
        connectionStrength: getStrengthLabel(p.interactionCount),
      }));
    }
    if (type === "COMPANIES") {
      return filteredCompanies.map((c): CompanyData => ({
        companyName: c.name,
        domains: c.domains.join(", "),
        email: undefined,
        connectionsInCompany: 0, // You can extend your query to include this if needed
        connectionStrength: getStrengthLabel(c.interactionCount),
      }));
    }
    return [];
  }, [type, filteredPeople, filteredCompanies]);

  const table = useReactTable<PersonData | CompanyData>({
    data: displayData,
    columns: columns as ColumnDef<PersonData | CompanyData>[],
    getCoreRowModel: getCoreRowModel(),
  });

  const [selectedRecord, setSelectedRecord] = React.useState<PersonRecord | CompanyRecord | null>(null);

  const handleRowClick = (row: PersonData | CompanyData, rowIndex: number) => {
    setSelectedRecord(data[rowIndex] ?? null);
  };

  const showTable = () => {
    setSelectedRecord(null);
  };

  const currentIndex = React.useMemo(() => {
    if (!selectedRecord) return -1;
    return data.findIndex(item => item.id === selectedRecord.id);
  }, [data, selectedRecord]);

  const handleNavigate = (direction: "next" | "previous") => {
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === "next") {
      newIndex = Math.min(data.length - 1, currentIndex + 1);
    } else {
      newIndex = Math.max(0, currentIndex - 1);
    }
    if (newIndex >= 0 && newIndex < data.length && newIndex !== currentIndex) {
      setSelectedRecord(data[newIndex] ?? null);
    }
  };

  const recordTypeLabel = type === "PEOPLE" ? "People" : "Companies";

  const handlePersonRecordComposeEmail = (email: string) => {
    if (typeof setComposeRecipient === 'function') {
      setComposeRecipient(email); // Set specific recipient
    } else {
      console.error("setComposeRecipient is not a function. Please ensure it's passed correctly from the parent component.");
    }
    onComposeClick();             // Open modal
  };

  const handleSidebarNavigationComposeClick = () => {
    if (typeof setComposeRecipient === 'function') {
      setComposeRecipient(null); // Clear recipient for generic compose
    } else {
      console.error("setComposeRecipient is not a function. Please ensure it's passed correctly from the parent component.");
    }
    onComposeClick();          // Open modal
  };

  if (false) { /* placeholder for removed full-page loading */ }

  return (
    <div className="flex h-full">
      <div className="w-64 border-r">
        <Navigation
          currentSection={currentSection}
          setSection={handleSectionChange}
          isCollapsed={isCollapsed}
          showCompose={true}
          onComposeClick={handleSidebarNavigationComposeClick}
        />
      </div>
      <div className="flex-1">
        {selectedRecord ? (
          <NetworkRecord 
            record={selectedRecord} 
            onBack={showTable} 
            currentIndex={currentIndex}
            totalCount={data.length}
            recordTypeLabel={recordTypeLabel}
            onNavigate={handleNavigate}
            onComposeEmail={handlePersonRecordComposeEmail}
          />
        ) : (
          <>
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">
                  {type === "PEOPLE" ? "People" : "Companies"}
                </h1>
              </div>
            </div>
            <Separator />
            <div className="flex-1 p-4">
              <div className="overflow-x-auto">
                {(peopleQuery.isLoading || companiesQuery.isLoading) ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row: Row<PersonData | CompanyData>, idx) => (
                          <tr
                            key={row.id}
                            onClick={() => handleRowClick(row.original, idx)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="px-6 py-4 text-center text-sm text-gray-500"
                          >
                            No data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getStrengthLabel(interactionCount: number): string {
  if (interactionCount > 50) return "Very Strong";
  if (interactionCount > 20) return "Strong";
  if (interactionCount > 5) return "Medium";
  return "Weak";
}

// Export color helpers for use in record component
export { getStrengthColor, getStrengthDotColor };
