// The API for this library is modeled off of [Processing](http://processing.org) and only
// supports a single WebGL canvas for simplicity. The global WebGL context is stored in
// `gl`, which is augmented with additional functions for matrix manipulation.
// 
// Example usage:
// 
//     <script src="lightgl.js"></script>
//     <script>
// 
//     var time = 0;
// 
//     function setup() {
//         document.body.appendChild(gl.canvas);
//     }
// 
//     function update(seconds) {
//         time += seconds;
//     }
// 
//     function draw() {
//         gl.clearColor(1, Math.cos(time), Math.sin(time), 1);
//         gl.clear(gl.COLOR_BUFFER_BIT);
//     }
// 
//     </script>

// ### Initialization
// When the page is loaded, a WebGL canvas singleton is automatically created. The default
// resolution is 800x600, which can be changed by setting `gl.canvas.width` and `gl.canvas.height`
// and then calling `gl.viewport()`.
window.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    window.gl = null;
    try { gl = canvas.getContext('webgl'); } catch (e) {}
    try { gl = gl || canvas.getContext('experimental-webgl'); } catch (e) {}
    if (!gl) __error('WebGL not supported');

    // ### Mouse Input
    // 
    // The interface for mouse input is also taken from Processing. Mouse state
    // can be accessed through the `mouseX`, `mouseY`, `deltaMouseX`, `deltaMouseY`,
    // `mouseDragging`, `mouseButton`, and `mouseButtons` global variables. The
    // four mouse callbacks are:
    // 
    //     function mousePressed() {
    //         // Called when any mouse button is pressed
    //     }
    // 
    //     function mouseDragged() {
    //         // Called when the mouse moves while pressed
    //     }
    // 
    //     function mouseMoved() {
    //         // Called when the mouse moves while released
    //     }
    // 
    //     function mouseReleased() {
    //         // Called when any mouse button is released
    //     }

    window.LEFT_BUTTON = 1;
    window.MIDDLE_BUTTON = 2;
    window.RIGHT_BUTTON = 4;

    window.mouseX = window.mouseY = window.deltaMouseX = window.deltaMouseY = 0;
    window.mouseButton = window.mouseButtons = 0;
    window.mouseDragging = false;

    var oldMouseX = 0;
    var oldMouseY = 0;

    function setMouseInfo(e) {
        mouseX = e.pageX;
        mouseY = e.pageY;
        for (var obj = gl.canvas; obj; obj = obj.offsetParent) {
            mouseX -= obj.offsetLeft;
            mouseY -= obj.offsetTop;
        }
        deltaMouseX = mouseX - oldMouseX;
        deltaMouseY = mouseY - oldMouseY;
        oldMouseX = mouseX;
        oldMouseY = mouseY;
        e.preventDefault();
    }

    gl.canvas.onmousedown = function(e) {
        setMouseInfo(e);
        mouseDragging = true;
        mouseButton = 1 << (e.which - 1);
        mouseButtons |= mouseButton;
        if (window.mousePressed) window.mousePressed();
    };

    document.onmousemove = function(e) {
        setMouseInfo(e);
        if (!mouseDragging && window.mouseMoved) window.mouseMoved();
        else if (mouseDragging && window.mouseDragged) window.mouseDragged();
    };

    document.onmouseup = function(e) {
        setMouseInfo(e);
        mouseDragging = false;
        mouseButton = 1 << (e.which - 1);
        mouseButtons &= ~mouseButton;
        if (window.mouseReleased) window.mouseReleased();
    };

    gl.canvas.oncontextmenu = function(e) {
        e.preventDefault();
    };

    window.onblur = function() {
        mouseDragging = false;
        mouseButtons = 0;
        keys = {};
    };

    // ### Keyboard Input
    // 
    // The interface for keyboard input is also taken from Processing. Keyboard state
    // can be accessed through the `key` and `keys` global variables. The key code from
    // the last keyboard event is stored in `key`, which will either be a string or a
    // numeric constant. The current boolean state of any key code can be queried using
    // `keys[code]`. The two keyboard callbacks are:
    // 
    //     function keyPressed() {
    //     }
    // 
    //     function keyReleased() {
    //     }

    window.key = null;
    window.keys = {};

    function mapKeyCode(code) {
        switch (code) {
            case 8: return 'BACKSPACE';
            case 9: return 'TAB';
            case 13: return 'ENTER';
            case 16: return 'SHIFT';
            case 27: return 'ESCAPE';
            case 32: return 'SPACE';
            case 37: return 'LEFT';
            case 38: return 'UP';
            case 39: return 'RIGHT';
            case 40: return 'DOWN';
        }
        return code >= 65 && code <= 90 ? String.fromCharCode(code) : code;
    }

    document.onkeydown = function(e) {
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            key = mapKeyCode(e.keyCode);
            keys[key] = true;
            if (window.keyPressed) window.keyPressed();
        }
    };

    document.onkeyup = function(e) {
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            key = mapKeyCode(e.keyCode);
            keys[key] = false;
            if (window.keyReleased) window.keyReleased();
        }
    };

    // ### Fullscreen
    // 
    // Provide an easy way to get a fullscreen app running, including an
    // automatic 3D perspective projection matrix by default. This should be
    // called once in setup().
    // 
    // Just fullscreen, no camera:
    // 
    //     gl.fullscreen({ camera: false });
    // 
    // Adjusting field of view, near plane distance, and far plane distance:
    // 
    //     gl.fullscreen({ fov: 45, near: 0.1, far: 1000 });
    // 
    // Adding padding from the edge of the window:
    // 
    //     gl.fullscreen({ paddingLeft: 250, paddingBottom: 60 });
    // 
    gl.fullscreen = function(options) {
        options = options || {};
        var top = options.paddingTop || 0;
        var left = options.paddingLeft || 0;
        var right = options.paddingRight || 0;
        var bottom = options.paddingBottom || 0;
        document.body.appendChild(gl.canvas);
        gl.canvas.style.position = 'absolute';
        gl.canvas.style.left = left + 'px';
        gl.canvas.style.top = top + 'px';
        window.onresize = function() {
            gl.canvas.width = window.innerWidth - left - right;
            gl.canvas.height = window.innerHeight - top - bottom;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            if (options.camera || !('camera' in options)) {
                gl.matrixMode(gl.PROJECTION);
                gl.loadIdentity();
                gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height,
                    options.near || 0.1, options.far || 1000);
                gl.matrixMode(gl.MODELVIEW);
            }
            if (setupCalled) draw();
        };
        window.onresize();
    };

    // ### Matrix stack
    // 
    // Provide an implementation of the OpenGL matrix stack (only modelview
    // and projection matrices), as well as some useful GLU matrix functions.
    // 
    var ENUM = 0x12340000;
    gl.MODELVIEW = ENUM | 1;
    gl.PROJECTION = ENUM | 2;
    gl.modelviewMatrix = new Matrix();
    gl.projectionMatrix = new Matrix();
    var modelviewStack = [];
    var projectionStack = [];
    var matrix, stack;
    gl.matrixMode = function(mode) {
        switch (mode) {
        case gl.MODELVIEW:
            matrix = 'modelviewMatrix';
            stack = modelviewStack;
            break;
        case gl.PROJECTION:
            matrix = 'projectionMatrix';
            stack = projectionStack;
            break;
        default:
            __error('invalid matrix mode ' + mode);
        }
    };
    gl.loadIdentity = function() {
        gl[matrix].m = new Matrix().m;
    };
    gl.loadMatrix = function(m) {
        gl[matrix].m = m.m.slice();
    };
    gl.multMatrix = function(m) {
        gl[matrix].m = gl[matrix].multiply(m).m;
    };
    gl.perspective = function(fov, aspect, near, far) {
        gl.multMatrix(Matrix.perspective(fov, aspect, near, far));
    };
    gl.frustum = function(l, r, b, t, n, f) {
        gl.multMatrix(Matrix.frustum(l, r, b, t, n, f));
    };
    gl.ortho = function(l, r, b, t, n, f) {
        gl.multMatrix(Matrix.ortho(l, r, b, t, n, f));
    };
    gl.scale = function(x, y, z) {
        gl.multMatrix(Matrix.scale(x, y, z));
    };
    gl.translate = function(x, y, z) {
        gl.multMatrix(Matrix.translate(x, y, z));
    };
    gl.rotate = function(a, x, y, z) {
        gl.multMatrix(Matrix.rotate(a, x, y, z));
    };
    gl.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
        gl.multMatrix(Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz));
    };
    gl.pushMatrix = function() {
        stack.push(gl[matrix].m.slice());
    };
    gl.popMatrix = function() {
        gl[matrix].m = stack.pop();
    };
    gl.project = function(objX, objY, objZ, modelview, projection, viewport) {
        modelview = modelview || gl.modelviewMatrix;
        projection = projection || gl.projectionMatrix;
        viewport = viewport || gl.getParameter(gl.VIEWPORT);
        var point = projection.transformPoint(modelview.transformPoint(new Vector(objX, objY, objZ)));
        return new Vector(
            viewport[0] + viewport[2] * (point.x * 0.5 + 0.5),
            viewport[1] + viewport[3] * (point.y * 0.5 + 0.5),
            point.z * 0.5 + 0.5
        );
    };
    gl.unProject = function(winX, winY, winZ, modelview, projection, viewport) {
        modelview = modelview || gl.modelviewMatrix;
        projection = projection || gl.projectionMatrix;
        viewport = viewport || gl.getParameter(gl.VIEWPORT);
        var point = new Vector(
            (winX - viewport[0]) / viewport[2] * 2 - 1,
            (winY - viewport[1]) / viewport[3] * 2 - 1,
            winZ * 2 - 1
        );
        return projection.multiply(modelview).inverse().transformPoint(point);
    };
    gl.matrixMode(gl.MODELVIEW);

    // ### Immediate mode
    // 
    // Provide an implementation of OpenGL's deprecated immediate mode. This is
    // depricated for a reason: constantly re-specifying the geometry is a bad
    // idea for performance. You should use a `Mesh` instead, which specifies
    // the geometry once and caches it on the graphics card. Still, nothing
    // beats a quick `gl.begin(gl.POINTS); gl.vertex(1, 2, 3); gl.end();` for
    // debugging. This intentionally doesn't implement texture coordinates or
    // normals because it's only meant for quick debugging tasks.
    // 
    var immediateMode = {
        mesh: new Mesh({ normals: false, coords: false, triangles: false }),
        mode: -1,
        color: new Vector(1, 1, 1),
        pointSize: 1,
        shader: new Shader('\
            uniform float pointSize;\
            attribute vec3 color;\
            varying vec3 c;\
            void main() {\
                c = color;\
                gl_Position = gl_ModelViewProjectionMatrix * vec4(gl_Vertex, 1.0);\
                gl_PointSize = pointSize;\
            }\
        ', '\
            varying vec3 c;\
            void main() {\
                gl_FragColor = vec4(c, 1.0);\
            }\
        ')
    };
    immediateMode.mesh.addVertexBuffer('colors', 'color');
    gl.pointSize = function(pointSize) {
        immediateMode.pointSize = pointSize;
    };
    gl.begin = function(mode) {
        if (immediateMode.mode != -1) throw 'mismatched gl.begin() and gl.end() calls';
        immediateMode.mode = mode;
        immediateMode.mesh.vertices = [];
        immediateMode.mesh.colors = [];
    };
    gl.color = function(r, g, b) {
        immediateMode.color = (arguments.length == 1) ? r.toArray() : [r, g, b];
    };
    gl.vertex = function(x, y, z) {
        immediateMode.mesh.colors.push(immediateMode.color);
        immediateMode.mesh.vertices.push(arguments.length == 1 ? x.toArray() : [x, y, z]);
    };
    gl.end = function() {
        if (immediateMode.mode == -1) throw 'mismatched gl.begin() and gl.end() calls';
        immediateMode.mesh.compile();
        immediateMode.shader.uniforms({
            pointSize: immediateMode.pointSize
        }).draw(immediateMode.mesh, immediateMode.mode);
        immediateMode.mode = -1;
    };

    // Set up a better default state, users can still change it if they want
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    // Set up the animation loop. If your application doesn't need continuous
    // redrawing, set `gl.autoDraw = false` in your `setup()` function.
    var post =
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) { setTimeout(callback, 1000 / 60); };
    var time = new Date();
    function frame() {
        var now = new Date();

        // If we're animating, render as fast as possible, otherwise sleep for
        // a bit and check if we're animating again
        if (gl.autoDraw) {
            if (window.update) window.update((now - time) / 1000);
            if (window.draw) window.draw();
            post(frame);
        } else {
            setTimeout(frame, 100);
        }

        time = now;
    }
    gl.autoDraw = true;

    // Draw the initial frame and start the animation loop. The setupCalled
    // flag is used so methods called within `setup()` don't run user callbacks
    // until after `setup()` has finished, otherwise the user's data may not be
    // initialized correctly.
    var setupCalled = false;
    if (window.setup) window.setup();
    setupCalled = true;
    frame();
};

// ### Error handling
// If you want to handle WebGL errors, define a function called handleError():
// 
//     function handleError(text) {
//         alert('WebGL error occurred: ' + text);
//     }
// 
// The error is always thrown afterwards to make sure the current function stops.
function __error(text) {
  if (window.handleError) window.handleError(text);
  throw text;
}
