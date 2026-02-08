import { Endpoints } from "../model/endpoint/Endpoints.js";
import { Api } from "../model/Api.js";
import { Tags } from "../model/tags/Tags.js";

export function Canvas() {
  return (
    <div className={"canvas"}>
      <Api></Api>
      <Tags></Tags>
      <Endpoints></Endpoints>
    </div>
  );
}
