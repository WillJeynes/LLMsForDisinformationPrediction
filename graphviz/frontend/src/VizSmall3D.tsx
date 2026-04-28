import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";

import data from "./data/data.json";
import titlesData from "./data/titles.json";
import HomeButton from "./utils/HomeButton";
import { FloatingPanel } from "./utils/FloatingPanel";
import { DetailsPanel } from "./utils/DetailsPanel";
import { FloatingPanelStack } from "./utils/FloatingPanelStack";
import { drawRoundedRect, getConnectedComponents } from "./graph/common";
import { buildGraph } from "./VizSmallConnected";
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

export function VizSmall3D() {
  const fgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [minGraphSize, setMinGraphSize] = useState(10);
  const [showLabel, setShowLabel] = useState(false);

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


  return (
    <div>
      <HomeButton />
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node) => node.label}
        nodeAutoColorBy="type"
        linkColor={() => "black"}
        linkWidth={2.5}
        onNodeClick={(node) => setSelectedNode(node)}
        backgroundColor="white"
        nodeThreeObject={(node) => {
          const circle = new THREE.Mesh(
            new THREE.SphereGeometry(node.members.length * 2),
            new THREE.MeshLambertMaterial({
              color: node.type.includes("claim") ? "DarkMagenta" : "green",
              transparent: true,
              opacity: 0.75
            }));
          
          if (!showLabel) {
            return circle;
          }

          const group = new THREE.Group();
          group.add(circle);

          const text = new SpriteText(node.label);
          text.textHeight = 8;
          text.offsetY = -12;
          text.color = "black";

          group.add(text);

          return group;
        }
        }
      />
      <FloatingPanelStack>
        <DetailsPanel selectedNode={selectedNode} data={data} />
        <FloatingPanel title={"Config"}>
          <label className="flex">
            <span className="mr-1 grow">Show Labels</span>
            <input
              type="checkbox"
              checked={showLabel}
              onChange={() => setShowLabel(!showLabel)}
            />
          </label>
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