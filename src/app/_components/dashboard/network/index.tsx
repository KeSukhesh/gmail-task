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

// Fake data for People
const fakePeopleData: PersonData[] = [
  {
    personName: "Alice Wonderland",
    email: "alice.wonderland@example.com",
    companyName: "Acme Corp",
    lastEmailInteraction: "2 days ago",
    connectionStrength: "Strong",
  },
  {
    personName: "Bob The Builder",
    email: "bob.builder@example.com",
    companyName: "Wayne Enterprises",
    lastEmailInteraction: "1 week ago",
    connectionStrength: "Medium",
  },
  {
    personName: "Charlie Chaplin",
    lastEmailInteraction: "3 hours ago",
    connectionStrength: "Very Strong",
  },
];

// Fake data for Companies
const fakeCompanyData: CompanyData[] = [
  {
    companyName: "Acme Corp",
    domains: "acme.com, acme.org",
    email: "contact@acme.com",
    connectionsInCompany: 5,
    connectionStrength: "Medium",
  },
  {
    companyName: "Wayne Enterprises",
    domains: "wayne.com, wayne.org",
    connectionsInCompany: 12,
    connectionStrength: "Strong",
  },
  {
    companyName: "Stark Industries",
    domains: "starkindustries.com",
    email: "info@starkindustries.com",
    connectionsInCompany: 8,
    connectionStrength: "Very Strong",
  },
];

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
  },
];

export function Network({ type, currentSection, setSection, onComposeClick, setComposeRecipient }: NetworkProps) {
  const [isCollapsed] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<PersonData | CompanyData | null>(null);

  const handleSectionChange = (section: Section) => {
    setSection(section);
    setSelectedRecord(null); // Reset view when section changes
  };

  const columns = React.useMemo(
    () => (type === "PEOPLE" ? peopleColumns : companiesColumns),
    [type]
  );

  const data = React.useMemo(
    () => (type === "PEOPLE" ? fakePeopleData : fakeCompanyData),
    [type]
  );

  const table = useReactTable<PersonData | CompanyData>({
    data,
    columns: columns as ColumnDef<PersonData | CompanyData>[],
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (record: PersonData | CompanyData) => {
    setSelectedRecord(record);
  };

  const showTable = () => {
    setSelectedRecord(null);
  };

  const currentIndex = React.useMemo(() => {
    if (!selectedRecord) return -1;
    return data.findIndex(item => JSON.stringify(item) === JSON.stringify(selectedRecord));
    // Note: JSON.stringify for comparison is simple but might not be robust for complex objects or if order of keys can change.
    // A unique ID on each record would be better: data.findIndex(item => item.id === selectedRecord.id);
  }, [data, selectedRecord]);

  const handleNavigate = (direction: "next" | "previous") => {
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === "next") {
      newIndex = Math.min(data.length - 1, currentIndex + 1);
    } else {
      newIndex = Math.max(0, currentIndex - 1);
    }
    
    // Ensure newIndex is valid and different before updating
    if (newIndex >= 0 && newIndex < data.length && newIndex !== currentIndex) {
      const newRecord = data[newIndex];
      if (newRecord) { // Additional check for safety, though newIndex should be valid
        setSelectedRecord(newRecord);
      }
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
                      table.getRowModel().rows.map((row: Row<PersonData | CompanyData>) => (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row.original)}
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}