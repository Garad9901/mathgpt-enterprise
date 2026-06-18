import subprocess
import tempfile
import os
import sys

def execute_sympy(code: str) -> dict:
    """
    Executes SymPy code in a subprocess and captures the output.
    Returns a dictionary with success, stdout, stderr, and exit_code.
    """
    # Write the code to a temporary python file
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
        # Ensure imports and basic settings are present if the LLM forgot
        full_code = code
        f.write(full_code.encode("utf-8"))
        temp_path = f.name
        
    try:
        # Execute the script in a subprocess using the current python executable
        result = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout limit
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Execution timed out (10s limit).",
            "exit_code": -1
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Error running SymPy script: {str(e)}",
            "exit_code": -1
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
