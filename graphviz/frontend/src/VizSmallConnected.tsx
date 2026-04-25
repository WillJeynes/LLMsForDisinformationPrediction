import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3-force-3d";

import data from "./data.json";
import titlesData from "./titles.json";

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildGraph(data) {
  const nodes = [];
  const links = [];

  // Create a lookup map for quick access
  const titleMap = new Map(titlesData.map(t => [t.cluster_id, t.title]));

  data.claim_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Claim Cluster",
      type: "claim_cluster",
      members: cluster.members
    });
  });

  data.event_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Event Cluster",
      type: "event_cluster",
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

function getConnectedComponents(nodes, links) {
  const adj = new Map();

  nodes.forEach(n => adj.set(n.id, new Set()));

  links.forEach(l => {
    adj.get(l.source)?.add(l.target);
    adj.get(l.target)?.add(l.source);
  });

  const visited = new Set();
  const components = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const stack = [node.id];
    const comp = [];

    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;

      visited.add(id);
      comp.push(id);

      adj.get(id)?.forEach(nei => {
        if (!visited.has(nei)) stack.push(nei);
      });
    }

    components.push(comp);
  }

  return components;
}

export function VizSmallConnected() {
  const fgRef = useRef();
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
      fgRef.current.zoom(0.01, 0);
    }
  }, []);

  return (
    <div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node) => node.label}
        nodeAutoColorBy="type"
        linkColor={() => "black"}
        linkWidth={2.5}
        onNodeClick={(node) => setSelectedNode(node)}

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

          const radius = Math.min(10, fontSize * 0.6);

          // background
          ctx.fillStyle = node.type.includes("claim") ? "blue" : "green";
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

      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          borderRadius: "3px",
          backgroundColor: "gray",
          padding: "20px",
          maxWidth: "500px"
        }}
      >
        <p><a href="#home">Go Home</a></p>
         <h2>Config</h2>
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

        <h2>Details</h2>
        {selectedNode ? (
          <div>
            <p><strong>Title:</strong> {selectedNode.label}</p>

            {selectedNode.members && (
              <div>
                <p><strong>Members:</strong></p>
                <ul>
                  {selectedNode.members.map((m) => {
                    const memberData =
                      data.claims.find((c) => c.id === m) ||
                      data.events.find((e) => e.id === m);

                    return (
                      <li key={m}>
                        {memberData ? memberData.text : m}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p>Click a node to see details</p>
        )}
      </div>
    </div>
  );
}