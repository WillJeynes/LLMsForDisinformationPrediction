import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3-force-3d";

import data from "./data/data.json";
import titlesData from "./data/titles.json";
import HomeButton from "./utils/HomeButton";
import { FloatingPanel } from "./utils/FloatingPanel";
import { DetailsPanel } from "./utils/DetailsPanel";
import { FloatingPanelStack } from "./utils/FloatingPanelStack";
import { drawRoundedRect, getConnectedComponents } from "./graph/common";

export function buildGraph(data) {
  const nodes = [];
  const links = [];

  // Create a lookup map for quick access
  const titleMap = new Map(titlesData.map(t => [t.cluster_id, t.title]));

  data.claim_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Claim Cluster",
      type: "claim_cluster",
      type_nice: "Claim",
      members: cluster.members
    });
  });

  data.event_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Event Cluster",
      type: "event_cluster",
      type_nice: "Event",
      members: cluster.members
    });
  });

  data.cluster_links.forEach((link) => {
    links.push({
      source: link.claim_cluster_id,
      target: link.event_cluster_id
    });
  });

  return { nodes, links };
}


export function VizSmallConnected() {
  const fgRef = useRef();
  const detailsPanelRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [minGraphSize, setMinGraphSize] = useState(10);

  const graphData = useMemo(() => {
    const full = buildGraph(data);

    const components = getConnectedComponents(full.nodes, full.links);

    // keep only components large enough
    const validIds = new Set(
      components
        .filter(comp => comp.length >= minGraphSize && comp.length < 50)
        .flat()
    );

    const filteredNodes = full.nodes.filter(n => validIds.has(n.id));

    const filteredLinks = full.links.filter(
      l => validIds.has(l.source) && validIds.has(l.target)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [minGraphSize]);

  useEffect(() => {
    if (!fgRef.current) return;

    // Stronger repulsion
    fgRef.current.d3Force(
      "charge",
      d3.forceManyBody().strength(-10000)
    );



    // Link distance
    fgRef.current.d3Force(
      "link",
      d3.forceLink().distance(140)
    );

    // Collision based on dynamic box size
    fgRef.current.d3Force(
      "collision",
      d3.forceCollide((node) => {
        const dims = node.__bckgDimensions;
        return dims ? Math.max(dims[0], dims[1]) / 2 + 32 : 40;
      })
    );

    fgRef.current.d3ReheatSimulation();
  }, [graphData]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoom(0.05, 0);
    }
  }, []);

  return (
    <div>
      <HomeButton />
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node) => node.label}
        nodeAutoColorBy="type"
        linkColor={() => "black"}
        linkWidth={2.5}
        onNodeClick={(node) => { detailsPanelRef.current.open(); setSelectedNode(node) }}
        linkDirectionalArrowLength={100}
        linkDirectionalArrowRelPos={0.9}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 16 + 32 * node.members.length;

          ctx.font = `${fontSize}px Sans-Serif`;

          const textWidth = ctx.measureText(label).width;
          const padding = fontSize * 0.6;

          const width = textWidth + padding;
          const height = fontSize + padding;

          const x = node.x - width / 2;
          const y = node.y - height / 2;

          const radius = node.type.includes("claim") ? fontSize * 6 : 0;

          // background
          ctx.fillStyle = node.type.includes("claim") ? "DarkMagenta" : "green";
          drawRoundedRect(ctx, x, y, width, height, radius);
          ctx.fill();

          // optional border
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1;
          ctx.stroke();

          // text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "white";
          ctx.fillText(label, node.x, node.y);

          // store dimensions for collision + pointer
          node.__bckgDimensions = [width, height];
          node.__bckgPos = { x, y };
        }}

        nodePointerAreaPaint={(node, color, ctx) => {
          const dims = node.__bckgDimensions;
          const pos = node.__bckgPos;

          if (!dims || !pos) return;

          ctx.fillStyle = color;
          drawRoundedRect(ctx, pos.x, pos.y, dims[0], dims[1], 6);
          ctx.fill();
        }}
      />
      <FloatingPanelStack>
        <DetailsPanel selectedNode={selectedNode} data={data} ref={detailsPanelRef} />
        <FloatingPanel title={"Key"}>
          <p style={{ backgroundColor: "green" }} className="text-white p-1 text-xl mb-3">Trigger Event Cluster</p>
          <p style={{ backgroundColor: "DarkMagenta" }} className="text-white p-1 text-xl rounded-3xl">Claim Cluster</p>
        </FloatingPanel>
        <FloatingPanel title={"Config"} defaultOpen={false}>
          <label>
            Min connected graph size: <strong>{minGraphSize}</strong>
          </label>
          <br />
          <input
            type="range"
            min="9"
            max="20"
            value={minGraphSize}
            onChange={(e) => setMinGraphSize(Number(e.target.value))}
          />
        </FloatingPanel>
      </FloatingPanelStack>
    </div>
  );
}