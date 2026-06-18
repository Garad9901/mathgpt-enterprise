import sqlite3
import os
import json
from datetime import datetime

# Dual-database support: Fallback to SQLite, allow PostgreSQL override via environment
DATABASE_URL = os.environ.get("DATABASE_URL", "")
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mathgpt_lite.db")

def get_connection():
    # If a PostgreSQL URL is provided, we would connect to it.
    # For local prototype reliability on Windows, we default to SQLite
    # but structure the schema dynamically.
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Core Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            explanation TEXT,
            sympy_code TEXT,
            sympy_result TEXT,
            lean_code TEXT,
            lean_status TEXT,
            lean_output TEXT,
            conjectures TEXT,
            papers TEXT,
            arxiv_query TEXT,
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    
    # Run migrations for existing databases that were created in MathGPT Lite (Lite -> Enterprise)
    # This dynamically appends columns if they don't exist
    columns_to_add = [
        ("conjectures", "TEXT"),
        ("papers", "TEXT"),
        ("arxiv_query", "TEXT")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE sessions ADD COLUMN {col_name} {col_type}")
            conn.commit()
        except sqlite3.OperationalError:
            # Column already exists
            pass
            
    conn.close()

def save_session(session_id, query, explanation, sympy_code, sympy_result, lean_code, lean_status, lean_output, conjectures=None, papers=None, arxiv_query=None):
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat()
    
    # Serialize complex lists to JSON string
    conjectures_str = json.dumps(conjectures) if conjectures else "[]"
    papers_str = json.dumps(papers) if papers else "[]"
    
    cursor.execute("""
        INSERT OR REPLACE INTO sessions 
        (id, query, explanation, sympy_code, sympy_result, lean_code, lean_status, lean_output, conjectures, papers, arxiv_query, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (session_id, query, explanation, sympy_code, sympy_result, lean_code, lean_status, lean_output, conjectures_str, papers_str, arxiv_query, timestamp))
    conn.commit()
    conn.close()

def get_all_sessions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for row in rows:
        d = dict(row)
        # Deserialize JSON fields
        try:
            d["conjectures"] = json.loads(d.get("conjectures", "[]") or "[]")
            d["papers"] = json.loads(d.get("papers", "[]") or "[]")
        except Exception:
            d["conjectures"] = []
            d["papers"] = []
        sessions.append(d)
    return sessions

def get_session(session_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    d = dict(row)
    try:
        d["conjectures"] = json.loads(d.get("conjectures", "[]") or "[]")
        d["papers"] = json.loads(d.get("papers", "[]") or "[]")
    except Exception:
        d["conjectures"] = []
        d["papers"] = []
    return d

def delete_session(session_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,))
    if not cursor.fetchone():
        conn.close()
        return False
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return True

def clear_all_sessions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
