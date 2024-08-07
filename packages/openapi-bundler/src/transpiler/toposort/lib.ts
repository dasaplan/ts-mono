/***
 https://github.com/marcelklehr/toposort/blob/master/License

 Toposort - Topological sorting for node.js
 Copyright (c) 2012 by Marcel Klehr <mklehr@gmx.net>
 MIT LICENSE
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

type Edge<T> = [T, T];
type Node<T> = T;
/**
 * Topological sorting function
 *
 * @param {Array} edges
 * @returns {Array}
 */
export default function <T>(edges: Array<Edge<T>>) {
  return toposort(uniqueNodes(edges), edges);
}

export const array = toposort;

function toposort<T>(nodes: Array<Node<T>>, edges: Array<Edge<T>>) {
  let cursor = nodes.length,
    i = cursor;
  const sorted = new Array(cursor),
    visited: Record<number, boolean> = {},
    // Better data structures make algorithm much faster.
    outgoingEdges = makeOutgoingEdges(edges),
    nodesHash = makeNodesHash(nodes);

  // check for unknown nodes
  edges.forEach(function (edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      const unkonownNode = !nodesHash.has(edge[0]) ? edge[0] : edge[1];
      throw new Error(
        `Unknown node. There is an unknown node '${unkonownNode}' in the supplied edges: [${edge[0]}, ${edge[1]}]`
      );
    }
  });

  while (i--) {
    if (!visited[i]) visit(nodes[i], i, new Set());
  }

  return sorted;

  function visit<T>(node: T, i: number, predecessors: Set<T>) {
    if (predecessors.has(node)) {
      let nodeRep;
      try {
        nodeRep = ", node was:" + JSON.stringify(node);
      } catch (e) {
        nodeRep = "";
      }
      throw new Error("Cyclic dependency" + nodeRep);
    }

    if (!nodesHash.has(node)) {
      throw new Error(
        "Found unknown node. Make sure to provided all involved nodes. Unknown node: " +
          JSON.stringify(node)
      );
    }

    if (visited[i]) return;
    visited[i] = true;

    let outgoing = outgoingEdges.get(node) || new Set();
    outgoing = Array.from(outgoing);

    if ((i = outgoing.length)) {
      predecessors.add(node);
      do {
        const child = outgoing[--i];
        visit(child, nodesHash.get(child), predecessors);
      } while (i);
      predecessors.delete(node);
    }

    sorted[--cursor] = node;
  }
}

function uniqueNodes<T>(arr: Array<Edge<T>>) {
  const res = new Set();
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i];
    res.add(edge[0]);
    res.add(edge[1]);
  }
  return Array.from(res);
}

function makeOutgoingEdges<T>(arr: Array<Edge<T>>) {
  const edges = new Map();
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i];
    if (!edges.has(edge[0])) edges.set(edge[0], new Set());
    if (!edges.has(edge[1])) edges.set(edge[1], new Set());
    edges.get(edge[0]).add(edge[1]);
  }
  return edges;
}

function makeNodesHash<T>(arr: Array<Node<T>>) {
  const res = new Map();
  for (let i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i);
  }
  return res;
}
