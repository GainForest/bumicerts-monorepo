"use client";

import type { ReactNode } from "react";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import Container from "@/components/ui/container";
import { useManageMode } from "../_hooks/useUploadMode";
import { EditBar } from "./EditableHero";

function EditBarSubHeader() {
  return (
    <Container className="p-0 pt-1">
      <EditBar />
    </Container>
  );
}

type ManageEditHeaderContentProps = {
  right?: ReactNode;
};

export function ManageEditHeaderContent({
  right,
}: ManageEditHeaderContentProps) {
  const [mode] = useManageMode();

  if (mode !== "edit") {
    return null;
  }

  return (
    <HeaderContent
      {...(right !== undefined ? { right } : {})}
      sub={<EditBarSubHeader />}
    />
  );
}
