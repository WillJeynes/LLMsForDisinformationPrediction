import React, { useEffect, useMemo, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

import data from "./data.json";

function buildGraph(data) {
  const nodes = [];
  const links = [];

  const claimClusterMap = new Map();
  const eventClusterMap = new Map();

  // Build cluster nodes
  data.claim_clusters.forEach((cluster) => {
    const clusterNode = {
      id: cluster.cluster_id,
      label: cluster.title || "Unnamed Claim Cluster",
      type: "claim_cluster",
      members: cluster.members
    };
    nodes.push(clusterNode);
    claimClusterMap.set(cluster.cluster_id, clusterNode);
  });

  data.event_clusters.forEach((cluster) => {
    const clusterNode = {
      id: cluster.cluster_id,
      label: cluster.title || "Unnamed Event Cluster",
      type: "event_cluster",
      members: cluster.members
    };
    nodes.push(clusterNode);
    eventClusterMap.set(cluster.cluster_id, clusterNode);
  });

  // Build links between clusters
  data.cluster_links.forEach((link) => {
    links.push({ source: link.claim_cluster_id, target: link.event_cluster_id });
  });

  return { nodes, links };
}

export function App() {
  const [selectedNode, setSelectedNode] = useState(null);

  const graphData = useMemo(() => buildGraph(data), []);
  function setNode(node) {
    console.log(node)
    setSelectedNode(node)
  }
  return (
    <div>
      <div>
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node) => node.label}
          nodeAutoColorBy="type"
          //linkDirectionalParticles={1}
          //linkDirectionalParticleSpeed={0.002}
          onNodeRightClick={(node) => setNode(node)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const fontSize = 12;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = node.type.includes('claim') ? "blue" : "green";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2*node.members.length , 0, 2 * Math.PI, false);
            ctx.fill();
            
            if (node.members.length > 2) {
              ctx.fillStyle = "black";
              ctx.fillText(node.label, node.x + 12, node.y + 4);
            }
            
          }}
        />
      </div>

      <div style={{ position:"absolute", top:0, left:0 }}>
        <h2>Details</h2>
        {selectedNode ? (
          <div>
            <p><strong>ID:</strong> {selectedNode.id}</p>
            <p><strong>Type:</strong> {selectedNode.type}</p>
            <p><strong>Title / Label:</strong> {selectedNode.label}</p>
            {selectedNode.members && (
              <div>
                <p><strong>Members:</strong></p>
                <ul>
                  {selectedNode.members.map((m) => {
                    const memberData = data.claims.find(c => c.id === m) || data.events.find(e => e.id === m);
                    return <li key={m}>{memberData ? memberData.text : m}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p>Click a cluster node to see its members</p>
        )}
      </div>
    </div>
  );
}
