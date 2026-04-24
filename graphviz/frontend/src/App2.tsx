import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3-force-3d";

import data from "./data_date.json";
import titlesData from "./titles_date.json";

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

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 2016) return null; // filter erroneous
  return d;
}

function monthsDiff(a, b) {
  const ms = Math.abs(a - b);
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

function buildLookupMaps(data) {
  const claimMap = new Map(data.claims.map(c => [c.id, c]));
  const eventMap = new Map(data.events.map(e => [e.id, e]));
  return { claimMap, eventMap };
}

function computeClusterAvgDate(members, claimMap, eventMap) {
  const dates = [];

  members.forEach(id => {
    const c = claimMap.get(id);
    const e = eventMap.get(id);

    const raw = c?.date || e?.date;
    const parsed = parseDateSafe(raw);

    if (parsed) dates.push(parsed.getTime());
  });

  if (!dates.length) return null;

  const avg = dates.reduce((a, b) => a + b, 0) / dates.length;
  return new Date(avg);
}

function buildGraph(data) {
  const nodes = [];
  const links = [];

  const titleMap = new Map(titlesData.map(t => [t.cluster_id, t.title]));
  const { claimMap, eventMap } = buildLookupMaps(data);

  data.claim_clusters.forEach((cluster) => {
    const avgDate = computeClusterAvgDate(cluster.members, claimMap, eventMap);

    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Claim Cluster",
      type: "claim_cluster",
      members: cluster.members,
      avgDate
    });
  });

  data.event_clusters.forEach((cluster) => {
    const avgDate = computeClusterAvgDate(cluster.members, claimMap, eventMap);

    nodes.push({
      id: cluster.cluster_id,
      label: titleMap.get(cluster.cluster_id) || cluster.title || "Unnamed Event Cluster",
      type: "event_cluster",
      members: cluster.members,
      avgDate
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

export function App2() {
  const fgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [inputDate, setInputDate] = useState(Date.now());

  const parsedInputDate = useMemo(() => {
    const d = new Date(inputDate);
    return isNaN(d.getTime()) ? null : d;
  }, [inputDate]);

  const graphData = useMemo(() => {
    const full = buildGraph(data);
    const components = getConnectedComponents(full.nodes, full.links);

    const validIds = new Set(
      components.filter(c => c.length > 1000).flat()
    );

    return {
      nodes: full.nodes.filter(n => validIds.has(n.id)),
      links: full.links.filter(
        l => validIds.has(l.source) && validIds.has(l.target)
      )
    };
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;

    fgRef.current.d3Force("charge", d3.forceManyBody().strength(-30));

    fgRef.current.d3Force(
      "link",
      d3.forceLink().distance(140)
    );

    fgRef.current.d3Force(
      "collision",
      d3.forceCollide((node) => {
        const dims = node.__bckgDimensions;
        return dims ? Math.max(dims[0], dims[1]) / 2 + 32 : 40;
      })
    );

    fgRef.current.d3ReheatSimulation();
  }, [graphData]);

  const timeRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    [...data.claims, ...data.events].forEach(d => {
      if (!d.date) return;
      const t = parseDateSafe(d.date)?.getTime();
      if (t == null) {
        return
      }
      if (t < min) min = t;
      if (t > max) max = t;
    });

    return { min, max };
  }, []);


  function isNodeHighlighted(node, referenceDate) {
    if (!referenceDate || !node.avgDate) return false;
    const diffMonths = Math.abs(referenceDate - node.avgDate) / (1000 * 60 * 60 * 24 * 30.44);
    return diffMonths <= 6;
  }

  const highlightedNodeIds = useMemo(() => {
    if (!parsedInputDate) return new Set();

    const set = new Set();

    graphData.nodes.forEach((n) => {
      if (isNodeHighlighted(n, parsedInputDate)) {
        set.add(n.id);
      }
    });

    return set;
  }, [graphData.nodes, parsedInputDate]);

  return (
    <div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node) => node.label}
        nodeAutoColorBy="type"
        linkColor={(link) => {
          const sourceId =
            typeof link.source === "object" ? link.source.id : link.source;

          const targetId =
            typeof link.target === "object" ? link.target.id : link.target;

          const bothHighlighted =
            highlightedNodeIds.has(sourceId) &&
            highlightedNodeIds.has(targetId);

          return bothHighlighted ? "orange" : "white";
        }}
        linkWidth={2.5}
        onNodeClick={(node) => setSelectedNode(node)}
        nodeCanvasObject={(node, ctx) => {
          const label = node.label;

          const fontSize = 16 + 32 * Math.min(node.members.length, 5);
          ctx.font = `${fontSize}px Sans-Serif`;

          const textWidth = ctx.measureText(label).width;
          const padding = fontSize * 0.6;

          const width = textWidth + padding;
          const height = fontSize + padding;

          const x = node.x - width / 2;
          const y = node.y - height / 2;

          const radius = Math.min(10, fontSize * 0.6);

          let isHighlighted = false;

          if (parsedInputDate && node.avgDate) {
            const diffMonths = monthsDiff(parsedInputDate, node.avgDate);
            isHighlighted = diffMonths <= 6;
          }

          ctx.fillStyle = node.type.includes("claim")
            ? "blue"
            : "green"

          if (isHighlighted) {
            drawRoundedRect(ctx, x, y, width, height, radius);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.fillText(label, node.x, node.y);

          }



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

        <h2>Details</h2>
        {selectedNode ? (
          <div>

            <p><strong>Title:</strong> {selectedNode.label}</p>
            <p><strong>Date: </strong>{new Date(selectedNode.avgDate).toISOString().slice(0, 10)}</p>
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
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "#222",
          padding: "10px 20px",
          boxSizing: "border-box",
          zIndex: 10
        }}
      >
        <input
          type="range"
          min={timeRange.min}
          max={timeRange.max}
          value={inputDate}
          onChange={(e) => setInputDate(new Number(e.target.value))}
          style={{
            width: "100%"
          }}
        />

        <div style={{ color: "white", fontSize: "12px", marginTop: "5px" }}>
          {new Date(inputDate).toISOString().slice(0, 10)} (± 6 months window)
        </div>
      </div>
    </div>
  );
}