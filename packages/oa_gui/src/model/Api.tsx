import { useEffect, useState } from "react";
import { EditableText } from "../components/EditableText.js";
import "./Api.css";
export interface OaApi {
  openapiVersion: string;
  title: string;
  summary: string;
  description: string;
  version: string;
}

/**
 openapi version - string - OpenAPI Specification version
 title 	string 	REQUIRED. The title of the API.
 summary 	string 	A short summary of the API.
 description 	string 	A description of the API. [CommonMark] syntax MAY be used for rich text representation.
 version 	string 	REQUIRED. The version of the OpenAPI document (which is distinct from the OpenAPI Specification version or the version of the API being described or the version of the OpenAPI Description).
 * @constructor
 */
export function Api(props: { api?: OaApi } = {}) {
  const { api } = props;
  const initialApi: OaApi = api ?? {
    openapiVersion: "3.0.3",
    title: "New API",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim  veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea  commodo consequat. ",
    version: "1.0.0",
  };

  const [openapiVersion, setOpenapiVersion] = useState(initialApi.openapiVersion);
  const [title, setTitle] = useState(initialApi.title);
  const [summary, setSummary] = useState(initialApi.summary);
  const [description, setDescription] = useState(initialApi.description);
  const [version, setVersion] = useState(initialApi.version);

  useEffect(() => {
    if (!api) {
      return;
    }
    setOpenapiVersion(api.openapiVersion);
    setTitle(api.title);
    setSummary(api.summary);
    setDescription(api.description);
    setVersion(api.version);
  }, [api]);

  return (
    <div className={"oa-api"}>
      <div className={"oa-api__header"}>
        <div className={"oa-api__title-row"}>
          <div className={"oa-api__title-group"}>
            <EditableText className={"oa-api__title"} initial={title} onUpdateEnter={setTitle} onUpdateExit={() => undefined} />
            <EditableText className={"oa-api__version"} initial={version} onUpdateEnter={setVersion} onUpdateExit={() => undefined} />
          </div>
          <div className={"oa-api__openapi"}>
            <span className={"oa-api__openapi-prefix"}>(version:</span>
            <EditableText className={"oa-api__openapi-version"} initial={openapiVersion} onUpdateEnter={setOpenapiVersion} onUpdateExit={() => undefined} />
            <span className={"oa-api__openapi-suffix"}>)</span>
          </div>
        </div>
      </div>
      <div className={"oa-api__description"}>
        <EditableText
          className={"oa-api__description-text"}
          inputClassName={"oa-api__description-input"}
          labelClassName={"oa-api__description-label"}
          initial={description}
          multiline={true}
          onUpdateEnter={setDescription}
          onUpdateExit={() => undefined}
        />
      </div>
      <div className={"oa-api__summary"}>
        <EditableText
          className={"oa-api__summary-text"}
          inputClassName={"oa-api__summary-input"}
          labelClassName={"oa-api__summary-label"}
          initial={summary}
          multiline={true}
          onUpdateEnter={setSummary}
          onUpdateExit={() => undefined}
        />
      </div>
    </div>
  );
}
