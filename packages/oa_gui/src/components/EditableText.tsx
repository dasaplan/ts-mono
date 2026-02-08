import { useEffect, useRef, useState } from "react";

export function EditableText(props: {
  onUpdateEnter: (input: string) => void;
  onUpdateExit: () => void;
  initial?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  multiline?: boolean;
}) {
  const { onUpdateEnter, onUpdateExit, initial, className, inputClassName, labelClassName, multiline = false } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [committedValue, setCommittedValue] = useState(initial ?? "");
  const [draftValue, setDraftValue] = useState(committedValue);
  const [autoMultiline, setAutoMultiline] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMultiLineContent = draftValue.includes("\n");
  const effectiveMultiline = multiline || isMultiLineContent || autoMultiline;

  useEffect(() => {
    if (!isEditing) {
      setCommittedValue(initial ?? "");
    }
  }, [initial, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setDraftValue(committedValue);
      requestAnimationFrame(() => {
        const activeElement = effectiveMultiline ? textareaRef.current : inputRef.current;
        activeElement?.focus();
        activeElement?.select();
      });
    }
  }, [isEditing, committedValue, effectiveMultiline]);

  const finishEdit = (mode: "commit" | "cancel") => {
    if (mode === "commit") {
      const nextValue = draftValue.trim();
      setCommittedValue(nextValue);
      onUpdateEnter(nextValue);
    } else {
      setDraftValue(committedValue);
      onUpdateExit();
    }
    setIsEditing(false);
  };

  const computeRows = (value: string) => {
    const normalized = value ?? "";
    return Math.max(1, normalized.split("\n").length);
  };

  const inputClasses = ["editable-text__input", className, inputClassName].filter(Boolean).join(" ");
  const labelClasses = ["editable-text__label", className, labelClassName].filter(Boolean).join(" ");

  const measureTextWidth = (text: string, element: HTMLElement) => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) {
      return null;
    }
    const style = window.getComputedStyle(element);
    context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
    return context.measureText(text).width;
  };

  useEffect(() => {
    if (!isEditing) {
      setAutoMultiline(false);
      return;
    }
    if (multiline || isMultiLineContent) {
      setAutoMultiline(false);
      return;
    }
    const inputElement = inputRef.current;
    if (!inputElement) {
      return;
    }
    const textWidth = measureTextWidth(draftValue, inputElement);
    if (textWidth === null) {
      return;
    }
    setAutoMultiline(textWidth > inputElement.clientWidth);
  }, [isEditing, multiline, isMultiLineContent, draftValue]);

  useEffect(() => {
    if (!isEditing || !effectiveMultiline) {
      return;
    }
    const textareaElement = textareaRef.current;
    if (!textareaElement) {
      return;
    }
    textareaElement.style.height = "auto";
    textareaElement.style.height = `${textareaElement.scrollHeight}px`;
  }, [isEditing, effectiveMultiline, draftValue]);

  return isEditing ? (
    effectiveMultiline ? (
      <textarea
        ref={textareaRef}
        className={inputClasses}
        rows={computeRows(draftValue)}
        value={draftValue}
        style={{ textAlign: "left" }}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            finishEdit("commit");
            return;
          }
          if (event.key === "Escape") {
            finishEdit("cancel");
          }
        }}
        onBlur={() => finishEdit("commit")}
      />
    ) : (
      <input
        ref={inputRef}
        className={inputClasses}
        value={draftValue}
        style={{ textAlign: "left" }}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            finishEdit("commit");
            return;
          }
          if (event.key === "Escape") {
            finishEdit("cancel");
          }
        }}
        onBlur={() => finishEdit("cancel")}
      />
    )
  ) : (
    <span
      className={labelClasses}
      style={{ textAlign: "left" }}
      onDoubleClick={() => setIsEditing(true)}
      role="textbox"
      aria-readonly="true"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          setIsEditing(true);
        }
      }}
    >
      {committedValue}
    </span>
  );
}
