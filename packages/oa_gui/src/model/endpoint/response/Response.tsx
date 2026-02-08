import { useEffect, useMemo, useState } from "react";
import "./Response.css";
import { SchemaSlot } from "../../schema/SchemaSlot";
export type EndpointResponseType = "json" | "text" | "xml" | "html" | "no-content";

export function EndpointResponse(props: { schemaId?: string; schemaName?: string; status: number; type: EndpointResponseType }) {
  const [status, setStatus] = useState(props.status);
  const [type, setType] = useState<EndpointResponseType>(props.type);

  useEffect(() => {
    setStatus(props.status);
  }, [props.status]);

  useEffect(() => {
    setType(props.type);
  }, [props.type]);

  const responseTypes = useMemo<EndpointResponseType[]>(() => ["json", "text", "xml", "html", "no-content"], []);

  const schemaLabel = props.schemaName ?? props.schemaId ?? "Add schema";

  return (
    <div className={"oa-endpoint-response"}>
      <div className={"oa-response__row oa-response__row--top"}>
        <label className={"oa-response__label"} htmlFor={"oa-response-status"}>
          Status
        </label>
        <input
          className={"oa-response__status-input"}
          id={"oa-response-status"}
          inputMode={"numeric"}
          type={"number"}
          value={status}
          onChange={(event) => {
            const nextValue = Number.parseInt(event.target.value, 10);
            setStatus(Number.isNaN(nextValue) ? 0 : nextValue);
          }}
        />
      </div>

      {type === "json" ? <SchemaSlot label={schemaLabel} /> : null}

      <div className={"oa-response__row oa-response__row--bottom"}>
        <label className={"oa-response__label"} htmlFor={"oa-response-type"}>
          Type
        </label>
        <select
          className={"oa-response__type-select"}
          id={"oa-response-type"}
          value={type}
          onChange={(event) => {
            setType(event.target.value as EndpointResponseType);
          }}
        >
          {responseTypes.map((responseType) => (
            <option key={responseType} value={responseType}>
              {responseType}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
