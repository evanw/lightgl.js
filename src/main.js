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
            matrix = gl.modelviewMatrix;
            stack = modelviewStack;
            break;
        case gl.PROJECTION:
            matrix = gl.projectionMatrix;
            stack = projectionStack;
            break;
        default:
            throw 'invalid matrix mode ' + mode;
        }
    };
    gl.loadIdentity = function() {
        matrix.m = new Matrix().m;
    };
    gl.perspective = function(fov, aspect, near, far) {
        var y = Math.tan(fov * Math.PI / 360) * near;
        var x = y * aspect;
        gl.frustum(-x, x, -y, y, near, far);
    };
    gl.frustum = function(l, r, b, t, n, f) {
        matrix.concat(
            2*n/(r-l), 0, (r+l)/(r-l), 0,
            0, 2*n/(t-b), (t+b)/(t-b), 0,
            0, 0, -(f+n)/(f-n), -2*f*n/(f-n),
            0, 0, -1, 0
        );
    };
    gl.ortho = function(l, r, b, t, n, f) {
        matrix.concat(
            2/(r-l), 0, 0, (r+l)/(r-l),
            0, 2/(t-b), 0, (t+b)/(t-b),
            0, 0, -2/(f-n), (f+n)/(f-n),
            0, 0, 0, 1
        );
    };
    gl.scale = function(x, y, z) {
        matrix.concat(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        );
    };
    gl.translate = function(x, y, z) {
        matrix.concat(
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        );
    };
    gl.rotate = function(a, x, y, z) {
        if (a && (x || y || z)) {
            var d = Math.sqrt(x*x + y*y + z*z);
            a *= Math.PI / 180; x /= d; y /= d; z /= d;
            var c = Math.cos(a), s = Math.sin(a), t = 1 - c;
            matrix.concat(
                x*x*t+c, x*y*t-z*s, x*z*t+y*s, 0,
                y*x*t+z*s, y*y*t+c, y*z*t-x*s, 0,
                z*x*t-y*s, z*y*t+x*s, z*z*t+c, 0,
                0, 0, 0, 1
            );
        }
    };
    gl.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
        var e = new Vector(ex, ey, ez);
        var c = new Vector(cx, cy, cz);
        var u = new Vector(ux, uy, uz);
        var f = e.subtract(c).unit();
        var s = u.cross(f).unit();
        var t = f.cross(s).unit();
        matrix.concat(
            s.x, s.y, s.z, -s.dot(e),
            t.x, t.y, t.z, -t.dot(e),
            f.x, f.y, f.z, -f.dot(e),
            0, 0, 0, 1
        );
    };
    gl.pushMatrix = function() {
        stack.push(Array.prototype.slice.call(matrix.m));
    };
    gl.popMatrix = function() {
        matrix.m = stack.pop();
    };
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
