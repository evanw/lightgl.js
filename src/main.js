// The internal `gl` variable holds the current WebGL context.
var gl;

var GL = {
  // ### Initialization
  // 
  // `GL.create()` creates a new WebGL context and augments it with more
  // methods. The alpha channel is disabled by default because it usually causes
  // unintended transparencies in the canvas.
  create: function(options) {
    options = options || {};
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    if (!('alpha' in options)) options.alpha = false;
    try { gl = canvas.getContext('webgl', options); } catch (e) {}
    try { gl = gl || canvas.getContext('experimental-webgl', options); } catch (e) {}
    if (!gl) throw 'WebGL not supported';
    addMatrixStack();
    addImmediateMode();
    addEventListeners();
    addOtherMethods();
    return gl;
  },

  // `GL.keys` contains a mapping of key codes to booleans indicating whether
  // that key is currently pressed.
  keys: {},

  // Export all external classes.
  Matrix: Matrix,
  Indexer: Indexer,
  Buffer: Buffer,
  Mesh: Mesh,
  HitTest: HitTest,
  Raytracer: Raytracer,
  Shader: Shader,
  Texture: Texture,
  Vector: Vector
};

// ### Matrix stack
// 
// Implement the OpenGL modelview and projection matrix stacks, along with some
// other useful GLU matrix functions.

function addMatrixStack() {
  gl.MODELVIEW = ENUM | 1;
  gl.PROJECTION = ENUM | 2;
  var tempMatrix = new Matrix();
  var resultMatrix = new Matrix();
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
    Matrix.identity(gl[matrix]);
  };
  gl.loadMatrix = function(m) {
    var from = m.m, to = gl[matrix].m;
    for (var i = 0; i < 16; i++) {
      to[i] = from[i];
    }
  };
  gl.multMatrix = function(m) {
    gl.loadMatrix(Matrix.multiply(gl[matrix], m, resultMatrix));
  };
  gl.perspective = function(fov, aspect, near, far) {
    gl.multMatrix(Matrix.perspective(fov, aspect, near, far, tempMatrix));
  };
  gl.frustum = function(l, r, b, t, n, f) {
    gl.multMatrix(Matrix.frustum(l, r, b, t, n, f, tempMatrix));
  };
  gl.ortho = function(l, r, b, t, n, f) {
    gl.multMatrix(Matrix.ortho(l, r, b, t, n, f, tempMatrix));
  };
  gl.scale = function(x, y, z) {
    gl.multMatrix(Matrix.scale(x, y, z, tempMatrix));
  };
  gl.translate = function(x, y, z) {
    gl.multMatrix(Matrix.translate(x, y, z, tempMatrix));
  };
  gl.rotate = function(a, x, y, z) {
    gl.multMatrix(Matrix.rotate(a, x, y, z, tempMatrix));
  };
  gl.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    gl.multMatrix(Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz, tempMatrix));
  };
  gl.pushMatrix = function() {
    stack.push(Array.prototype.slice.call(gl[matrix].m));
  };
  gl.popMatrix = function() {
    var m = stack.pop();
    gl[matrix].m = hasFloat32Array ? new Float32Array(m) : m;
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
    return Matrix.inverse(Matrix.multiply(projection, modelview, tempMatrix), resultMatrix).transformPoint(point);
  };
  gl.matrixMode(gl.MODELVIEW);
}

// ### Immediate mode
// 
// Provide an implementation of OpenGL's deprecated immediate mode. This is
// depricated for a reason: constantly re-specifying the geometry is a bad
// idea for performance. You should use a `GL.Mesh` instead, which specifies
// the geometry once and caches it on the graphics card. Still, nothing
// beats a quick `gl.begin(gl.POINTS); gl.vertex(1, 2, 3); gl.end();` for
// debugging. This intentionally doesn't implement fixed-function lighting
// because it's only meant for quick debugging tasks.

