import { Canvas } from "../../components/Canvas.js";
import { Sidebar } from "../../components/Sidebar.js";
import { ContextArea } from "../../components/ContextArea.js";
import { Toolbar } from "./components/Toolbar.js";
import "./DesignerPage.css";

export function DesignerPage() {
  return (
    <div className={"designer"}>
      <Toolbar></Toolbar>
      <Sidebar></Sidebar>
      <Canvas></Canvas>
      <ContextArea></ContextArea>
    </div>
  );
}
