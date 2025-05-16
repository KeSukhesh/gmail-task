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

export function useNetworkTable(type: Section) {
  const { data: session } = useSession();
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
        connectionsInCompany: 0, // TODO: Add this to the query
        connectionStrength: getStrengthLabel(c.interactionCount),
      }));
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
    isLoading: peopleQuery.isLoading || companiesQuery.isLoading,
  };
}
