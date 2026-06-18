import os
import requests
import json
from dotenv import load_dotenv

# Load local environment configuration
load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-2.5-flash"

def query_math_gpt(user_query: str) -> dict:
    """
    Queries the Gemini API to get a structured JSON response containing:
    - explanation
    - sympy_code
    - lean_code
    """
    if not GEMINI_API_KEY:
        return {
            "error": "GEMINI_API_KEY is not set in the environment variables.",
            "explanation": "API Key is missing. Please set GEMINI_API_KEY.",
            "sympy_code": "",
            "lean_code": ""
        }
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
    
    system_instruction = (
        "You are MathGPT Lite, an advanced neuro-symbolic mathematical assistant.\n"
        "Your task is to take a natural language mathematical query and produce three outputs inside a JSON structure:\n"
        "1. 'explanation': A beautiful, detailed, clear step-by-step mathematical explanation of the problem, writing any equations in LaTeX format (e.g. $x^2$ or $$E = mc^2$$).\n"
        "2. 'sympy_code': A complete Python script using SymPy that performs symbolic computations or checks to verify the statement. The script must be executable as-is. Do NOT try to import 'truth_table' from 'sympy.logic.utilities'. Instead, define symbols, create expressions using sp.Not, sp.And, sp.Implies, and check equivalence or print truth values by substituting values manually.\n"
        "3. 'lean_code': A valid Lean 4 file (.lean) that formalizes the statement as a theorem and proves it. Follow these strict rules for Lean 4:\n"
        "   - Do NOT include any 'import' statements (propositional logic and basic arithmetic are built-in and need no imports).\n"
        "   - CRITICAL: Every single proof utilizing tactics (like 'induction', 'rw', 'intro', 'apply', 'exact', 'cases', 'simp', 'rfl') MUST start with the 'by' keyword (e.g., ':= by'). You must NEVER write a list of tactics after ':=' without the word 'by', as this is a syntax error that causes an 'unknown identifier' compiler failure.\n"
        "   - If you are working with natural numbers (Nat) and constructors like 'succ' and 'zero', either use their fully-qualified names ('Nat.succ' and 'Nat.zero') or open the Nat namespace by adding 'open Nat' above the theorem. Using 'succ' or 'zero' unqualified as terms without 'open Nat' will cause an 'unknown identifier' error.\n"
        "   - Do not use 'sorry' in the final proof; write a complete proof.\n\n"
        "You must respond ONLY with a JSON object containing keys: 'explanation', 'sympy_code', and 'lean_code'."
    )
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"User mathematical query: {user_query}"}
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
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        res_data = response.json()
        
        # Extract response text
        text_content = res_data["candidates"][0]["content"]["parts"][0]["text"]
        
        # Parse structured JSON
        parsed_response = json.loads(text_content)
        
        # Ensure correct keys are present
        return {
            "explanation": parsed_response.get("explanation", "No explanation generated."),
            "sympy_code": parsed_response.get("sympy_code", ""),
            "lean_code": parsed_response.get("lean_code", "")
        }
        
    except Exception as e:
        # Fallback if parsing or call fails
        return {
            "error": f"Failed to query LLM or parse response: {str(e)}",
            "explanation": f"An error occurred while generating the solution: {str(e)}",
            "sympy_code": "# SymPy code generation failed",
            "lean_code": "-- Lean 4 code generation failed"
        }
