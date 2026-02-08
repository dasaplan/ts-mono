import { List } from "../../components/List.js";
import "./Tags.css";

export function Tags() {
  const createItem = () => {
    let id = 0;
    return () => ({
      id: `${id++}`,
      content: <div>Tag {id}</div>,
    });
  };
  return (
    <div className={"oa-tags"}>
      <List alignment={"H"} extendTo={"RIGHT"} onAddItem={createItem()} onDeleteItem={() => console.log("added")}></List>
    </div>
  );
}