function addImmediateMode() {
  var immediateMode = {
    mesh: new Mesh({ coords: true, colors: true, triangles: false }),
    mode: -1,
    coord: [0, 0, 0, 0],
    color: [1, 1, 1, 1],
    pointSize: 1,
    shader: new Shader('\
      uniform float pointSize;\
      varying vec4 color;\
      varying vec4 coord;\
      void main() {\
        color = gl_Color;\
        coord = gl_TexCoord;\
        gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
        gl_PointSize = pointSize;\
      }\
    ', '\
      uniform sampler2D texture;\
      uniform float pointSize;\
      uniform bool useTexture;\
      varying vec4 color;\
      varying vec4 coord;\
      void main() {\
        gl_FragColor = color;\
        if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);\
      }\
    ')
  };
  gl.pointSize = function(pointSize) {
    immediateMode.shader.uniforms({ pointSize: pointSize });
  };
  gl.begin = function(mode) {
    if (immediateMode.mode != -1) throw 'mismatched gl.begin() and gl.end() calls';
    immediateMode.mode = mode;
    immediateMode.mesh.colors = [];
    immediateMode.mesh.coords = [];
    immediateMode.mesh.vertices = [];
  };
  gl.color = function(r, g, b, a) {
    immediateMode.color = (arguments.length == 1) ? r.toArray().concat(1) : [r, g, b, a || 1];
  };
  gl.texCoord = function(s, t) {
    immediateMode.coord = (arguments.length == 1) ? s.toArray(2) : [s, t];
  };
  gl.vertex = function(x, y, z) {
    immediateMode.mesh.colors.push(immediateMode.color);
    immediateMode.mesh.coords.push(immediateMode.coord);
    immediateMode.mesh.vertices.push(arguments.length == 1 ? x.toArray() : [x, y, z]);
  };
  gl.end = function() {
    if (immediateMode.mode == -1) throw 'mismatched gl.begin() and gl.end() calls';
    immediateMode.mesh.compile();
    immediateMode.shader.uniforms({
      useTexture: !!gl.getParameter(gl.TEXTURE_BINDING_2D)
    }).draw(immediateMode.mesh, immediateMode.mode);
    immediateMode.mode = -1;
  };
}

// ### Improved mouse events
// 
// This adds event listeners on the `gl.canvas` element that call
// `gl.onmousedown()`, `gl.onmousemove()`, and `gl.onmouseup()` with an
// augmented event object. The event object also has the properties `x`, `y`,
// `deltaX`, `deltaY`, and `dragging`.
function addEventListeners() {
  var context = gl, oldX = 0, oldY = 0, buttons = {}, hasOld = false;
  function isDragging() {
    for (var b in buttons) {
      if (buttons[b]) return true;
    }
    return false;
  }
  function augment(original) {
    // Make a copy of original, a native `MouseEvent`, so we can overwrite
    // WebKit's non-standard read-only `x` and `y` properties (which are just
    // duplicates of `pageX` and `pageY`). We can't just use
    // `Object.create(original)` because some `MouseEvent` functions must be
    // called in the context of the original event object.
    var e = {};
    for (var name in original) {
      if (typeof original[name] == 'function') {
        e[name] = (function(callback) {
          return function() {
            callback.call(original, arguments);
          };
        })(original[name]);
      } else {
        e[name] = original[name];
      }
    }
    e.original = original;
    e.x = e.pageX;
    e.y = e.pageY;
    for (var obj = gl.canvas; obj; obj = obj.offsetParent) {
      e.x -= obj.offsetLeft;
      e.y -= obj.offsetTop;
    }
    if (hasOld) {
      e.deltaX = e.x - oldX;
      e.deltaY = e.y - oldY;
    } else {
      e.deltaX = 0;
      e.deltaY = 0;
      hasOld = true;
    }
    oldX = e.x;
    oldY = e.y;
    e.dragging = isDragging();
    e.preventDefault = function() {
      e.original.preventDefault();
    };
    e.stopPropagation = function() {
      e.original.stopPropagation();
    };
    return e;
  }
  function mousedown(e) {
    gl = context;
    if (!isDragging()) {
      // Expand the event handlers to the document to handle dragging off canvas.
      on(document, 'mousemove', mousemove);
      on(document, 'mouseup', mouseup);
      off(gl.canvas, 'mousemove', mousemove);
      off(gl.canvas, 'mouseup', mouseup);
    }
    buttons[e.which] = true;
    e = augment(e);
    if (gl.onmousedown) gl.onmousedown(e);
    e.preventDefault();
  }
  function mousemove(e) {
    gl = context;
    e = augment(e);
    if (gl.onmousemove) gl.onmousemove(e);
    e.preventDefault();
  }
  function mouseup(e) {
    gl = context;
    buttons[e.which] = false;
    if (!isDragging()) {
      // Shrink the event handlers back to the canvas when dragging ends.
      off(document, 'mousemove', mousemove);
      off(document, 'mouseup', mouseup);
      on(gl.canvas, 'mousemove', mousemove);
      on(gl.canvas, 'mouseup', mouseup);
    }
    e = augment(e);
    if (gl.onmouseup) gl.onmouseup(e);
    e.preventDefault();
  }
  function reset() {
    hasOld = false;
  }
  on(gl.canvas, 'mousedown', mousedown);
  on(gl.canvas, 'mousemove', mousemove);
  on(gl.canvas, 'mouseup', mouseup);
  on(gl.canvas, 'mouseover', reset);
  on(gl.canvas, 'mouseout', reset);
}

