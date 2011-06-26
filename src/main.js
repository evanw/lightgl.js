window.onload = function() {
    // Set up WebGL
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
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
    gl.matrixMode(gl.MODELVIEW);

    // Set up the animation loop
    var post =
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) { setTimeout(callback, 1000 / 60); };
    var time = new Date();
    function frame() {
        var now = new Date();
        if (window.update) window.update((now - time) / 1000);
        time = now;
        if (window.draw) window.draw();
        post(frame);
    }

    // Draw the initial frame and start the animation loop
    if (window.setup) window.setup();
    frame();
};
