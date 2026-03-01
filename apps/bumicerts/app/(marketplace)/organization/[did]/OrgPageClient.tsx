"use client";

import { useState } from "react";
import { OrgHero } from "./_components/OrgHero";
import { OrgSubHero } from "./_components/OrgSubHero";
import { OrgAbout } from "./_components/OrgAbout";
import { OrgBumicerts } from "./_components/OrgBumicerts";
import { OrgPageHeader } from "./_components/OrgPageHeader";
import type { OrganizationData, BumicertData } from "@/lib/types";
import { motion } from "framer-motion";

export function OrgPageClient({
  organization,
  bumicerts,
}: {
  organization: OrganizationData;
  bumicerts: BumicertData[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(organization.displayName);

  const handleStartEdit = () => {
    setEditingName(organization.displayName);
    setIsEditing(true);
  };

  const handleSave = () => {
    // Visual-only: we just exit editing mode. Nothing persists to backend.
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingName(organization.displayName);
    setIsEditing(false);
  };

  return (
    <div className="w-full">
      <OrgPageHeader
        isEditing={isEditing}
        onStartEdit={handleStartEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-t-2xl overflow-hidden border border-border mx-0"
      >
        <OrgHero
          organization={organization}
          isEditing={isEditing}
          editingName={editingName}
          onEditName={setEditingName}
        />
        <OrgSubHero organization={organization} isEditing={isEditing} />
      </motion.div>

      {/* About */}
      <div className="border-x border-b border-border rounded-b-2xl mb-6">
        <OrgAbout organization={organization} />
        <div className="h-px bg-border mx-4 md:mx-5" />
        <OrgBumicerts bumicerts={bumicerts} orgDid={organization.did} />
      </div>
    </div>
  );
}
