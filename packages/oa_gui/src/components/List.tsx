import React from "react";

interface ListItem {
  id: string;
  content: React.ReactNode;
}

export function List(props: {
  alignment: "H" | "V";
  extendTo: "TOP" | "BOTTOM" | "LEFT" | "RIGHT";
  onAddItem: () => ListItem;
  onDeleteItem: () => void;
  initialItems?: ListItem[];
}) {
  const isHorizontal = props.alignment === "H";
  const ctaAtStart = props.extendTo === "LEFT" || props.extendTo === "TOP";
  const listDirectionClass = isHorizontal ? "list--horizontal" : "list--vertical";
  const itemsDirectionClass = isHorizontal ? "list-items--horizontal" : "list-items--vertical";
  const itemsAlignmentClass = (() => {
    if (isHorizontal) {
      return props.extendTo === "LEFT" ? "list-items--row-start" : "list-items--row-end";
    }
    return props.extendTo === "TOP" ? "list-items--column-start" : "list-items--column-end";
  })();
  const [items, setItems] = React.useState<ListItem[]>(() => {
    if (props.initialItems && props.initialItems.length > 0) {
      return props.initialItems;
    }

    return [];
  });

  const handleAdd = () => {
    const nextItem = props.onAddItem();
    setItems((currentItems) => (ctaAtStart ? [nextItem, ...currentItems] : [...currentItems, nextItem]));
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (items.length === 0) {
      return;
    }
    props.onDeleteItem();
    setItems((currentItems) => (ctaAtStart ? currentItems.slice(1) : currentItems.slice(0, -1)));
  };

  const cta = (
    <button
      type="button"
      className="list-cta"
      onClick={handleAdd}
      onContextMenu={handleDelete}
      aria-label="Add or remove list item"
      title="Left click to add, right click to delete"
    >
      +/-
    </button>
  );

  return (
    <div className={`list ${listDirectionClass}`}>
      {ctaAtStart ? cta : null}
      <div className={`list-items ${itemsDirectionClass} ${itemsAlignmentClass}`}>
        {items.map((item) => (
          <div key={item.id} className="list-item" data-id={item.id}>
            {item.content}
          </div>
        ))}
      </div>
      {ctaAtStart ? null : cta}
    </div>
  );
}
