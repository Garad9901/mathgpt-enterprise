import sqlite3
import os

from database import DB_PATH, get_connection

def init_graph_db():
    """Initializes tables for storing knowledge graph nodes and edges."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Nodes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS graph_nodes (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT
        )
    """)
    
    # Edges table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS graph_edges (
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            relation TEXT NOT NULL,
            PRIMARY KEY (source, target, relation),
            FOREIGN KEY (source) REFERENCES graph_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (target) REFERENCES graph_nodes(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    
    # Check if graph is empty. If so, seed default mathematical relationships.
    cursor.execute("SELECT COUNT(*) FROM graph_nodes")
    if cursor.fetchone()[0] == 0:
        seed_default_graph(cursor)
        conn.commit()
        
    conn.close()

def add_node(node_id: str, node_type: str, description: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO graph_nodes (id, type, description)
        VALUES (?, ?, ?)
    """, (node_id, node_type, description))
    conn.commit()
    conn.close()

def add_edge(source: str, target: str, relation: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO graph_edges (source, target, relation)
            VALUES (?, ?, ?)
        """, (source, target, relation))
        conn.commit()
    except sqlite3.IntegrityError:
        pass  # Node doesn't exist yet, or constraint failed
    finally:
        conn.close()

def get_graph() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM graph_nodes")
    nodes = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM graph_edges")
    edges = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "nodes": nodes,
        "edges": edges
    }

def seed_default_graph(cursor):
    """Seed the database with a default math knowledge graph."""
    nodes = [
        ("Peano Axioms", "axiom", "A set of axioms for natural numbers formulated by Giuseppe Peano."),
        ("Nat Definition", "definition", "Definition of Natural Numbers as an inductive type with zero and succ."),
        ("Addition on Nats", "definition", "Inductive definition of addition: n + 0 = n, n + succ(m) = succ(n + m)."),
        ("Addition Identity", "theorem", "Theorem proving n + 0 = n."),
        ("Addition Commutativity", "theorem", "Theorem proving that for all Nat a and b, a + b = b + a."),
        ("Propositional Calculus", "axiom", "A formal system in which formulas representing propositions can be formed and proven."),
        ("Double Negation Introduction", "theorem", "Theorem in propositional logic proving that p implies not not p (p -> ¬¬p)."),
        ("Double Negation Elimination", "theorem", "Classical logic theorem stating that not not p implies p (¬¬p -> p)."),
        ("Law of Excluded Middle", "axiom", "Classical axiom stating that for any proposition, it is either true or its negation is true (p v ¬p)."),
        ("Intuitionistic Logic", "definition", "A system of logic that rejects the Law of Excluded Middle and Double Negation Elimination.")
    ]
    
    edges = [
        ("Peano Axioms", "Nat Definition", "defines"),
        ("Nat Definition", "Addition on Nats", "uses"),
        ("Addition on Nats", "Addition Identity", "proves"),
        ("Addition on Nats", "Addition Commutativity", "proves"),
        ("Addition Identity", "Addition Commutativity", "supports"),
        ("Propositional Calculus", "Double Negation Introduction", "proves"),
        ("Propositional Calculus", "Double Negation Elimination", "proves"),
        ("Intuitionistic Logic", "Double Negation Introduction", "accepts"),
        ("Intuitionistic Logic", "Double Negation Elimination", "rejects"),
        ("Law of Excluded Middle", "Double Negation Elimination", "implies")
    ]
    
    cursor.executemany("INSERT INTO graph_nodes (id, type, description) VALUES (?, ?, ?)", nodes)
    cursor.executemany("INSERT INTO graph_edges (source, target, relation) VALUES (?, ?, ?)", edges)
