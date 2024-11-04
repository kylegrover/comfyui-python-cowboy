from server import PromptServer
import sys
import io
import traceback

class AnyType(str):
    """A special class that is always equal in not equal comparisons"""
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

DEFAULT_SCRIPT = 'RESULT = (A, B, C, D)'

class PythonScript:
    RETURN_TYPES = (any,any,any,any,)
    FUNCTION = "run_script"
    OUTPUT_NODE = True
    CATEGORY = "_for_testing"
    
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {}, "optional": {
            "A": (any, {}),
            "B": (any, {}),
            "C": (any, {}),
            "D": (any, {}),
            "text": ("PYTHON_STRING", {"default": DEFAULT_SCRIPT, "multiline": True}),
        }}

    def run_script(self, text=DEFAULT_SCRIPT, A=None, B=None, C=None, D=None):
        print("PythonCowboy run_script() with text: " + text)
        print("A: " + str(A) + ", B: " + str(B) + ", C: " + str(C) + ", D: " + str(D))
        SCRIPT = text if text is not None and len(text) > 0 else DEFAULT_SCRIPT
        
        # Capture stdout
        stdout = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout
        
        try:
            # First try to compile to catch syntax errors
            try:
                compiled_code = compile(SCRIPT, "<string>", "exec")
            except SyntaxError as e:
                PromptServer.instance.send_sync("python_script_error", {
                    "error": str(e),
                    "line": e.lineno
                })
                raise

            # Create execution context
            ctxt = {"RESULT": None, "A": A, "B": B, "C": C, "D": D}
            
            # Execute the compiled code
            try:
                exec(compiled_code, ctxt)
            except Exception as e:
                tb = traceback.extract_tb(sys.exc_info()[2])
                line_no = tb[-1].lineno if tb else 0
                PromptServer.instance.send_sync("python_script_error", {
                    "error": str(e),
                    "line": line_no
                })
                raise
            
            # Get captured output
            output = stdout.getvalue()
            if output:
                PromptServer.instance.send_sync("python_script_output", {
                    "output": output
                })
            
            # Get the result tuple and unpack it
            result = ctxt.get("RESULT", (None, None, None, None))
            if not isinstance(result, tuple):
                result = (result, None, None, None)
            # Ensure we always return exactly 4 values
            result = tuple(list(result[:4]) + [None] * (4 - len(result)))

            print("PythonCowboy run_script() returning: " + str(result))
            
            return result
            
        finally:
            # Restore stdout
            sys.stdout = old_stdout
            stdout.close()

# Define the web directory
WEB_DIRECTORY = "./js"

NODE_CLASS_MAPPINGS = {
    "PythonScript": PythonScript
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PythonScript": "Python Script"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]