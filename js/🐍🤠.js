import { app } from "../../scripts/app.js";

// console.log("Loading 🐍🤠 extension");

class PythonEditorWidget {
    constructor(name, opts) {
        // console.log("Creating 🐍🤠 widget", name, opts);
        this.name = name;
        this.type = opts[0];
        this.options = opts[1];
        this.value = this.options.default || '';
        this.editor = null;
        this.element = null;
        this.resourcesLoaded = false;
    }

    draw(ctx, node, widget_width, widget_y) {
        return new Promise(async (resolve, reject) => {
            // console.log("🐍🤠 Drawing widget start");
            
            try {
                if (!this.element) {
                    // console.log("🐍🤠 Creating editor elements");
                    
                    const container = document.createElement('div');
                    container.style.width = '100%';
                    // container.style.height = '300px';
                    container.style.border = '1px solid #666';
                    container.style.borderRadius = '4px';
                    container.style.position = 'relative';
                    
                    const editorDiv = document.createElement('div');
                    editorDiv.style.height = '100%';
                    container.appendChild(editorDiv);
                    // console.log("🐍🤠 Editor div created");

                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.position = 'absolute';
                    errorDiv.style.bottom = '0';
                    errorDiv.style.left = '0';
                    errorDiv.style.right = '0';
                    errorDiv.style.background = 'rgba(255, 0, 0, 0.1)';
                    errorDiv.style.color = '#ff4444';
                    errorDiv.style.padding = '4px';
                    errorDiv.style.fontSize = '12px';
                    errorDiv.style.display = 'none';
                    container.appendChild(errorDiv);
                    // console.log("🐍🤠 Error div created");

                    this.element = node.addDOMWidget("pythoneditor", "div", container);
                    // console.log("🐍🤠 DOM widget added");

                    try {
                        await this.setupEditor(editorDiv, errorDiv);
                        resolve();  // Resolve the promise once editor is setup
                    } catch (setupError) {
                        console.error("🐍🤠 Error during editor setup:", setupError);
                        // Try to display error in the UI
                        errorDiv.textContent = `Editor setup failed: ${setupError.message}`;
                        errorDiv.style.display = 'block';
                    }
                }

                if (this.editor) {
                    // console.log("🐍🤠 Refreshing editor");
                    requestAnimationFrame(() => {
                        this.editor.refresh();
                    });
                }
            } catch (error) {
                console.error("🐍🤠 Error in draw method:", error);
            }
        });
    }

    async setupEditor(editorDiv, errorDiv) {
        // console.log("🐍🤠 Starting editor setup");
        
        // Check if CodeMirror is already loaded
        if (typeof CodeMirror === 'undefined') {
            // console.log("🐍🤠 Loading CodeMirror resources");
            
            try {
                await Promise.all([
                    this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"),
                    this.loadStyle("https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css"),
                    this.loadStyle("https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/monokai.min.css")
                ]);
                await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/python/python.min.js");
                // console.log("🐍🤠 CodeMirror resources loaded successfully");
            } catch (error) {
                console.error("🐍🤠 Failed to load CodeMirror resources:", error);
                throw error;
            }
        }

        // Add a small delay to ensure resources are fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof CodeMirror === 'undefined') {
            throw new Error("CodeMirror failed to load properly");
        }

        // console.log("🐍🤠 Creating CodeMirror instance");
        try {
            this.editor = CodeMirror(editorDiv, {
                value: this.value,
                mode: 'python',
                theme: 'monokai',
                lineNumbers: false,
                indentUnit: 4,
                viewportMargin: Infinity,
                extraKeys: {
                    "Tab": cm => cm.replaceSelection("    ")
                }
            });
            this.editor.setSize("100%", "100%");
            // console.log("🐍🤠 CodeMirror instance created successfully");

            this.editor.on('change', () => {
                console.log("🐍🤠 Editor content changed");
                this.value = this.editor.getValue();
            });

            // this.setupErrorHandling(errorDiv);
        } catch (error) {
            console.error("🐍🤠 Error creating CodeMirror instance:", error);
            throw error;
        }
    }

    loadScript(src) {
        // console.log("🐍🤠 Loading script:", src);
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                // console.log("🐍🤠 Script already loaded:", src);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                // console.log("🐍🤠 Script loaded successfully:", src);
                resolve();
            };
            script.onerror = (error) => {
                console.error("🐍🤠 Script failed to load:", src, error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    loadStyle(href) {
        // console.log("🐍🤠 Loading style:", href);
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) {
                // console.log("🐍🤠 Style already loaded:", href);
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                // console.log("🐍🤠 Style loaded successfully:", href);
                resolve();
            };
            link.onerror = (error) => {
                console.error("🐍🤠 Style failed to load:", href, error);
                reject(error);
            };
            document.head.appendChild(link);
        });
    }

    // setupErrorHandling(errorDiv) {
        // console.log("🐍🤠 Setting up error handling");
        // app.ui.on("python_script_error", (event) => {
            // console.log("🐍🤠 Received error:", event);
        //     errorDiv.textContent = `Error on line ${event.line}: ${event.error}`;
        //     errorDiv.style.display = 'block';
        //     setTimeout(() => {
        //         errorDiv.style.display = 'none';
        //     }, 5000);
        // });
    // }
}

// Register extension
app.registerExtension({
    name: "Comfy.PythonEditor",
    async init() {
        // console.log("Initializing 🐍🤠 extension");
    },
    async setup() {
        // console.log("Setting up 🐍🤠 extension");
    },
getCustomWidgets() {
    return {
        PYTHON_STRING: (node, inputName, inputData) => {
            const widget = new PythonEditorWidget(inputName, inputData);

            widget.draw(widget, node, 400, 100).catch(error => {
                console.error("Failed to initialize widget editor:", error);
            });

            return {
                widget,
                minWidth: 400,
                minHeight: 100,
            };
        }
    };
}
});

// console.log("🐍🤠 extension registration complete");