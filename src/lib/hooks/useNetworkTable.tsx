import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import type { Section } from "~/app/_components/dashboard/wrapper/dashboardWrapper";
import type {
  PersonData,
  CompanyData,
  PersonRecord,
  CompanyRecord,
} from "~/app/_components/dashboard/network/types";
import { getStrengthDotColor, getStrengthLabel } from "~/app/_components/dashboard/network/helpers";

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

// Type guard to check if a record is a PersonRecord
const isPersonRecord = (record: PersonRecord | CompanyRecord): record is PersonRecord => {
  return 'email' in record && typeof record.email === 'string';
};

// Type guard to check if a record is a CompanyRecord
const isCompanyRecord = (record: PersonRecord | CompanyRecord): record is CompanyRecord => {
  return 'domains' in record && Array.isArray(record.domains);
};

export function useNetworkTable(type: Section) {
  const { data: session } = useSession();
  const { data: people, isLoading: isLoadingPeople } = api.network.getAll.useQuery(
    { type: "PEOPLE" },
    { enabled: type === "PEOPLE" }
  );
  const { data: companies, isLoading: isLoadingCompanies } = api.network.getAll.useQuery(
    { type: "COMPANIES" },
    { enabled: type === "COMPANIES" }
  );

  // Use the original records for state and navigation
  const filteredPeople = React.useMemo(() => {
    if (!session?.user?.email || !people) return [];
    return people.filter((p): p is PersonRecord =>
      isPersonRecord(p) && p.email !== session.user.email
    );
  }, [people, session]);

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return [];
    return companies.filter((c): c is CompanyRecord =>
      isCompanyRecord(c) && c.domains.every(domain => !domain.endsWith("@gmail.com") && domain !== "gmail.com")
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
      return filteredPeople.map((p): PersonData => {
        if (!isPersonRecord(p)) throw new Error("Expected PersonRecord");
        const personName = p.name?.trim() ?? p.email?.split("@")[0] ?? "Unknown";
        console.log("[Table Name Calculation]", {
          originalName: p.name,
          email: p.email,
          calculatedName: personName,
          conditions: {
            hasName: !!p.name?.trim(),
            hasEmail: !!p.email
          }
        });
        return {
          personName,
          email: p.email,
          companyName: p.companyDomain ?? "Unknown",
          lastEmailInteraction: p.lastInteracted
            ? new Date(p.lastInteracted).toLocaleDateString()
            : "Never",
          connectionStrength: getStrengthLabel(p.interactionCount),
        };
      });
    }
    if (type === "COMPANIES") {
      return filteredCompanies.map((c): CompanyData => {
        if (!isCompanyRecord(c)) throw new Error("Expected CompanyRecord");
        return {
          companyName: c.name ?? "Unknown",
          domains: c.domains.join(", "),
          email: undefined,
          connectionsInCompany: 0, // might extend to include this
          connectionStrength: getStrengthLabel(c.interactionCount),
        };
      });
    }
    return [];
  }, [type, filteredPeople, filteredCompanies]);

  const columns = React.useMemo(
    () => (type === "PEOPLE" ? peopleColumns : companiesColumns),
    [type]
  );

  const table = useReactTable<PersonData | CompanyData>({
    data: displayData,
    columns: columns as ColumnDef<PersonData | CompanyData>[],
    getCoreRowModel: getCoreRowModel(),
  });

  return {
    table,
    data,
    isLoading: isLoadingPeople || isLoadingCompanies,
  };
}
