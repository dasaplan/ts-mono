import { useEffect, useState } from "react";
import { EditableText } from "../../components/EditableText.js";
import type { Schema } from "../schema/Schema.js";
import type { OaHeader, OaPathParam, OaQueryParam } from "./request/Params.js";
import { EndpointRequest } from "./request/Request.js";
import "./Endpoint.css";
import { AssignedTags } from "../tags/AssignedTags.js";
import { ResponseList } from "./response/ResponseList.js";

export interface OaRequest {
  params: Array<OaPathParam>;
  query: Array<OaQueryParam>;
  headers: Array<OaHeader>;
  body: Schema;
}

export interface OaResponse {
  status: number;
  body: Schema;
}

export interface OaTag {
  id: string;
  name: string;
}

export interface OaEndpoint {
  operationId: string;
  method: string;
  path: string;
  description?: string;
  tags?: Array<OaTag>;
  request: OaRequest | undefined;
  defaults?: {
    response: OaResponse;
  };
  responses: Array<OaResponse>;
}

export function Endpoint(props: { endpoint: OaEndpoint }) {
  const { endpoint } = props;
  const [method, setMethod] = useState(endpoint.method);
  const [path, setPath] = useState(endpoint.path);
  const [operationId, setOperationId] = useState(endpoint.operationId);
  const [description, setDescription] = useState(endpoint.description ?? "");

  useEffect(() => {
    setMethod(endpoint.method);
    setPath(endpoint.path);
    setOperationId(endpoint.operationId);
    setDescription(endpoint.description ?? "");
  }, [endpoint.method, endpoint.path, endpoint.operationId, endpoint.description]);

  return (
    <div className={"oa-endpoint"}>
      <div className={"oa-endpoint__header"}>
        <div className={"oa-endpoint__method-path"}>
          <EditableText className={"oa-endpoint__method"} initial={method} onUpdateEnter={setMethod} onUpdateExit={() => undefined} />
          <EditableText className={"oa-endpoint__path"} initial={path} onUpdateEnter={setPath} onUpdateExit={() => undefined} />
        </div>
        <EditableText className={"oa-endpoint__operation-id"} initial={operationId} onUpdateEnter={setOperationId} onUpdateExit={() => undefined} />
        <div className={"oa-endpoint__description"}>
          <EditableText
            className={"oa-endpoint__description-text"}
            inputClassName={"oa-endpoint__description-textarea"}
            labelClassName={"oa-endpoint__description-label"}
            initial={description}
            multiline={true}
            onUpdateEnter={setDescription}
            onUpdateExit={() => undefined}
          />
        </div>
        <AssignedTags></AssignedTags>
      </div>
      <div className={"oa-endpoint__body"}>
        <EndpointRequest></EndpointRequest>
        <ResponseList></ResponseList>
      </div>
    </div>
  );
}
