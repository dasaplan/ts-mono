import { List } from "../../../components/List.js";
import { EndpointResponse } from "./Response.js";

export function ResponseList() {
  const createItem = () => {
    let id = 0;
    return () => {
      return {
        id: `${id++}`,
        content: <EndpointResponse type={"json"} status={200}></EndpointResponse>,
      };
    };
  };

  return (
    <div className={"oa-response"}>
      <div className={"response-list"}>
        <List alignment={"V"} extendTo={"BOTTOM"} onAddItem={createItem()} onDeleteItem={() => {}}></List>
      </div>
    </div>
  );
}
