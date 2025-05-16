"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { Separator } from "~/app/_components/ui/separator";
import { Navigation } from "../shared/navigation";
import type { Section } from "../wrapper/dashboardWrapper";
import { NetworkRecord } from "./NetworkRecord";
import { Loader2 } from "lucide-react";
import type { NetworkProps, PersonData, CompanyData, PersonRecord, CompanyRecord } from "./types";
import { useNetworkTable } from "~/lib/hooks/useNetworkTable";

export function Network({ type, currentSection, setSection, onComposeClick, setComposeRecipient }: NetworkProps) {
  const [isCollapsed] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<PersonRecord | CompanyRecord | null>(null);
  const { table, data, isLoading } = useNetworkTable(type);

  const handleSectionChange = (section: Section) => {
    setSection(section);
  };

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
      setComposeRecipient(email);
    } else {
      console.error("setComposeRecipient is not a function. Please ensure it's passed correctly from the parent component.");
    }
    onComposeClick();
  };

  const handleSidebarNavigationComposeClick = () => {
    if (typeof setComposeRecipient === 'function') {
      setComposeRecipient(null);
    } else {
      console.error("setComposeRecipient is not a function. Please ensure it's passed correctly from the parent component.");
    }
    onComposeClick();
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
                {isLoading ? (
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
                        table.getRowModel().rows.map((row, idx) => (
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
                            colSpan={table.getAllColumns().length}
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
