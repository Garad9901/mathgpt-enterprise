import os
import requests
import json
import arxiv

from sympy_engine import execute_sympy
from lean_verifier import verify_lean_proof
from llm_client import GEMINI_API_KEY, MODEL_NAME

def search_arxiv_papers(arxiv_query: str) -> list:
    """
    Calls the ArXiv API to search for research papers related to the mathematical query.
    """
    if not arxiv_query or len(arxiv_query.strip()) < 3:
        return []
        
    try:
        search = arxiv.Search(
            query=arxiv_query,
            max_results=4,
            sort_by=arxiv.SortCriterion.Relevance
        )
        client = arxiv.Client()
        papers = []
        for result in client.results(search):
            papers.append({
                "title": result.title,
                "authors": [a.name for a in result.authors],
                "summary": result.summary,
                "url": result.pdf_url,
                "published": result.published.strftime("%Y-%m-%d")
            })
        return papers
    except Exception as e:
        print(f"Error querying ArXiv: {e}")
        return []

def run_enterprise_workflow(user_query: str) -> dict:
    """
    Multi-Agent coordinator workflow:
    1. Query Gemini as a Router/Coordinator to generate:
       - Explanation (Reasoning Agent)
       - SymPy Script (Symbolic Agent)
       - Lean 4 Theorem + Tactic Proof (Formal Proof Agent)
       - Math Conjectures (Conjecture Agent)
       - ArXiv Search String (Research Literature Agent)
    2. Run SymPy calculations in a Python subprocess.
    3. Verify the Lean 4 proof in a compiler subprocess.
    4. Fetch papers from ArXiv.
    """
    if not GEMINI_API_KEY:
        return {
            "error": "GEMINI_API_KEY is not set in environment.",
            "explanation": "Please define GEMINI_API_KEY environment variable.",
            "sympy_code": "",
            "sympy_result": "Failed: missing API key",
            "lean_code": "",
            "lean_status": "Error",
            "lean_output": "API Key is missing",
            "conjectures": [],
            "papers": []
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
    
    system_instruction = (
        "You are MathGPT Enterprise, a multi-agent neuro-symbolic assistant for advanced mathematical research.\n"
        "Given a query, you coordinate five internal specialists and respond with a single JSON object containing these keys:\n"
        "1. 'explanation': (Reasoning Agent) Step-by-step mathematical explanation, using LaTeX equations (e.g. $x^2$ or $$E=mc^2$$).\n"
        "2. 'sympy_code': (Symbolic Agent) Python script using SymPy to verify the calculations. Avoid importing 'truth_table' from utilities. Substitute values manually.\n"
        "3. 'lean_code': (Formal Proof Agent) Valid Lean 4 code. No imports. Tactic proofs must begin with 'by'. Use fully-qualified constructors like 'Nat.succ'/'Nat.zero' or put 'open Nat' above the theorem. Write complete proofs.\n"
        "4. 'conjectures': (Conjecture Agent) Array of objects: [{'title': str, 'statement': str, 'rationale': str}]. Suggest 2 interesting, related mathematical conjectures or generalizations.\n"
        "5. 'arxiv_search_query': (Research Literature Agent) A concise query string to search ArXiv academic papers related to this query (e.g. 'double negation intuitionistic logic' or 'addition commutativity algebra'). Keep it under 6 words.\n\n"
        "You must respond ONLY with a JSON object containing keys: 'explanation', 'sympy_code', 'lean_code', 'conjectures', and 'arxiv_search_query'."
    )
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"Math Query to Analyze: {user_query}"}
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {"text": system_instruction}
            ]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        res_data = response.json()
        
        text_content = res_data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text_content)
        
        explanation = parsed.get("explanation", "")
        sympy_code = parsed.get("sympy_code", "")
        lean_code = parsed.get("lean_code", "")
        conjectures = parsed.get("conjectures", [])
        arxiv_query = parsed.get("arxiv_search_query", "")
        
        # Execute SymPy
        sympy_res = {"success": False, "stdout": "", "stderr": ""}
        if sympy_code:
            sympy_res = execute_sympy(sympy_code)
            
        sympy_result = ""
        if sympy_res.get("success"):
            sympy_result = f"PASSED\nStdout:\n{sympy_res.get('stdout', '')}"
        else:
            sympy_result = f"FAILED\nError:\n{sympy_res.get('stderr', '')}"
            if sympy_res.get("stdout"):
                sympy_result += f"\nStdout:\n{sympy_res.get('stdout')}"
                
        # Verify Lean 4
        lean_res = {"success": False, "status": "Lean 4 Not Setup", "output": ""}
        if lean_code:
            lean_res = verify_lean_proof(lean_code)
            
        # Search ArXiv
        papers = []
        if arxiv_query:
            papers = search_arxiv_papers(arxiv_query)
            
        return {
            "explanation": explanation,
            "sympy_code": sympy_code,
            "sympy_result": sympy_result,
            "lean_code": lean_code,
            "lean_status": lean_res.get("status", "Failed"),
            "lean_output": lean_res.get("output", ""),
            "conjectures": conjectures,
            "papers": papers,
            "arxiv_query": arxiv_query
        }
        
    except Exception as e:
        return {
            "error": f"Enterprise pipeline error: {str(e)}",
            "explanation": f"Workflow failed: {str(e)}",
            "sympy_code": "# Failed",
            "sympy_result": "Failed",
            "lean_code": "-- Failed",
            "lean_status": "Error",
            "lean_output": str(e),
            "conjectures": [],
            "papers": []
        }
