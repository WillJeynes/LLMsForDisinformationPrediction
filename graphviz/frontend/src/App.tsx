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
            const label = node.label;
            const fontSize = 6 + 2*node.members.length;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            ctx.fillStyle = node.type.includes('claim') ? "blue" : "green";
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(label, node.x, node.y);

            node.__bckgDimensions = bckgDimensions; 
            
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            const bckgDimensions = node.__bckgDimensions;
            bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
          }}
             
        />
      </div>

      <div style={{ position:"absolute", top:0, right:0, borderRadius: "3px", backgroundColor: "gray"}}>
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
