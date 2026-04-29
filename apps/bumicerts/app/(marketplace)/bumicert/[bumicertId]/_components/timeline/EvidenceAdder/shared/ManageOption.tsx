import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  getManagedEvidenceTabConfig,
  type ManagedEvidenceTabId,
} from "./evidenceRegistry";

const ManageOption = ({ type }: { type: ManagedEvidenceTabId }) => {
  const { manageHref } = getManagedEvidenceTabConfig(type);

  return (
    <div className="flex justify-end">
      <Link
        href={manageHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        Manage
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
};

export default ManageOption;
