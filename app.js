let vertexEditor;
let fragmentEditor;
let gl;
let program;
let positionAttributeLocation;
let resolutionUniformLocation;
let timeUniformLocation;
let mouseUniformLocation;
let color1UniformLocation;
let color2UniformLocation;
let animationId;
let startTime = Date.now();

const defaultVertexShader = `attribute vec4 a_position;
varying vec2 vTexCoord;

void main() {
    gl_Position = a_position;
    vTexCoord = (a_position.xy + 1.0) * 0.5;
}`;

const defaultFragmentShader = `#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vTexCoord;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(0.0);
    
    // Simple animated gradient
    color.r = sin(u_time + st.x * 3.14159) * 0.5 + 0.5;
    color.g = sin(u_time + st.y * 3.14159) * 0.5 + 0.5;
    color.b = sin(u_time + (st.x + st.y) * 3.14159) * 0.5 + 0.5;
    
    gl_FragColor = vec4(color, 1.0);
}`;


function initEditors() {
    // Initialize vertex shader editor
    vertexEditor = CodeMirror.fromTextArea(document.getElementById('vertex-shader-code'), {
        mode: 'text/x-csrc',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: false,
        extraKeys: {
            "Cmd-/": "toggleComment",
            "Ctrl-/": "toggleComment"
        }
    });
    
    // Initialize fragment shader editor
    fragmentEditor = CodeMirror.fromTextArea(document.getElementById('fragment-shader-code'), {
        mode: 'text/x-csrc',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: false,
        extraKeys: {
            "Cmd-/": "toggleComment",
            "Ctrl-/": "toggleComment"
        }
    });
    
    vertexEditor.setValue(defaultVertexShader);
    fragmentEditor.setValue(defaultFragmentShader);
    
    // Make editors globally accessible for resize functionality
    window.vertexEditor = vertexEditor;
    window.fragmentEditor = fragmentEditor;
    
    // Auto-compile on changes with debounce
    let timeout;
    const onShaderChange = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            compileShaders();
        }, 500);
    };
    
    vertexEditor.on('change', onShaderChange);
    fragmentEditor.on('change', onShaderChange);
}

function initWebGL() {
    const canvas = document.getElementById('canvas');
    resizeCanvas();
    
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        showError('WebGL is not supported in your browser');
        return false;
    }
    
    // Create vertex buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]), gl.STATIC_DRAW);
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);
    
    return true;
}

function resizeCanvas() {
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    // Get container size accounting for padding
    const containerRect = container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    
    const availableWidth = containerRect.width - paddingX;
    const availableHeight = containerRect.height - paddingY;
    
    // Fill the available space completely
    canvas.width = availableWidth;
    canvas.height = availableHeight;
    canvas.style.width = availableWidth + 'px';
    canvas.style.height = availableHeight + 'px';
    
    // Update viewport if WebGL is initialized
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    
    return shader;
}

function createProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(error);
    }
    
    return program;
}

function compileShaders() {
    try {
        const vertexShaderSource = vertexEditor.getValue();
        const fragmentShaderSource = fragmentEditor.getValue();
        
        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        const newProgram = createProgram(vertexShader, fragmentShader);
        
        // Clean up old program
        if (program) {
            gl.deleteProgram(program);
        }
        
        program = newProgram;
        
        // Get attribute and uniform locations
        positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
        timeUniformLocation = gl.getUniformLocation(program, 'u_time');
        mouseUniformLocation = gl.getUniformLocation(program, 'u_mouse');
        color1UniformLocation = gl.getUniformLocation(program, 'color1');
        color2UniformLocation = gl.getUniformLocation(program, 'color2');
        
        hideError();
        startAnimation();
        
    } catch (error) {
        showError(error.message);
        console.error('Shader compilation error:', error);
    }
}

function render() {
    if (!program) return;
    
    const canvas = document.getElementById('canvas');
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(program);
    
    // Set uniforms
    if (resolutionUniformLocation) {
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    }
    if (timeUniformLocation) {
        gl.uniform1f(timeUniformLocation, (Date.now() - startTime) / 1000.0);
    }
    if (color1UniformLocation) {
        gl.uniform3f(color1UniformLocation, 1.0, 0.2, 0.4); // Pink
    }
    if (color2UniformLocation) {
        gl.uniform3f(color2UniformLocation, 0.2, 0.6, 1.0); // Blue
    }
    
    // Enable position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    animationId = requestAnimationFrame(render);
}

function startAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    render();
}

