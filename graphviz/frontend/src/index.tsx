import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { useEffect, useState } from "react";
import { VizSmallConnected } from "./VizSmallConnected";
import { VizTimeFilter } from "./VizTimeFilter";
import { Home } from "./Home";
import { VizSmall3D } from "./VizSmall3D";

export function AppRouter() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "#small") return <VizSmallConnected />;
  if (route === "#time") return <VizTimeFilter />;
  if (route === "#3d") return <VizSmall3D />;
  return <Home />;
}

let container = document.getElementById("app")!;
let root = createRoot(container);

root.render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
);