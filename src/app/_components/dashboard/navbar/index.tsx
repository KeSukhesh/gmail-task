"use client";

import React from "react";

interface NavbarProps {
  currentSection: string;
}

const Navbar = ({currentSection }: NavbarProps) => {
  return (
    <div className="flex items-center justify-between w-full h-14 px-4">
      <div className="text-lg font-medium">
        {currentSection.charAt(0) + currentSection.slice(1).toLowerCase().replace("_", " ")}
      </div>
    </div>
  );
};

export default React.memo(Navbar);