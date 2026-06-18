from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import os

from database import init_db, save_session, get_all_sessions, get_session, delete_session, clear_all_sessions
from sympy_engine import execute_sympy
from lean_verifier import verify_lean_proof, LEAN_PATH
from agents import run_enterprise_workflow, search_arxiv_papers
from knowledge_graph import init_graph_db, get_graph, add_node, add_edge

# Initialize SQLite tables & Knowledge Graph seeding
init_db()
init_graph_db()

app = FastAPI(title="MathGPT Enterprise API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

class CustomCodeRequest(BaseModel):
    code: str

class NodeRequest(BaseModel):
    id: str
    type: str
    description: str = ""

class EdgeRequest(BaseModel):
    source: str
    target: str
    relation: str

@app.get("/api/health")
def health_check():
    lean_installed = os.path.exists(LEAN_PATH)
    return {
        "status": "healthy",
        "lean_installed": lean_installed,
        "lean_path": LEAN_PATH
    }

@app.post("/api/query")
def process_query(payload: QueryRequest):
    """
    Executes the full multi-agent MathGPT Enterprise workflow.
    """
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = run_enterprise_workflow(query)
    
    # Generate unique session ID
    session_id = str(uuid.uuid4())
    
    # Save the session to the DB
    save_session(
        session_id=session_id,
        query=query,
        explanation=result.get("explanation", ""),
        sympy_code=result.get("sympy_code", ""),
        sympy_result=result.get("sympy_result", ""),
        lean_code=result.get("lean_code", ""),
        lean_status=result.get("lean_status", "Failed"),
        lean_output=result.get("lean_output", ""),
        conjectures=result.get("conjectures", []),
        papers=result.get("papers", []),
        arxiv_query=result.get("arxiv_query", "")
    )
    
    # Proactively add any generated conjectures to our Knowledge Graph
    for conj in result.get("conjectures", []):
        title = conj.get("title", "")
        stmt = conj.get("statement", "")
        rationale = conj.get("rationale", "")
        if title:
            # Add conjecture to graph
            add_node(title, "conjecture", f"{stmt} | Rationale: {rationale}")
            # Connect the main math query area to the conjecture
            # Find a matching node or relate it generally
            add_edge(title, "Intuitionistic Logic" if "negation" in stmt.lower() else "Addition Commutativity", "generalized_by")
            
    response_payload = {
        "id": session_id,
        "query": query,
        **result
    }
    
    return response_payload

@app.get("/api/sessions")
def list_sessions():
    return get_all_sessions()

@app.get("/api/sessions/{session_id}")
def retrieve_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/api/sessions/{session_id}")
def remove_session(session_id: str):
    deleted = delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

@app.delete("/api/sessions")
def clear_sessions():
    clear_all_sessions()
    return {"message": "All sessions cleared successfully"}

# --- Lean 4 custom compilation endpoint (Lean 4 Proof Studio) ---
@app.post("/api/compile-lean")
def compile_lean_code(payload: CustomCodeRequest):
    """Compiles and verifies custom Lean 4 proof code from proof studio editor."""
    code = payload.code
    res = verify_lean_proof(code)
    return res

# --- SymPy custom execution endpoint (Symbolic Workspace) ---
@app.post("/api/compile-sympy")
def compile_sympy_code(payload: CustomCodeRequest):
    """Executes custom SymPy code in Python subprocess."""
    code = payload.code
    res = execute_sympy(code)
    
    sympy_result = ""
    if res.get("success"):
        sympy_result = f"PASSED\nStdout:\n{res.get('stdout', '')}"
    else:
        sympy_result = f"FAILED\nError:\n{res.get('stderr', '')}"
        if res.get("stdout"):
            sympy_result += f"\nStdout:\n{res.get('stdout')}"
            
    return {
        "success": res.get("success"),
        "result": sympy_result
    }

# --- Knowledge Graph Endpoints ---
@app.get("/api/graph")
def fetch_knowledge_graph():
    """Returns nodes and edges representing the math knowledge graph."""
    return get_graph()

@app.post("/api/graph/nodes")
def insert_graph_node(payload: NodeRequest):
    """Allows user to manually add a node (theorem/axiom/conjecture) to the graph."""
    if not payload.id.strip():
        raise HTTPException(status_code=400, detail="Node ID cannot be empty")
    add_node(payload.id.strip(), payload.type.strip(), payload.description.strip())
    return {"message": f"Node '{payload.id}' added successfully"}

@app.post("/api/graph/edges")
def insert_graph_edge(payload: EdgeRequest):
    """Allows user to connect two mathematical concepts together."""
    if not payload.source.strip() or not payload.target.strip():
        raise HTTPException(status_code=400, detail="Source and target nodes must be specified")
    add_edge(payload.source.strip(), payload.target.strip(), payload.relation.strip())
    return {"message": "Edge added successfully"}

# --- Literature Search Endpoint ---
@app.get("/api/papers/search")
def search_papers(q: str):
    """Standalone endpoint to query ArXiv for papers."""
    if not q or len(q.strip()) < 3:
        return []
    papers = search_arxiv_papers(q)
    return papers
