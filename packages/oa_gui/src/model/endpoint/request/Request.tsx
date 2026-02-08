import "./Request.css";
import { PathParamList, QueryParamList, RequestHeaderList } from "./Params.js";

export function EndpointRequest() {
  return (
    <div className={"oa-request"}>
      <PathParamList></PathParamList>
      <QueryParamList></QueryParamList>
      <RequestHeaderList></RequestHeaderList>
    </div>
  );
}
