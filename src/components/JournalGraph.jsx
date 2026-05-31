import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const API_BASE = "";

const STATE_COLORS = {
  somatic: "#FF7A00",
  emotional: "#FF2D95",
  attention: "#00E5FF",
  cognition: "#32FF7E",
};

const PRACTICE_COLORS = {
  mindfulness: "#8b5cf6",
  meditacion: "#3B82F6",
  visualizacion: "#FF2D95",
  respiracion: "#32FF7E",
  hypnosis: "#FF7A00",
  default: "#8b5cf6",
};

function getPracticeColor(slug) {
  const key = Object.keys(PRACTICE_COLORS).find((k) => slug?.includes(k));
  return PRACTICE_COLORS[key || "default"];
}

const STATE_TYPE_LABELS = {
  somatic: "Somático",
  emotional: "Emocional",
  attention: "Atención",
  cognition: "Cognitivo",
};

export default function JournalGraph({ entries, practices, onSelectEntry, userFilter }) {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterPractice, setFilterPractice] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchGraph = useCallback(async () => {
    try {
      setLoading((prev) => prev === false ? false : true);
      setRefreshing(true);
      const token = localStorage.getItem("psy_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/journal/graph`, { headers });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status}`);
      }

      const data = await res.json();
      setGraphData(data);
      setError(null);
    } catch (err) {
      console.error("Error loading graph:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();

    function onJournalUpdated() { fetchGraph(); }
    window.addEventListener("journal-updated", onJournalUpdated);
    return () => window.removeEventListener("journal-updated", onJournalUpdated);
  }, [fetchGraph]);

  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    renderGraph();
  }, [graphData, filterPractice]);

  function renderGraph() {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    svg.selectAll("*").remove();

    const filteredNodes = graphData.nodes.filter((n) => {
      if (filterPractice === "all") return true;
      if (n.type === "entry") return n.practice === filterPractice;
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = graphData.links.filter(
      (l) => filteredNodeIds.has(l.source.id || l.source) && filteredNodeIds.has(l.target.id || l.target)
    );

    if (filteredNodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(255,255,255,0.4)")
        .attr("font-size", "16px")
        .text("No hay datos para el filtro seleccionado");
      return;
    }

    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(25));

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const link = g.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", (d) => Math.max(0.5, d.weight * 2.5))
      .attr("stroke-opacity", (d) => 0.2 + d.weight * 0.5);

    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.each(function (d) {
      const el = d3.select(this);

      if (d.type === "entry") {
        el.append("circle")
          .attr("r", 12)
          .attr("fill", getPracticeColor(d.practice))
          .attr("stroke", "rgba(255,255,255,0.3)")
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.9);

        el.append("circle")
          .attr("r", 5)
          .attr("fill", "rgba(255,255,255,0.3)");
      } else {
        el.append("polygon")
          .attr("points", "0,-10 8,7 -8,7")
          .attr("fill", STATE_COLORS[d.stateType] || "#aaa")
          .attr("stroke", "rgba(255,255,255,0.3)")
          .attr("stroke-width", 1)
          .attr("opacity", 0.85);
      }
    });

    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);

      if (d.type === "entry" && onSelectEntry) {
        const entry = entries.find((e) => e.id === parseInt(d.id.replace("entry-", "")));
        if (entry) onSelectEntry(entry);
      }
    });

    node.on("mouseenter", function (event, d) {
      d3.select(this).select("circle, polygon")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      const connectedLinks = filteredLinks.filter(
        (l) => (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
      );
      const connectedIds = new Set(
        connectedLinks.flatMap((l) => [(l.source.id || l.source), (l.target.id || l.target)])
      );

      node.filter((n) => n.id !== d.id && !connectedIds.has(n.id))
        .select("circle, polygon")
        .transition()
        .duration(200)
        .attr("opacity", 0.15);

      link.filter((l) => (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id)
        .transition()
        .duration(200)
        .attr("stroke", "rgba(255,255,255,0.6)")
        .attr("stroke-width", (l) => Math.max(1, l.weight * 3));
    });

    node.on("mouseleave", function () {
      node.select("circle, polygon")
        .transition()
        .duration(300)
        .attr("opacity", d3.select(this.parentNode).datum().type === "entry" ? 0.9 : 0.85);

      link.transition()
        .duration(300)
        .attr("stroke", "rgba(255,255,255,0.15)")
        .attr("stroke-width", (d) => Math.max(0.5, d.weight * 2.5));
    });

    const label = node.append("text")
      .text((d) => {
        if (d.type === "entry") return `${d.fecha}`;
        return d.label;
      })
      .attr("x", (d) => d.type === "entry" ? 16 : 14)
      .attr("y", 4)
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("font-size", (d) => d.type === "entry" ? "11px" : "10px")
      .attr("font-family", "monospace")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.8)");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }

  const uniquePractices = [...new Set((graphData?.nodes || []).filter((n) => n.type === "entry").map((n) => n.practice))];

  if (loading) {
    return (
      <div className="jg-loading">
        <div className="jp-spinner"></div>
        <p>Generando grafo de conocimiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jg-empty">
        <p>Error al cargar el grafo: {error}</p>
      </div>
    );
  }

  const selectedNodeData = selectedNode ? (graphData?.nodes || []).find((n) => n.id === selectedNode.id) : null;

  return (
    <div className="journal-graph">
      <div className="graph-toolbar">
        <div className="graph-filters">
          <label className="graph-filter-label">
            Práctica:
            <select
              className="graph-select"
              value={filterPractice}
              onChange={(e) => setFilterPractice(e.target.value)}
            >
              <option value="all">Todas</option>
              {uniquePractices.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        {refreshing && <span className="graph-refreshing">Refrescando...</span>}
        <div className="graph-legend">
          <div className="legend-section">
            <span className="legend-title">Entradas</span>
            <div className="legend-dot" style={{ background: "#8b5cf6" }}></div>
            <span className="legend-label">por práctica</span>
          </div>
          <div className="legend-section">
            <span className="legend-title">Estados</span>
            {Object.entries(STATE_TYPE_LABELS).map(([key, label]) => (
              <span key={key} className="legend-state">
                <span
                  className="legend-diamond"
                  style={{ background: STATE_COLORS[key] }}
                ></span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="graph-container">
        <svg ref={svgRef} width="100%" height="600"></svg>
      </div>

      {selectedNodeData && (
        <div className="graph-node-info">
          {selectedNodeData.type === "entry" ? (
            <>
              <span className="node-info-title">
                <span className="node-dot" style={{ background: getPracticeColor(selectedNodeData.practice) }}></span>
                {selectedNodeData.fecha} · {selectedNodeData.practice}
              </span>
              {selectedNodeData.insight && (
                <span className="node-info-text">Insight: {selectedNodeData.insight}</span>
              )}
              <span className="node-info-text">Pre: {selectedNodeData.estado_previo}</span>
              <span className="node-info-text">Post: {selectedNodeData.estado_post}</span>
            </>
          ) : (
            <>
              <span className="node-info-title">
                <span className="node-diamond" style={{ background: STATE_COLORS[selectedNodeData.stateType] }}></span>
                {selectedNodeData.label}
              </span>
              <span className="node-info-text">
                Tipo: {STATE_TYPE_LABELS[selectedNodeData.stateType] || selectedNodeData.stateType}
              </span>
            </>
          )}
        </div>
      )}

      <style>{`
        .journal-graph {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px 0;
        }
        .graph-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
        }
        .graph-refreshing {
          color: rgba(139, 92, 246, 0.8);
          font-size: 12px;
          animation: jg-pulse 1s ease-in-out infinite;
        }
        @keyframes jg-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .graph-filters {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .graph-filter-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.6);
          font-size: 13px;
        }
        .graph-select {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.8);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        .graph-select option {
          background: #1a1a2e;
          color: rgba(255,255,255,0.8);
        }
        .graph-legend {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          align-items: center;
        }
        .legend-section {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .legend-title {
          color: rgba(255,255,255,0.7);
          font-weight: 600;
          margin-right: 4px;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-diamond {
          width: 8px;
          height: 8px;
          display: inline-block;
          transform: rotate(45deg);
          margin: 0 4px;
        }
        .legend-state {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .graph-container {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow: hidden;
          min-height: 600px;
        }
        .graph-container svg {
          display: block;
        }
        .graph-node-info {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .node-info-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          font-weight: 600;
        }
        .node-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .node-diamond {
          width: 8px;
          height: 8px;
          display: inline-block;
          transform: rotate(45deg);
        }
        .node-info-text {
          color: rgba(255,255,255,0.55);
          font-size: 12px;
          margin-left: 18px;
        }
        .jg-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: rgba(255,255,255,0.55);
          padding: 40px 0;
        }
        .jp-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: jg-spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes jg-spin {
          to { transform: rotate(360deg); }
        }
        .jg-empty {
          text-align: center;
          padding: 40px 0;
          color: rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  );
}
