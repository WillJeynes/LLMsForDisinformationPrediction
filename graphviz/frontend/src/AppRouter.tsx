import { useEffect, useState } from "react";
import { VizSmallConnected } from "./VizSmallConnected";
import { VizTimeFilter } from "./VizTimeFilter";

function Home() {
  return (
    <div>
      <h1>Will Jeynes - LLMs for Disinformation Analysis - Graph Visualisations</h1>
      <p><a href="#small">Default</a></p>
      <p><a href="#time">Time-Filter</a></p>
    </div>
  );
}

export function AppRouter() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  console.log(route)
  if (route === "#small") return <VizSmallConnected />;
  if (route === "#time") return <VizTimeFilter />;
  return <Home />;
}