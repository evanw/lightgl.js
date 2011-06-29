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
    if (!gl) throw ('WebGL not supported');

    // Provide an implementation of the OpenGL matrix stack (only modelview
    // and projection matrices), as well as some useful GLU matrix functions.
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
            throw 'invalid matrix mode ' + mode;
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
    gl.autoDraw = true;

    // Set up the animation loop. If your application doesn't need continuous
    // redrawing, set `gl.autoDraw = false` in your `setup()` function.
    var post =
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) { setTimeout(callback, 1000 / 60); };
    var time;
    function frame() {
        var now = new Date();
        if (window.update) window.update((now - (time || now)) / 1000);
        time = now;
        if (window.draw) window.draw();
        if (gl.autoDraw) post(frame);
    }

    // Draw the initial frame and start the animation loop.
    if (window.setup) window.setup();
    frame();
};

// ### Mouse Input
// 
// The interface for mouse input is also taken from Processing. Mouse state
// can be accessed through the `mouseX`, `mouseY`, `deltaMouseX`, `deltaMouseY`,
// and `mouseDragging` global variables. Example usage:
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

mouseX = mouseY = deltaMouseX = deltaMouseY = 0;
mouseDragging = false;

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
}

document.onmousedown = function(e) {
    setMouseInfo(e);
    mouseDragging = true;
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
    if (window.mouseReleased) window.mouseReleased();
};
