import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3-force-3d";

import data from "./data.json";

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

  data.claim_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: cluster.title || "Unnamed Claim Cluster",
      type: "claim_cluster",
      members: cluster.members
    });
  });

  data.event_clusters.forEach((cluster) => {
    nodes.push({
      id: cluster.cluster_id,
      label: cluster.title || "Unnamed Event Cluster",
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

export function App() {
  const fgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);

  const graphData = useMemo(() => buildGraph(data), []);

  useEffect(() => {
    if (!fgRef.current) return;

    // Stronger repulsion
    fgRef.current.d3Force(
      "charge",
      d3.forceManyBody().strength(-3000)
    );

    // Link distance
    fgRef.current.d3Force(
      "link",
      d3.forceLink().distance(240)
    );

    // Collision based on dynamic box size
    fgRef.current.d3Force(
      "collision",
      d3.forceCollide((node) => {
        const dims = node.__bckgDimensions;
        return dims ? Math.max(dims[0], dims[1]) / 2 + 16 : 20;
      })
    );

    fgRef.current.d3ReheatSimulation();
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
        onNodeRightClick={(node) => setSelectedNode(node)}

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
          top: 0,
          right: 0,
          borderRadius: "3px",
          backgroundColor: "gray",
          padding: "10px",
          maxWidth: "300px"
        }}
      >
        <h2>Details</h2>
        {selectedNode ? (
          <div>
            <p><strong>ID:</strong> {selectedNode.id}</p>
            <p><strong>Type:</strong> {selectedNode.type}</p>
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
          <p>Right-click a cluster node to see its members</p>
        )}
      </div>
    </div>
  );
}