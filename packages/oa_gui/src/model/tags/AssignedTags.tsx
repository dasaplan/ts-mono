import { List } from "../../components/List.js";

export function AssignedTags() {
  const createItem = () => {
    let id = 0;
    return () => {
      return {
        id: `${id++}`,
        content: <div className={"oa-endpoint__tag"}>Tag {id}</div>,
      };
    };
  };

  return (
    <div className={"tags-assignment"}>
      <List alignment={"V"} extendTo={"TOP"} onAddItem={createItem()} onDeleteItem={() => {}}></List>
    </div>
  );
}
