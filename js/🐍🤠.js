import { app } from "../../scripts/app.js";

class PythonEditorWidget {
    static i_editor = 0;
    constructor(name, opts) {
        console.log("[PythonEditor] Constructor", { name, opts });
        
        this.name = name;
        this.type = opts[0];
        this.options = opts[1];
        
        // Ensure default value is never null
        this._value = this.options.default || '';
        console.log("[PythonEditor] Initial value:", this._value);
        
        this.editor = null;
        this.element = null;
        this.outputDiv = null;
        this.node = null;
    }

    get value() {
        return this._value;
    }

    set value(v) {
        console.log("[PythonEditor] Value being set to:", v);
        // Ensure value is never null
        this._value = v || '';
        
        if (this.node) {
            const widget = this.node.widgets?.find(w => w.name === this.name);
            if (widget) {
                widget.value = this._value;
            }
        }
        
        if (this.editor && this.editor.getValue() !== this._value) {
            console.log("[PythonEditor] Updating editor content");
            this.editor.setValue(this._value);
        }
    }

    async draw(ctx, node, widget_width, widget_y) {
        console.log("[PythonEditor] Draw called", { node, value: this.value });
        
        try {
            this.node = node;

            if (!this.element) {
                const container = document.createElement('div');
                container.style.width = '100%';
                container.style.border = '1px solid #666';
                container.style.borderRadius = '4px';
                container.style.position = 'relative';
                container.style.marginBottom = '20px';
                
                const editorDiv = document.createElement('div');
                editorDiv.style.height = '300px';
                container.appendChild(editorDiv);

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

                this.outputDiv = document.createElement('div');
                this.outputDiv.style.background = '#2a2a2a';
                this.outputDiv.style.color = '#ffffff';
                this.outputDiv.style.padding = '8px';
                this.outputDiv.style.marginTop = '4px';
                this.outputDiv.style.borderRadius = '4px';
                this.outputDiv.style.fontFamily = 'monospace';
                this.outputDiv.style.fontSize = '12px';
                this.outputDiv.style.maxHeight = '150px';
                this.outputDiv.style.overflowY = 'auto';
                container.appendChild(this.outputDiv);

                this.element = node.addDOMWidget(this.name, "div", container);

                // Ensure CodeMirror is loaded before setting up editor
                await this.loadDependencies();
                await this.setupEditor(editorDiv, errorDiv);
                this.setupErrorHandling(errorDiv);
            }

            const widget = node.widgets?.find(w => w.name === this.name);
            if (widget && widget.value !== this.value) {
                this.value = widget.value || '';
            }

        } catch (error) {
            console.error("[PythonEditor] Error in draw:", error);
        }
    }

    async loadDependencies() {
        try {
            await Promise.all([
                this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"),
                this.loadStyle("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css"),
                this.loadStyle("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css")
            ]);
            await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/python/python.min.js");
            
            // Give browser time to process loaded scripts
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error("[PythonEditor] Failed to load dependencies:", error);
            throw error;
        }
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadStyle(href) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async setupEditor(editorDiv, errorDiv) {
        console.log("[PythonEditor] Setting up editor");
        
        try {
            if (!window.CodeMirror) {
                throw new Error("CodeMirror not loaded");
            }

            console.log("[PythonEditor] Creating CodeMirror instance with value:", this.value);
            this.editor = CodeMirror(editorDiv, {
                value: this.value || '',
                mode: 'python',
                theme: 'monokai',
                lineNumbers: true,
                indentUnit: 4,
                viewportMargin: Infinity,
                extraKeys: {
                    "Tab": cm => cm.replaceSelection("    ")
                }
            });

            const wrapper = this.editor.getWrapperElement();
            wrapper.style.height = '100%';
            wrapper.style.position = 'relative';
            
            const scroller = wrapper.querySelector('.CodeMirror-scroll');
            if (scroller) {
                scroller.style.paddingLeft = '8px';
            }

            this.editor.setSize("100%", "100%");
            
            this.editor.on('change', () => {
                const newValue = this.editor.getValue();
                if (newValue !== this.value) {
                    this.value = newValue;
                    if (this.node) {
                        this.node.setDirtyCanvas(true);
                    }
                }
            });

        } catch (error) {
            console.error("[PythonEditor] Setup error:", error);
            errorDiv.textContent = "Failed to initialize code editor: " + error.message;
            errorDiv.style.display = 'block';
            throw error;
        }
    }

    setupErrorHandling(errorDiv) {
        if (!app.socket) {
            console.error("[PythonEditor] Socket not available");
            return;
        }
        app.socket.on("python_script_error", (data) => {
            console.log("[PythonEditor] Script error:", data);
            errorDiv.textContent = `Error on line ${data.line}: ${data.error}`;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        });

        app.socket.on("python_script_output", (data) => {
            console.log("[PythonEditor] Script output:", data);
            const outputLine = document.createElement('div');
            outputLine.textContent = data.output;
            this.outputDiv.appendChild(outputLine);
            this.outputDiv.scrollTop = this.outputDiv.scrollHeight;
        });

        app.socket.on("executed", () => {
            console.log("[PythonEditor] Script executed");
            this.outputDiv.innerHTML = '';
        });
    }

    afterQueued() {
        console.log("[PythonEditor] afterQueued called");
    }

    computeSize() {
        return [this.options.minWidth || 400, this.options.minHeight || 450];
    }

    serialize() {
        console.log("[PythonEditor] Serializing value:", this.value);
        return this.value;
    }

    deserialize(value) {
        console.log("[PythonEditor] Deserializing value:", value);
        this.value = value || '';
    }
}

app.registerExtension({
    name: "Comfy.PythonEditor",
    init: async (app) => {
        console.log("🐍🤠 init");
    },
    getCustomWidgets: () => {
        return {
            PYTHON_STRING: (node, inputName, inputData, app) => {
                console.log("[PythonEditor] Creating widget", { node, inputName, inputData });
                // const widget = new PythonEditorWidget(inputName, inputData);
                // widget.draw(widget, node, 400, 100).catch(error => {
                //     console.error("Failed to initialize widget editor:", error);
                // });
                return {
                    widget: node.addCustomWidget(new PythonEditorWidget(inputName, inputData), ),
                    minWidth: 400,
                    minHeight: 450,
                };
            }
        };
    }
});