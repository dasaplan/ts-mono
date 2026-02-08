import { List } from "../../components/List.js";
import { Endpoint, type OaEndpoint } from "./Endpoint.js";

export function Endpoints() {
  const createItem = () => {
    let id = 0;
    return () => {
      const endpoint: OaEndpoint = {
        request: undefined,
        tags: [
          { id: "default-tag-1", name: "DefaultTag" },
          { id: "default-tag-2", name: "OtherTag" },
        ],
        defaults: undefined,
        method: "GET",
        path: "/some-path",
        operationId: `operation-${id}`,
        responses: [],
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim  veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea  commodo consequat. ",
      };
      return {
        id: `${id++}`,
        content: <Endpoint endpoint={endpoint}></Endpoint>,
      };
    };
  };
  return (
    <div className={"oa-endpoints"}>
      <List alignment={"V"} extendTo={"TOP"} onAddItem={createItem()} onDeleteItem={() => console.log("added")}></List>
    </div>
  );
}