// ### Automatic keyboard state
// 
// The current keyboard state is stored in `GL.keys`, a map of integer key
// codes to booleans indicating whether that key is currently pressed. Certain
// keys also have named identifiers that can be used directly, such as
// `GL.keys.SPACE`. Values in `GL.keys` are initially undefined until that
// key is pressed for the first time. If you need a boolean value, you can
// cast the value to boolean by applying the not operator twice (as in
// `!!GL.keys.SPACE`).

function mapKeyCode(code) {
  var named = {
    8: 'BACKSPACE',
    9: 'TAB',
    13: 'ENTER',
    16: 'SHIFT',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN'
  };
  return named[code] || (code >= 65 && code <= 90 ? String.fromCharCode(code) : null);
}

function on(element, name, callback) {
  element.addEventListener(name, callback);
}

function off(element, name, callback) {
  element.removeEventListener(name, callback);
}

on(document, 'keydown', function(e) {
  if (!e.altKey && !e.ctrlKey && !e.metaKey) {
    var key = mapKeyCode(e.keyCode);
    if (key) GL.keys[key] = true;
    GL.keys[e.keyCode] = true;
  }
});

on(document, 'keyup', function(e) {
  if (!e.altKey && !e.ctrlKey && !e.metaKey) {
    var key = mapKeyCode(e.keyCode);
    if (key) GL.keys[key] = false;
    GL.keys[e.keyCode] = false;
  }
});

function addOtherMethods() {
  // ### Multiple contexts
  // 
  // When using multiple contexts in one web page, `gl.makeCurrent()` must be
  // called before issuing commands to a different context.
  (function(context) {
    gl.makeCurrent = function() {
      gl = context;
    };
  })(gl);

  // ### Animation
  // 
  // Call `gl.animate()` to provide an animation loop that repeatedly calls
  // `gl.onupdate()` and `gl.ondraw()`.
  gl.animate = function() {
    var post =
      window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      function(callback) { setTimeout(callback, 1000 / 60); };
    var time = new Date().getTime();
    var context = gl;
    function update() {
      gl = context;
      var now = new Date().getTime();
      if (gl.onupdate) gl.onupdate((now - time) / 1000);
      if (gl.ondraw) gl.ondraw();
      post(update);
      time = now;
    }
    update();
  };

  // ### Fullscreen
  // 
  // Provide an easy way to get a fullscreen app running, including an
  // automatic 3D perspective projection matrix by default. This should be
  // called once.
  // 
  // Just fullscreen, no automatic camera:
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
    if (!document.body) {
      throw 'document.body doesn\'t exist yet (call gl.fullscreen() from ' +
        'window.onload() or from inside the <body> tag)';
    }
    document.body.appendChild(gl.canvas);
    document.body.style.overflow = 'hidden';
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.left = left + 'px';
    gl.canvas.style.top = top + 'px';
    function resize() {
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
      if (gl.ondraw) gl.ondraw();
    }
    on(window, 'resize', resize);
    resize();
  };
}

// A value to bitwise-or with new enums to make them distinguishable from the
// standard WebGL enums.
var ENUM = 0x12340000;
