import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
  Plus, 
  Trash2, 
  Play, 
  Sparkles, 
  Calculator, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  Database, 
  BookOpen, 
  Terminal, 
  Cpu,
  Network,
  Search,
  BookOpenCheck,
  Code,
  GitCommit,
  Lightbulb,
  ExternalLink,
  Sigma
} from 'lucide-react';

const API_BASE = "http://localhost:8000/api";

const MATH_SYMBOLS = [
  { label: "Integral", value: "\\int_{a}^{b} x^2 \\, dx" },
  { label: "Summation", value: "\\sum_{i=1}^{n} i" },
  { label: "Limit", value: "\\lim_{n \\to \\infty} \\frac{1}{n} = 0" },
  { label: "Fraction", value: "\\frac{a}{b}" },
  { label: "Square Root", value: "\\sqrt{x}" },
  { label: "Partial Derivative", value: "\\frac{\\partial f}{\\partial x}" },
  { label: "Implies (->)", value: "p \\implies q" },
  { label: "Equivalence (<->)", value: "p \\iff q" },
  { label: "For All", value: "\\forall x \\in \\mathbb{R}" },
  { label: "Exists", value: "\\exists y \\in \\mathbb{N}" },
  { label: "Matrix", value: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Pi/Theta", value: "\\pi + \\theta" }
];

export default function App() {
  const [currentSection, setCurrentSection] = useState("solver"); // solver, lean-studio, sympy-solver, latex-workbench, explorer, literature
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Custom Editors state
  const [customLeanCode, setCustomLeanCode] = useState("");
  const [customLeanOutput, setCustomLeanOutput] = useState("");
  const [customLeanStatus, setCustomLeanStatus] = useState("Idle");
  const [compilingLean, setCompilingLean] = useState(false);
  
  const [customSympyCode, setCustomSympyCode] = useState("");
  const [customSympyOutput, setCustomSympyOutput] = useState("");
  const [compilingSympy, setCompilingSympy] = useState(false);

  // LaTeX workbench state
  const [latexCode, setLatexCode] = useState("\\int x \\sin(x) \\, dx");
  const [latexPreviewHtml, setLatexPreviewHtml] = useState("");

  // Knowledge Graph state
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphEdges, setGraphEdges] = useState([]);
  const [newNodeId, setNewNodeId] = useState("");
  const [newNodeType, setNewNodeType] = useState("theorem");
  const [newNodeDesc, setNewNodeDesc] = useState("");
  const [newEdgeSource, setNewEdgeSource] = useState("");
  const [newEdgeTarget, setNewEdgeTarget] = useState("");
  const [newEdgeRelation, setNewEdgeRelation] = useState("implies");

  // Literature search state
  const [paperSearchQuery, setPaperSearchQuery] = useState("");
  const [papers, setPapers] = useState([]);
  const [searchingPapers, setSearchingPapers] = useState(false);

  // Copy buttons
  const [copiedSympy, setCopiedSympy] = useState(false);
  const [copiedLean, setCopiedLean] = useState(false);

  // Health / Lean status
  const [leanInstalled, setLeanInstalled] = useState(false);
  const [installingLean, setInstallingLean] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchSessions();
    checkHealth();
    fetchGraph();
  }, []);

  // Update LaTeX preview dynamically when code changes
  useEffect(() => {
    try {
      const html = katex.renderToString(latexCode || "", { displayMode: true, throwOnError: false });
      setLatexPreviewHtml(html);
    } catch (e) {
      setLatexPreviewHtml(`<span style="color: var(--color-error)">Syntax Error: ${e.message}</span>`);
    }
  }, [latexCode]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setLeanInstalled(data.lean_installed);
      }
    } catch (err) {
      console.error("Health check failed:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          loadSession(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch(`${API_BASE}/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphNodes(data.nodes || []);
        setGraphEdges(data.edges || []);
      }
    } catch (err) {
      console.error("Failed to load knowledge graph:", err);
    }
  };

  const loadSession = (session) => {
    setActiveSession(session);
    setCustomLeanCode(session.lean_code || "");
    setCustomLeanStatus(session.lean_status || "Idle");
    setCustomLeanOutput(session.lean_output || "");
    setCustomSympyCode(session.sympy_code || "");
    setCustomSympyOutput(session.sympy_result || "");
  };

  const handleInstallLean = async () => {
    setInstallingLean(true);
    try {
      const res = await fetch(`${API_BASE}/install-lean`, { method: 'POST' });
      if (res.ok) {
        alert("Lean 4 background installation triggered. This may take 2-3 minutes. Please refresh later.");
      }
    } catch (err) {
      alert("Installation check error: " + err.message);
    } finally {
      setInstallingLean(false);
      checkHealth();
    }
  };

  const handleSubmit = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const queryText = customQuery || query;
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg("");
    setLoadingStep(0);
    setActiveSession(null);
    setCurrentSection("solver");

    // Simulated multi-agent steps
    const steps = [
      setTimeout(() => setLoadingStep(1), 2000), // SymPy calculus
      setTimeout(() => setLoadingStep(2), 4000), // Lean Proof Draft
      setTimeout(() => setLoadingStep(3), 6000), // Compile Verifier
    ];

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Multi-Agent pipeline execution failed.");
      }

      const data = await res.json();
      steps.forEach(clearTimeout);
      
      setSessions(prev => [data, ...prev]);
      loadSession(data);
      setQuery("");
      fetchGraph(); // Reload knowledge graph with new conjectures
    } catch (err) {
      steps.forEach(clearTimeout);
      setErrorMsg(err.message || "Pipeline execution failed.");
    } finally {
      setIsLoading(false);
      checkHealth();
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSession?.id === id) {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all history?")) return;
    try {
      const res = await fetch(`${API_BASE}/sessions`, { method: "DELETE" });
      if (res.ok) {
        setSessions([]);
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to clear sessions:", err);
    }
  };

  // Compile custom code in Lean Proof Studio
  const handleVerifyLeanCustom = async () => {
    if (!customLeanCode.trim()) return;
    setCompilingLean(true);
    setCustomLeanStatus("Compiling...");
    try {
      const res = await fetch(`${API_BASE}/compile-lean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: customLeanCode })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomLeanStatus(data.status);
        setCustomLeanOutput(data.output || "Success.");
      } else {
        setCustomLeanStatus("Failed");
        setCustomLeanOutput("Server error while compiling Lean code.");
      }
    } catch (err) {
      setCustomLeanStatus("Error");
      setCustomLeanOutput(err.message);
    } finally {
      setCompilingLean(false);
    }
  };

  // Compile custom SymPy code
  const handleCompileSympyCustom = async () => {
    if (!customSympyCode.trim()) return;
    setCompilingSympy(true);
    try {
      const res = await fetch(`${API_BASE}/compile-sympy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: customSympyCode })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomSympyOutput(data.result);
      } else {
        setCustomSympyOutput("Server error executing SymPy script.");
      }
    } catch (err) {
      setCustomSympyOutput(err.message);
    } finally {
      setCompilingSympy(false);
    }
  };

  // Add graph node
  const handleAddGraphNode = async (e) => {
    e.preventDefault();
    if (!newNodeId.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/graph/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newNodeId, type: newNodeType, description: newNodeDesc })
      });
      if (res.ok) {
        setNewNodeId("");
        setNewNodeDesc("");
        fetchGraph();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add graph edge
  const handleAddGraphEdge = async (e) => {
    e.preventDefault();
    if (!newEdgeSource.trim() || !newEdgeTarget.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/graph/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: newEdgeSource, target: newEdgeTarget, relation: newEdgeRelation })
      });
      if (res.ok) {
        setNewEdgeSource("");
        setNewEdgeTarget("");
        fetchGraph();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Search papers standalone
  const handlePaperSearch = async (e) => {
    e.preventDefault();
    if (!paperSearchQuery.trim()) return;
    setSearchingPapers(true);
    try {
      const res = await fetch(`${API_BASE}/papers/search?q=${encodeURIComponent(paperSearchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingPapers(false);
    }
  };

  const insertSymbol = (val) => {
    setLatexCode(prev => prev + " " + val);
  };

  // Formula rendering helper
  const renderFormula = (text) => {
    try {
      // Find matches for $$...$$ and $...$
      const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
      return parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const eq = part.slice(2, -2);
          const html = katex.renderToString(eq, { displayMode: true, throwOnError: false });
          return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const eq = part.slice(1, -1);
          const html = katex.renderToString(eq, { displayMode: false, throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        
        // Simple backticks fallback
        const codeParts = part.split(/(\`[^\`]+\`)/g);
        return (
          <React.Fragment key={i}>
            {codeParts.map((sub, k) => {
              if (sub.startsWith('`') && sub.endsWith('`')) {
                return <code key={k} style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: 'var(--color-accent-light)' }}>{sub.slice(1, -1)}</code>;
              }
              return sub;
            })}
          </React.Fragment>
        );
      });
    } catch (e) {
      return text;
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'sympy') {
      setCopiedSympy(true);
      setTimeout(() => setCopiedSympy(false), 2000);
    } else {
      setCopiedLean(true);
      setTimeout(() => setCopiedLean(false), 2000);
    }
  };

  const getLeanBadge = (status) => {
    switch(status) {
      case "Passed":
        return <span className="verification-badge passed"><CheckCircle2 size={12} /> Lean 4 Verified</span>;
      case "Failed (uses sorry)":
        return <span className="verification-badge uses-sorry"><AlertCircle size={12} /> Contains Sorry</span>;
      case "Lean 4 Not Detected":
        return <span className="verification-badge failed"><AlertCircle size={12} /> Lean Not Detected</span>;
      default:
        return <span className="verification-badge failed"><XCircle size={12} /> Verification Failed</span>;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation & Session List */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">M</div>
          <h1 className="sidebar-title">MathGPT<span>Enterprise</span></h1>
        </div>

        {/* Workspaces list */}
        <div className="nav-section">
          <button 
            className={`nav-item ${currentSection === "solver" ? "active" : ""}`}
            onClick={() => setCurrentSection("solver")}
          >
            <Sparkles size={16} />
            Multi-Agent Solver
          </button>
          <button 
            className={`nav-item ${currentSection === "lean-studio" ? "active" : ""}`}
            onClick={() => setCurrentSection("lean-studio")}
          >
            <ShieldCheck size={16} />
            Lean 4 Proof Studio
          </button>
          <button 
            className={`nav-item ${currentSection === "sympy-solver" ? "active" : ""}`}
            onClick={() => setCurrentSection("sympy-solver")}
          >
            <Calculator size={16} />
            Symbolic Workspace
          </button>
          <button 
            className={`nav-item ${currentSection === "latex-workbench" ? "active" : ""}`}
            onClick={() => setCurrentSection("latex-workbench")}
          >
            <Sigma size={16} />
            LaTeX Math Workbench
          </button>
          <button 
            className={`nav-item ${currentSection === "explorer" ? "active" : ""}`}
            onClick={() => setCurrentSection("explorer")}
          >
            <Network size={16} />
            Theorem Explorer
          </button>
          <button 
            className={`nav-item ${currentSection === "literature" ? "active" : ""}`}
            onClick={() => setCurrentSection("literature")}
          >
            <BookOpenCheck size={16} />
            Literature Analyzer
          </button>
        </div>

        {/* Query History */}
        <div className="session-list-container">
          <div className="session-section-title">Query Logs</div>
          <div className="session-list">
            {sessions.map((s) => (
              <div 
                key={s.id}
                className={`session-item ${activeSession?.id === s.id ? 'active' : ''}`}
                onClick={() => loadSession(s)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flexGrow: 1 }}>
                  <div className="session-query-text">{s.query}</div>
                  <div className="session-date">
                    {new Date(s.timestamp + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <button 
                  className="delete-session-btn"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Lean 4 Verifier:</span>
              {leanInstalled ? (
                <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="dot green"></span> Running
                </span>
              ) : (
                <span style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="dot red"></span> Missing
                  <button onClick={handleInstallLean} style={{ padding: '2px 5px', fontSize: '0.7rem', background: 'var(--color-accent)', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer' }}>Install</button>
                </span>
              )}
            </div>
            {sessions.length > 0 && (
              <button className="clear-history-btn" style={{ padding: '6px', fontSize: '0.75rem', marginTop: '10px' }} onClick={handleClearHistory}>
                Clear Query History
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Dashboard */}
      <main className="main-dashboard">
        <header className="dashboard-header">
          <div className="dashboard-title">
            {currentSection === "solver" && (activeSession ? "Verification Result Pipeline" : "Multi-Agent Neuro-Symbolic Assistant")}
            {currentSection === "lean-studio" && "Lean 4 Formal Proof Studio"}
            {currentSection === "sympy-solver" && "Symbolic Workspace (SymPy Solver)"}
            {currentSection === "latex-workbench" && "LaTeX Math Workbench"}
            {currentSection === "explorer" && "Mathematical Knowledge Graph Explorer"}
            {currentSection === "literature" && "Academic Literature Analyzer (ArXiv)"}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentSection === "solver" && activeSession && getLeanBadge(activeSession.lean_status)}
            {currentSection === "lean-studio" && (
              <span className={`verification-badge ${customLeanStatus === 'Passed' ? 'passed' : customLeanStatus.includes('Compiling') ? 'loading' : 'failed'}`}>
                {customLeanStatus}
              </span>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="dashboard-content">
          
          {/* Section 1: Solver Workspace */}
          {currentSection === "solver" && (
            <>
              {/* Landing state */}
              {!activeSession && !isLoading && !errorMsg && (
                <div className="landing-container" style={{ padding: '20px 0' }}>
                  <div className="landing-hero" style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '2.5rem' }}>MathGPT Enterprise Assistant</h1>
                    <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                      Conjecture, compute, search literature, and verify proofs formally. Powered by multi-agent reasoning, SymPy mathematics, and the Lean 4 proof assistant.
                    </p>
                  </div>

                  <div className="query-box-wrapper" style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleSubmit} className="query-box">
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Enter mathematical theorem, conjecture, or algebra statement..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <button type="submit" className="submit-btn" disabled={!query.trim()}>
                        <Play size={18} fill="white" />
                      </button>
                    </form>
                  </div>

                  <div className="conjecture-grid" style={{ width: '100%', maxWidth: '800px', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    {[
                      { title: "Addition is Commutative", statement: "a + b = b + a", query: "Prove that addition is commutative for natural numbers in Lean 4, and construct SymPy verification logic." },
                      { title: "Propositional Logic", statement: "p implies not not p", query: "Prove in Lean 4 that for any proposition p, p implies not not p. Check truth tables using SymPy." },
                      { title: "Algebraic Expansion", statement: "(a + b)^2 = a^2 + 2ab + b^2", query: "Prove expansion identity of (a + b)^2 and verify algebraic steps with SymPy." },
                      { title: "De Morgan's Laws", statement: "not (p or q) = not p and not q", query: "Prove De Morgan's Law for logical disjunction negation in Lean 4. Use SymPy to double check truth values." }
                    ].map((s, i) => (
                      <div key={i} className="suggestion-card" onClick={() => handleSubmit(null, s.query)}>
                        <div className="suggestion-title">{s.title}</div>
                        <div className="suggestion-desc">{s.statement}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Box */}
              {errorMsg && (
                <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--color-error)', padding: '20px', borderRadius: '10px' }}>
                  <div style={{ color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={18} color="var(--color-error)" /> Multi-Agent Execution Failed
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>{errorMsg}</div>
                  <button onClick={() => setErrorMsg("")} style={{ marginTop: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
                </div>
              )}

              {/* Pipeline loading views */}
              {isLoading && (
                <div className="loading-workflow" style={{ margin: '40px auto' }}>
                  <div className="loading-title">
                    <Loader2 size={18} className="spinner" />
                    Multi-Agent Logical Verification Routing...
                  </div>
                  <div className="loading-steps">
                    {[
                      { label: "Reasoning & Literature Agent", desc: "Synthesizing natural language proof logic and compiling ArXiv queries..." },
                      { label: "Symbolic Calculus Agent", desc: "Formulating SymPy algebraic expressions and substituting boundaries..." },
                      { label: "Formal Proof Builder", desc: "Synthesizing Lean 4 theorem declarations and inductive step parameters..." },
                      { label: "Formal Tactic Compiler", desc: "Compiling file.lean via lean.exe to formally verify structural goals..." }
                    ].map((step, idx) => (
                      <div key={idx} className={`loading-step ${loadingStep === idx ? 'active' : ''} ${loadingStep > idx ? 'completed' : ''}`}>
                        <div className="step-icon-container">
                          {loadingStep > idx ? <CheckCircle2 size={15} /> : <Sparkles size={13} />}
                        </div>
                        <div className="step-details">
                          <div className="step-name">{step.label}</div>
                          <div className="step-desc">{step.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solved details */}
              {activeSession && !isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Row 1: Explanation and Code Split */}
                  <div className="workspace-split" style={{ height: 'auto', gridTemplateColumns: '1.2fr 1fr' }}>
                    <div className="pane-left">
                      <div className="pane-header">
                        <div className="pane-title"><BookOpen size={16} color="var(--color-accent-light)" /> Reasoning & Explanation</div>
                      </div>
                      <div className="pane-body">
                        {renderFormula(activeSession.explanation)}
                      </div>
                    </div>

                    <div className="pane-right" style={{ height: '500px' }}>
                      <div className="pane-header">
                        <div className="pane-title"><ShieldCheck size={16} color="var(--color-success)" /> Lean 4 Verification</div>
                      </div>
                      <div className="pane-body" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <div style={{ flexGrow: 1, position: 'relative' }}>
                          <Editor
                            height="100%"
                            language="lean"
                            theme="vs-dark"
                            value={activeSession.lean_code}
                            options={{ readOnly: true, minimap: { enabled: false } }}
                          />
                        </div>
                        <div style={{ height: '140px', background: '#0e0f16', borderTop: '1px solid var(--border-color)', padding: '12px', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <Terminal size={12} /> Lean 4 Compiler Output
                          </div>
                          <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: activeSession.lean_status === 'Passed' ? 'var(--color-success)' : 'var(--color-error)' }}>
                            {activeSession.lean_output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Conjectures and Papers split */}
                  <div className="workspace-split" style={{ height: 'auto', gridTemplateColumns: '1fr 1fr' }}>
                    
                    {/* Conjectures */}
                    <div className="pane-left" style={{ height: 'auto' }}>
                      <div className="pane-header">
                        <div className="pane-title"><Lightbulb size={16} color="var(--color-warning)" /> Generated Conjectures</div>
                      </div>
                      <div className="pane-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeSession.conjectures && activeSession.conjectures.length > 0 ? (
                          activeSession.conjectures.map((c, i) => (
                            <div key={i} className="conjecture-card">
                              <div className="conjecture-title">{c.title}</div>
                              <div className="conjecture-stmt">{c.statement}</div>
                              <div className="conjecture-rationale">{c.rationale}</div>
                              <button 
                                className="add-to-graph-btn"
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE}/graph/nodes`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ id: c.title, type: "conjecture", description: c.statement })
                                    });
                                    alert(`Conjecture "${c.title}" added to Knowledge Graph!`);
                                    fetchGraph();
                                  } catch (e) { console.error(e); }
                                }}
                              >
                                <GitCommit size={12} /> Add to Knowledge Graph
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No conjectures generated.</div>
                        )}
                      </div>
                    </div>

                    {/* ArXiv Literature */}
                    <div className="pane-right" style={{ height: 'auto' }}>
                      <div className="pane-header">
                        <div className="pane-title"><BookOpenCheck size={16} color="var(--color-info)" /> Literature Search (ArXiv)</div>
                        {activeSession.arxiv_query && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Query: "{activeSession.arxiv_query}"</span>
                        )}
                      </div>
                      <div className="pane-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {activeSession.papers && activeSession.papers.length > 0 ? (
                          activeSession.papers.map((p, i) => (
                            <div key={i} className="paper-card">
                              <div className="paper-title">{p.title}</div>
                              <div className="paper-authors">{p.authors.join(", ")}</div>
                              <div className="paper-abstract">{p.summary.slice(0, 220)}...</div>
                              <div className="paper-footer">
                                <span>Published: {p.published}</span>
                                <a href={p.url} target="_blank" rel="noreferrer" className="pdf-link">
                                  <ExternalLink size={12} /> Read PDF
                                </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No matching literature found on ArXiv.</div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* SymPy Section */}
                  <div className="pane-left" style={{ height: '400px' }}>
                    <div className="pane-header">
                      <div className="pane-title"><Calculator size={16} color="var(--color-accent-light)" /> SymPy Symbolic Solver Workspace</div>
                    </div>
                    <div className="pane-body" style={{ display: 'flex', padding: 0, height: '100%' }}>
                      <div style={{ width: '50%', borderRight: '1px solid var(--border-color)', position: 'relative' }}>
                        <Editor
                          height="100%"
                          language="python"
                          theme="vs-dark"
                          value={activeSession.sympy_code}
                          options={{ readOnly: true, minimap: { enabled: false } }}
                        />
                      </div>
                      <div style={{ width: '50%', background: '#090a0e', padding: '16px', overflowY: 'auto' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <Terminal size={12} /> Symbolic Execution Results
                        </div>
                        <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#10b981', whiteSpace: 'pre-wrap' }}>
                          {activeSession.sympy_result}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Query footer */}
                  <div className="query-box-wrapper" style={{ marginTop: '10px' }}>
                    <form onSubmit={handleSubmit} className="query-box">
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Enter another mathematical statement..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <button type="submit" className="submit-btn" disabled={!query.trim()}>
                        <Play size={18} fill="white" />
                      </button>
                    </form>
                  </div>

                </div>
              )}
            </>
          )}

          {/* Section 2: Lean Proof Studio */}
          {currentSection === "lean-studio" && (
            <div className="workspace-split">
              <div className="pane-left">
                <div className="pane-header">
                  <div className="pane-title"><ShieldCheck size={16} /> Write Lean 4 Proof Code</div>
                  <button 
                    className="compile-tactic-btn" 
                    onClick={handleVerifyLeanCustom}
                    disabled={compilingLean}
                  >
                    {compilingLean ? <Loader2 size={13} className="spinner" /> : <Play size={12} />}
                    Verify Tactic Proof
                  </button>
                </div>
                <div className="pane-body" style={{ padding: 0, position: 'relative' }}>
                  <Editor
                    height="100%"
                    language="lean"
                    theme="vs-dark"
                    value={customLeanCode || "-- Enter custom Lean 4 proof here...\n"}
                    onChange={(val) => setCustomLeanCode(val)}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </div>
              
              <div className="pane-right">
                <div className="pane-header">
                  <div className="pane-title"><Terminal size={16} /> Compiler Verification Log</div>
                </div>
                <div className="pane-body" style={{ background: '#090a0f' }}>
                  <pre className="tactic-console-output" style={{ color: customLeanStatus === 'Passed' ? 'var(--color-success)' : customLeanStatus.includes('Compiling') ? 'var(--color-info)' : 'var(--color-error)' }}>
                    {customLeanOutput || "Lean 4 compiler feedback console. Type proof and click Verify."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: SymPy Solver Custom */}
          {currentSection === "sympy-solver" && (
            <div className="workspace-split">
              <div className="pane-left">
                <div className="pane-header">
                  <div className="pane-title"><Calculator size={16} /> SymPy Symbolic Workbench</div>
                  <button 
                    className="compile-tactic-btn" 
                    onClick={handleCompileSympyCustom}
                    disabled={compilingSympy}
                    style={{ background: 'var(--color-info)' }}
                  >
                    {compilingSympy ? <Loader2 size={13} className="spinner" /> : <Play size={12} />}
                    Execute Calculus Script
                  </button>
                </div>
                <div className="pane-body" style={{ padding: 0, position: 'relative' }}>
                  <Editor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    value={customSympyCode || "import sympy as sp\n# Write custom SymPy code here...\n"}
                    onChange={(val) => setCustomSympyCode(val)}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </div>

              <div className="pane-right">
                <div className="pane-header">
                  <div className="pane-title"><Terminal size={16} /> Subprocess Execution logs</div>
                </div>
                <div className="pane-body" style={{ background: '#090a0f' }}>
                  <pre className="tactic-console-output" style={{ color: '#10b981' }}>
                    {customSympyOutput || "Calculus result log. Click Execute to compile."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: LaTeX Math Workbench (Interactive Mathematical UI) */}
          {currentSection === "latex-workbench" && (
            <div className="workspace-split" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
              <div className="pane-left" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="pane-header">
                  <div className="pane-title"><Sigma size={16} /> LaTeX Equation Editor</div>
                  <button 
                    className="compile-tactic-btn" 
                    onClick={() => handleSubmit(null, `Explain and verify the mathematical statement: ${latexCode}`)}
                    disabled={isLoading || !latexCode.trim()}
                  >
                    <Sparkles size={12} />
                    Verify with Solver
                  </button>
                </div>
                
                <div className="pane-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ flexGrow: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Type mathematical expressions in LaTeX:</label>
                    <textarea 
                      className="form-textarea"
                      style={{ flexGrow: 1, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', padding: '12px' }}
                      value={latexCode}
                      onChange={(e) => setLatexCode(e.target.value)}
                      placeholder="e.g. \int x \sin(x) \, dx = \sin(x) - x \cos(x) + C"
                    />
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '8px' }}>Click to insert templates & symbols:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {MATH_SYMBOLS.map((sym, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          className="graph-node-badge"
                          style={{ justifyContent: 'center', padding: '8px', fontSize: '0.75rem' }}
                          onClick={() => insertSymbol(sym.value)}
                        >
                          {sym.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pane-right">
                <div className="pane-header">
                  <div className="pane-title"><BookOpen size={16} /> KaTeX Live Mathematical Preview</div>
                </div>
                <div className="pane-body" style={{ background: '#090a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div 
                    className="latex-preview-container" 
                    style={{ width: '100%', minHeight: '150px', background: 'transparent', border: 'none' }}
                    dangerouslySetInnerHTML={{ __html: latexPreviewHtml }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Theorem Explorer & Knowledge Graph */}
          {currentSection === "explorer" && (
            <div className="graph-explorer-grid">
              
              {/* Visualizer list */}
              <div className="graph-visualizer">
                <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Network size={16} color="var(--color-accent-light)" /> Mathematical Concept Maps
                </h3>
                
                <div className="graph-elements-container">
                  <div className="node-group">
                    <div className="node-group-title">Axioms</div>
                    <div className="nodes-list">
                      {graphNodes.filter(n => n.type === 'axiom').map((n, i) => (
                        <div key={i} className="graph-node-badge axiom" title={n.description}>
                          {n.id}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="node-group">
                    <div className="node-group-title">Definitions</div>
                    <div className="nodes-list">
                      {graphNodes.filter(n => n.type === 'definition').map((n, i) => (
                        <div key={i} className="graph-node-badge definition" title={n.description}>
                          {n.id}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="node-group">
                    <div className="node-group-title">Theorems</div>
                    <div className="nodes-list">
                      {graphNodes.filter(n => n.type === 'theorem').map((n, i) => (
                        <div key={i} className="graph-node-badge theorem" title={n.description}>
                          {n.id}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="node-group">
                    <div className="node-group-title">Conjectures</div>
                    <div className="nodes-list">
                      {graphNodes.filter(n => n.type === 'conjecture').map((n, i) => (
                        <div key={i} className="graph-node-badge conjecture" title={n.description}>
                          {n.id}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="node-group" style={{ marginTop: '10px' }}>
                    <div className="node-group-title">Relationships (Edges)</div>
                    <div className="edges-list">
                      {graphEdges.map((e, i) => (
                        <div key={i} className="graph-edge-row">
                          <span className="edge-node">{e.source}</span>
                          <span className="edge-relation">{e.relation}</span>
                          <span className="edge-node">{e.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor sidebar */}
              <div className="graph-editor-panel">
                
                {/* Node Form */}
                <form onSubmit={handleAddGraphNode} className="graph-form">
                  <div className="graph-form-title">Register Math Concept (Node)</div>
                  
                  <div className="form-group">
                    <label>Concept Title / Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Riemann Hypothesis"
                      value={newNodeId}
                      onChange={(e) => setNewNodeId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Node Classification</label>
                    <select 
                      className="form-select"
                      value={newNodeType}
                      onChange={(e) => setNewNodeType(e.target.value)}
                    >
                      <option value="axiom">Axiom</option>
                      <option value="theorem">Theorem</option>
                      <option value="conjecture">Conjecture</option>
                      <option value="definition">Definition</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Logical description</label>
                    <textarea 
                      className="form-textarea"
                      placeholder="Brief logical statement or formula..."
                      value={newNodeDesc}
                      onChange={(e) => setNewNodeDesc(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="form-submit-btn">Insert Node</button>
                </form>

                {/* Edge Form */}
                <form onSubmit={handleAddGraphEdge} className="graph-form">
                  <div className="graph-form-title">Establish Relationship (Edge)</div>

                  <div className="form-group">
                    <label>Source Node</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Peano Axioms"
                      value={newEdgeSource}
                      onChange={(e) => setNewEdgeSource(e.target.value)}
                      list="graph-nodes-datalist"
                    />
                  </div>

                  <div className="form-group">
                    <label>Connection / Link Type</label>
                    <select 
                      className="form-select"
                      value={newEdgeRelation}
                      onChange={(e) => setNewEdgeRelation(e.target.value)}
                    >
                      <option value="implies">implies / proves</option>
                      <option value="defines">defines</option>
                      <option value="supports">supports</option>
                      <option value="generalized_by">generalized by</option>
                      <option value="uses">uses</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Node</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Nat Addition"
                      value={newEdgeTarget}
                      onChange={(e) => setNewEdgeTarget(e.target.value)}
                      list="graph-nodes-datalist"
                    />
                  </div>

                  <button type="submit" className="form-submit-btn" style={{ background: 'var(--color-info)' }}>Link Concepts</button>
                </form>

                <datalist id="graph-nodes-datalist">
                  {graphNodes.map((n, idx) => (
                    <option key={idx} value={n.id} />
                  ))}
                </datalist>

              </div>
            </div>
          )}

          {/* Section 6: Literature Search Standalone */}
          {currentSection === "literature" && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div className="query-box-wrapper" style={{ marginBottom: '24px' }}>
                <form onSubmit={handlePaperSearch} className="query-box">
                  <input
                    type="text"
                    className="query-input"
                    placeholder="Search math papers on ArXiv (e.g. 'homotopy type theory' or 'prime number gaps')..."
                    value={paperSearchQuery}
                    onChange={(e) => setPaperSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="submit-btn" disabled={!paperSearchQuery.trim() || searchingPapers}>
                    {searchingPapers ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
                  </button>
                </form>
              </div>

              {searchingPapers && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', justifyContent: 'center', padding: '40px' }}>
                  <Loader2 size={18} className="spinner" /> Querying ArXiv API repositories...
                </div>
              )}

              <div className="paper-cards-grid">
                {papers.map((p, idx) => (
                  <div key={idx} className="paper-card">
                    <div className="paper-title">{p.title}</div>
                    <div className="paper-authors">{p.authors.join(", ")}</div>
                    <div className="paper-abstract">{p.summary}</div>
                    <div className="paper-footer">
                      <span>Published: {p.published}</span>
                      <a href={p.url} target="_blank" rel="noreferrer" className="pdf-link">
                        <ExternalLink size={12} /> Read PDF
                      </a>
                    </div>
                  </div>
                ))}

                {!searchingPapers && papers.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Type a query above to explore mathematical literature on ArXiv.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
