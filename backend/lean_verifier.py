import subprocess
import tempfile
import os

# Default elan-installed Lean 4 path on Windows
LEAN_PATH = os.path.expandvars(r"%USERPROFILE%\.elan\bin\lean.exe")

def verify_lean_proof(code: str, custom_path: str = None) -> dict:
    """
    Writes the Lean 4 code to a temporary file and executes the Lean compiler to verify it.
    Returns a dictionary indicating verification status and compiler logs.
    """
    path_to_run = custom_path or LEAN_PATH
    
    if not os.path.exists(path_to_run):
        return {
            "success": False,
            "status": "Lean 4 Not Detected",
            "output": f"Lean 4 compiler not found at: {path_to_run}\nPlease make sure Lean 4 is installed via elan."
        }
        
    # Write code to a temp file
    with tempfile.NamedTemporaryFile(suffix=".lean", delete=False) as f:
        f.write(code.encode("utf-8"))
        temp_path = f.name
        
    try:
        # Run lean compiler
        result = subprocess.run(
            [path_to_run, temp_path],
            capture_output=True,
            text=True,
            timeout=15  # 15s verification timeout limit
        )
        
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode
        
        # Clean up absolute file paths from the output for clean UX
        clean_stdout = stdout.replace(temp_path, "proof.lean")
        clean_stderr = stderr.replace(temp_path, "proof.lean")
        output = (clean_stdout + "\n" + clean_stderr).strip()
        
        # 1. Reject if "sorry" is used (even if compilation succeeded)
        if "sorry" in code.lower() or "sorry" in output.lower():
            return {
                "success": False,
                "status": "Failed (uses sorry)",
                "output": output or "Proof uses 'sorry' placeholder."
            }
            
        # 2. Reject if exit code is non-zero or "error:" is found
        if exit_code != 0 or "error:" in output:
            return {
                "success": False,
                "status": "Failed",
                "output": output or "Lean 4 compilation failed with errors."
            }
            
        # 3. Accept if clean exit
        return {
            "success": True,
            "status": "Passed",
            "output": output or "Theorem successfully verified by Lean 4!"
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "status": "Timeout",
            "output": "Lean 4 compiler verification timed out (15s limit)."
        }
    except Exception as e:
        return {
            "success": False,
            "status": "Error",
            "output": f"Error executing Lean compiler: {str(e)}"
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
