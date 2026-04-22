import { ListEmpty, ListLayout } from "./RecordList";
import CheckRow from "./CheckRow";
import ManageOption from "./ManageOption";
import OptionalNote from "./OptionalNote";
import Mutator, { type AttachmentData } from "./Mutator";
import { type ManagedEvidenceTabId } from "./evidenceRegistry";
import { useEvidenceAdderStore } from "./evidenceAdderStore";
import { useUriSelection } from "./useUriSelection";

type UriEvidencePickerProps<TItem> = {
  data: TItem[];
  tabId: ManagedEvidenceTabId;
  icon: React.ComponentType<{ className?: string }>;
  mutation: {
    title: string;
    contentType: string;
  };
  getUri: (item: TItem) => string | undefined;
  getPrimary: (item: TItem) => string;
  getSecondary?: (item: TItem) => string | undefined;
};

type RowData<TItem> = {
  item: TItem;
  uri: string;
};

function UriEvidencePicker<TItem>({
  data,
  tabId,
  icon,
  mutation,
  getUri,
  getPrimary,
  getSecondary,
}: UriEvidencePickerProps<TItem>) {
  const description = useEvidenceAdderStore((state) => state.description);
  const resetDescription = useEvidenceAdderStore(
    (state) => state.resetDescription,
  );
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);
  const activityUri = useEvidenceAdderStore((state) => state.activityUri);
  const activityCid = useEvidenceAdderStore((state) => state.activityCid);
  const rows: RowData<TItem>[] = data.flatMap((item) => {
    const uri = getUri(item);
    if (!uri) {
      return [];
    }
    return [{ item, uri }];
  });

  const availableUris = new Set(rows.map((row) => row.uri));
  const { selectedUris, selectedContents, toggleUri, resetSelection } =
    useUriSelection(availableUris);

  if (rows.length === 0) {
    return <ListEmpty tabId={tabId} />;
  }

  const computedMutationData: AttachmentData = {
    title: mutation.title,
    contentType: mutation.contentType,
    description,
    subjectInfo: {
      uri: activityUri,
      cid: activityCid,
    },
    contents: selectedContents,
  };

  return (
    <>
      <ListLayout>
        {rows.map(({ item, uri }) => (
          <CheckRow
            key={uri}
            selected={selectedUris.has(uri)}
            onToggle={() => toggleUri(uri)}
            icon={icon}
            primary={getPrimary(item)}
            secondary={getSecondary?.(item)}
            disabled={isSubmitting}
          />
        ))}
      </ListLayout>
      <ManageOption type={tabId} />
      <OptionalNote disabled={isSubmitting} />
      <Mutator
        data={computedMutationData}
        onSuccess={() => {
          resetDescription();
          resetSelection();
        }}
      />
    </>
  );
}

export default UriEvidencePicker;
