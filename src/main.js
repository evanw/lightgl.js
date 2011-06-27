window.onload = function() {
    // Set up WebGL
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    window.gl = null;
    try { gl = canvas.getContext('webgl'); } catch (e) {}
    try { gl = gl || canvas.getContext('experimental-webgl'); } catch (e) {}
    if (!gl) throw 'WebGL not supported';

    // Add custom enums
    var ENUM = 0x12340000;
    gl.MODELVIEW = ENUM | 1;
    gl.PROJECTION = ENUM | 2;

    // Add matrix funcitons
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
    gl.loadIdentity = function() { gl[matrix].m = new Matrix().m; };
    gl.loadMatrix = function(m) { gl[matrix].m = m.m.slice(); };
    gl.multMatrix = function(m) { gl[matrix].m = gl[matrix].multiply(m).m; };
    gl.perspective = function(fov, aspect, near, far) { gl.multMatrix(Matrix.perspective(fov, aspect, near, far)); };
    gl.frustum = function(l, r, b, t, n, f) { gl.multMatrix(Matrix.frustum(l, r, b, t, n, f)); };
    gl.ortho = function(l, r, b, t, n, f) { gl.multMatrix(Matrix.ortho(l, r, b, t, n, f)); };
    gl.scale = function(x, y, z) { gl.multMatrix(Matrix.scale(x, y, z)); };
    gl.translate = function(x, y, z) { gl.multMatrix(Matrix.translate(x, y, z)); };
    gl.rotate = function(a, x, y, z) { gl.multMatrix(Matrix.rotate(a, x, y, z)); };
    gl.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) { gl.multMatrix(Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz)); };
    gl.pushMatrix = function() { stack.push(gl[matrix].m.slice()); };
    gl.popMatrix = function() { gl[matrix].m = stack.pop(); };
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

    // Set up the animation loop
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

    // Draw the initial frame and start the animation loop
    if (window.setup) window.setup();
    frame();
};

var isDragging = false;

function setMouseInfo(e) {
    window.mouseX = e.pageX;
    window.mouseY = e.pageY;
    for (var obj = gl.canvas; obj; obj = obj.offsetParent) {
        window.mouseX -= obj.offsetLeft;
        window.mouseY -= obj.offsetTop;
    }
}

document.onmousedown = function(e) {
    setMouseInfo(e);
    isDragging = true;
    if (window.mousePressed) window.mousePressed();
};

document.onmousemove = function(e) {
    setMouseInfo(e);
    if (!isDragging && window.mouseMoved) window.mouseMoved();
    else if (isDragging && window.mouseDragged) window.mouseDragged();
};

document.onmouseup = function(e) {
    setMouseInfo(e);
    isDragging = false;
    if (window.mouseReleased) window.mouseReleased();
};
