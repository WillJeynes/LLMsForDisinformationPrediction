export function getConnectedComponents(nodes, links) {
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

export function drawRoundedRect(ctx, x, y, width, height, radius) {
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