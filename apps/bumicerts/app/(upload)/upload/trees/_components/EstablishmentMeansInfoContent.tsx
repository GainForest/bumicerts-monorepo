import {
  getSelectableEstablishmentMeansOptions,
} from "@/lib/upload/establishment-means";

type EstablishmentMeansInfoContentProps = {
  currentValue?: string | null;
};

export default function EstablishmentMeansInfoContent({
  currentValue,
}: EstablishmentMeansInfoContentProps) {
  const options = getSelectableEstablishmentMeansOptions(currentValue);

  return (
    <div className="w-72 text-left">
      {options.map((option, index) => (
        <div
          key={option.value}
          className={index === 0 ? "pb-2" : "border-t border-border pt-2 pb-2 last:pb-0"}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{option.label}</span>
            {option.legacy ? (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                legacy
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {option.description}
          </p>
        </div>
      ))}
    </div>
  );
}
