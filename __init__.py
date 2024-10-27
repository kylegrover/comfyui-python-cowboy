from server import PromptServer

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
        SCRIPT = text if text is not None and len(text) > 0 else DEFAULT_SCRIPT
        try:
            r = compile(SCRIPT, "<string>", "exec")
            ctxt = {"RESULT": None, "A": A, "B": B, "C": C, "D": D}
            eval(r, ctxt)
            return ctxt["RESULT"]
        except Exception as e:
            PromptServer.instance.send_sync("python_script_error", {
                "error": str(e),
                "line": getattr(e, "lineno", 0)
            })
            raise e

# Define the web directory
WEB_DIRECTORY = "./js"

NODE_CLASS_MAPPINGS = {
    "PythonScript": PythonScript
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PythonScript": "Python Script"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]