function showError(message) {
    const errorDisplay = document.getElementById('error-display');
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

function hideError() {
    const errorDisplay = document.getElementById('error-display');
    errorDisplay.style.display = 'none';
}


// Mouse tracking
document.getElementById('canvas').addEventListener('mousemove', (e) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = 1.0 - (e.clientY - rect.top) / canvas.height; // Flip Y coordinate
    
    if (mouseUniformLocation && gl) {
        gl.useProgram(program);
        gl.uniform2f(mouseUniformLocation, x, y);
    }
});

function setInitialEditorHeights() {
    const vertexEditor = document.getElementById('vertex-editor');
    const fragmentEditor = document.getElementById('fragment-editor');
    const editorPanel = document.querySelector('.editor-panel');
    
    const panelRect = editorPanel.getBoundingClientRect();
    const errorHeight = document.getElementById('error-display').style.display === 'none' ? 0 : document.getElementById('error-display').offsetHeight;
    const availableHeight = panelRect.height - errorHeight - 3; // 3px for resize handle
    
    const vertexHeight = Math.floor(availableHeight * 0.3); // 30%
    const fragmentHeight = availableHeight - vertexHeight;
    
    vertexEditor.style.height = vertexHeight + 'px';
    fragmentEditor.style.height = fragmentHeight + 'px';
}

function initResizer() {
    const resizeHandle = document.getElementById('resize-handle');
    const vertexEditor = document.getElementById('vertex-editor');
    const fragmentEditor = document.getElementById('fragment-editor');
    const editorPanel = document.querySelector('.editor-panel');
    
    let isResizing = false;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const panelRect = editorPanel.getBoundingClientRect();
        const errorHeight = document.getElementById('error-display').style.display === 'none' ? 0 : document.getElementById('error-display').offsetHeight;
        const availableHeight = panelRect.height - errorHeight - 3; // 3px for resize handle
        
        const mouseY = e.clientY - panelRect.top;
        const vertexHeight = Math.max(100, Math.min(availableHeight - 100, mouseY));
        const fragmentHeight = availableHeight - vertexHeight;
        
        vertexEditor.style.flex = 'none';
        vertexEditor.style.height = vertexHeight + 'px';
        fragmentEditor.style.flex = 'none';
        fragmentEditor.style.height = fragmentHeight + 'px';
        
        // Refresh CodeMirror editors
        if (window.vertexEditor) window.vertexEditor.refresh();
        if (window.fragmentEditor) window.fragmentEditor.refresh();
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

function resetShaders() {
    vertexEditor.setValue(defaultVertexShader);
    fragmentEditor.setValue(defaultFragmentShader);
    compileShaders();
}

function saveCurrentSetup() {
    // Save current state to localStorage
    const title = document.getElementById('title-input').value || 'My Shader';
    const currentSetup = {
        title: title,
        vertexShader: vertexEditor.getValue(),
        fragmentShader: fragmentEditor.getValue(),
        timestamp: new Date().toISOString()
    };
    
    // Update HTML document title
    document.title = title;
    
    localStorage.setItem('shaderEditorSetup', JSON.stringify(currentSetup));
}

function loadSavedSetup() {
    // Load saved state from localStorage
    try {
        const savedSetup = localStorage.getItem('shaderEditorSetup');
        if (savedSetup) {
            const setup = JSON.parse(savedSetup);
            
            // Load title
            const title = setup.title || 'My Shader';
            document.getElementById('title-input').value = title;
            document.title = title; // Update HTML document title
            
            // Load shaders
            if (setup.vertexShader && setup.fragmentShader) {
                vertexEditor.setValue(setup.vertexShader);
                fragmentEditor.setValue(setup.fragmentShader);
            }
        }
    } catch (error) {
        console.error('Error loading saved setup:', error);
    }
}

function setupAutoSave() {
    // Auto-save on title change
    document.getElementById('title-input').addEventListener('input', saveCurrentSetup);
    
    // Auto-save on shader changes (debounced)
    let saveTimeout;
    const debouncedSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCurrentSetup, 1000); // Save 1 second after last change
    };
    
    // Add save listeners to editors
    vertexEditor.on('change', debouncedSave);
    fragmentEditor.on('change', debouncedSave);
}


// Initialize everything when the page loads
window.addEventListener('load', () => {
    initEditors();
    initResizer();
    
    // Load saved setup after editors are initialized
    setTimeout(() => {
        loadSavedSetup();
        setupAutoSave();
        compileShaders();
    }, 100);
    
    // Set up button event listeners
    document.getElementById('compile-btn').addEventListener('click', compileShaders);
    document.getElementById('reset-btn').addEventListener('click', resetShaders);
    
    // Set initial heights after everything is loaded
    setTimeout(setInitialEditorHeights, 100);
    if (initWebGL()) {
        // Compile will be called after loading saved setup
    }
});

// Adjust heights on window resize
window.addEventListener('resize', () => {
    setTimeout(setInitialEditorHeights, 100);
});