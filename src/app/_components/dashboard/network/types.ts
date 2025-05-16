import type { Section } from "../wrapper/dashboardWrapper";

// Data types for the table
export interface PersonData {
  personName: string;
  email?: string;
  companyName?: string;
  lastEmailInteraction: string;
  connectionStrength: string;
}

export interface CompanyData {
  companyName: string;
  domains: string;
  email?: string;
  connectionsInCompany: number;
  connectionStrength: string;
}

export type PersonRecord = {
  id: string;
  userId: string;
  email: string;
  name: string;
  companyDomain: string | null;
  lastInteracted: Date | null;
  interactionCount: number;
};

export type CompanyRecord = {
  id: string;
  userId: string;
  name: string;
  domains: string[];
  lastInteracted: Date | null;
  interactionCount: number;
};

// Define types for the tabs
export type MainRecordTab = "Activity" | "Email" | "Company" | "Team" | "Notes" | "Tasks" | "Files";
export type SidebarRecordTab = "Details" | "Comments";

export interface NetworkProps {
  type: Section;
  currentSection: Section;
  setSection: (section: Section) => void;
  onComposeClick: () => void;
  setComposeRecipient: (email: string | null) => void;
}