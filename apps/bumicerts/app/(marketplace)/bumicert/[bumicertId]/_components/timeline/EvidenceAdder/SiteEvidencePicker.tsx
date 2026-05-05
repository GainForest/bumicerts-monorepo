import type { CertifiedLocation } from "@/graphql/indexer/queries";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";

const SiteEvidencePicker = ({
  data,
}: {
  data: CertifiedLocation[];
}) => {
  const tabConfig = getManagedEvidenceTabConfig("sites");

  return (
    <UriEvidencePicker
      tabId="sites"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) => item.record?.name ?? "Unnamed site"}
      getSecondary={(item) => item.record?.locationType ?? undefined}
    />
  );
};

export default SiteEvidencePicker;
