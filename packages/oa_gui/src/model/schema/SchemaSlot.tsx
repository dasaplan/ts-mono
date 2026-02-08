import "./Schema.css";

export type SchemaSlotProps = {
  label: string;
  onClick?: () => void;
};

export function SchemaSlot({ label, onClick }: SchemaSlotProps) {
  return (
    <div className={"schema-slot"}>
      <button className={"schema-slot__button"} type={"button"} title={label} aria-label={label} onClick={onClick}>
        +
      </button>
    </div>
  );
}
