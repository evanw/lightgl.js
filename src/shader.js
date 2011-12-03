// Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
// prefixed with `gl_`, are automatically added to all shader sources to make
// simple shaders easier to write.
// 
// Example usage:
// 
//     var shader = new GL.Shader('\
//       void main() {\
//         gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
//       }\
//     ', '\
//       uniform vec4 color;\
//       void main() {\
//         gl_FragColor = color;\
//       }\
//     ');
// 
//     shader.uniforms({
//       color: [1, 0, 0, 1]
//     }).draw(mesh);

// ### new GL.Shader(vertexSource, fragmentSource)
// 
// Compiles a shader program using the provided vertex and fragment shaders.
function Shader(vertexSource, fragmentSource) {
  // Headers are prepended to the sources to provide some automatic functionality.
  var header = '\
    uniform mat3 gl_NormalMatrix;\
    uniform mat4 gl_ModelViewMatrix;\
    uniform mat4 gl_ProjectionMatrix;\
    uniform mat4 gl_ModelViewProjectionMatrix;\
  ';
  var vertexHeader = '\
    attribute vec4 gl_Vertex;\
    attribute vec4 gl_TexCoord;\
    attribute vec3 gl_Normal;\
    attribute vec4 gl_Color;\
  ' + header + '\
    vec4 ftransform() {\
      return gl_ModelViewProjectionMatrix * gl_Vertex;\
    }\
  ';
  var fragmentHeader = '\
    precision highp float;\
  ' + header;

  // Check for the use of built-in matrices that require expensive matrix
  // multiplications to compute
  var source = vertexSource + fragmentSource;
  this.needsMVPM = /(gl_ModelViewProjectionMatrix|ftransform)/.test(source);
  this.needsNM = /gl_NormalMatrix/.test(source);

  function regexMap(regex, text, callback) {
    while ((result = regex.exec(text)) != null) {
      callback(result);
    }
  }

  // The `gl_` prefix must be substituted for something else to avoid compile
  // errors, since it's a reserved prefix. This prefixes all reserved names with
  // `_`. The header is inserted after any extensions, since those must come
  // first.
  function fix(header, source) {
    var replaced = {};
    var match = /^((\s*\/\/.*\n|\s*#extension.*\n)+)[^]*$/.exec(source);
    source = match ? match[1] + header + source.substr(match[1].length) : header + source;
    regexMap(/\bgl_\w+\b/g, header, function(result) {
      if (!(result in replaced)) {
        source = source.replace(new RegExp('\\b' + result + '\\b', 'g'), '_' + result);
        replaced[result] = true;
      }
    });
    return source;
  }
  vertexSource = fix(vertexHeader, vertexSource);
  fragmentSource = fix(fragmentHeader, fragmentSource);

  // Compile and link errors are thrown as strings.
  function compileSource(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw 'compile error: ' + gl.getShaderInfoLog(shader);
    }
    return shader;
  }
  this.program = gl.createProgram();
  gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(this.program);
  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    throw 'link error: ' + gl.getProgramInfoLog(this.program);
  }
  this.attributes = {};

  // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
  // To do this automatically, we detect and remember all uniform samplers in the source code.
  var isSampler = {};
  regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertexSource + fragmentSource, function(groups) {
    isSampler[groups[2]] = 1;
  });
  this.isSampler = isSampler;
}

function isArray(obj) {
  var str = Object.prototype.toString.call(obj);
  return str == '[object Array]' || str == '[object Float32Array]';
}

function isNumber(obj) {
  var str = Object.prototype.toString.call(obj);
  return str == '[object Number]' || str == '[object Boolean]';
}

var tempMatrix = new Matrix();
var resultMatrix = new Matrix();

Shader.prototype = {
  // ### .uniforms(uniforms)
  // 
  // Set a uniform for each property of `uniforms`. The correct `gl.uniform*()` method is
  // inferred from the value types and from the stored uniform sampler flags.
  uniforms: function(uniforms) {
    gl.useProgram(this.program);

    for (var name in uniforms) {
      var location = gl.getUniformLocation(this.program, name);
      if (!location) continue;
      var value = uniforms[name];
      if (value instanceof Vector) {
        value = [value.x, value.y, value.z];
      } else if (value instanceof Matrix) {
        value = value.m;
      }
      if (isArray(value)) {
        switch (value.length) {
          case 1: gl.uniform1fv(location, new Float32Array(value)); break;
          case 2: gl.uniform2fv(location, new Float32Array(value)); break;
          case 3: gl.uniform3fv(location, new Float32Array(value)); break;
          case 4: gl.uniform4fv(location, new Float32Array(value)); break;
          // Matrices are automatically transposed, since WebGL uses column-major
          // indices instead of row-major indices.
          case 9: gl.uniformMatrix3fv(location, false, new Float32Array([
            value[0], value[3], value[6],
            value[1], value[4], value[7],
            value[2], value[5], value[8]
          ])); break;
          case 16: gl.uniformMatrix4fv(location, false, new Float32Array([
            value[0], value[4], value[8], value[12],
            value[1], value[5], value[9], value[13],
            value[2], value[6], value[10], value[14],
            value[3], value[7], value[11], value[15]
          ])); break;
          default: throw 'don\'t know how to load uniform "' + name + '" of length ' + value.length;
        }
      } else if (isNumber(value)) {
        (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
      } else {
        throw 'attempted to set uniform "' + name + '" to invalid value ' + value;
      }
    }

    return this;
  },

  // ### .draw(mesh[, mode])
  // 
  // Sets all uniform matrix attributes, binds all relevant buffers, and draws the
  // mesh geometry as indexed triangles or indexed lines. Set `mode` to `gl.LINES`
  // (and either add indices to `lines` or call `computeWireframe()`) to draw the
  // mesh in wireframe.
  draw: function(mesh, mode) {
    this.drawBuffers(mesh.vertexBuffers,
      mesh.indexBuffers[mode == gl.LINES ? 'lines' : 'triangles'],
      arguments.length < 2 ? gl.TRIANGLES : mode);
  },

  // ### .drawBuffers(vertexBuffers, indexBuffer, mode)
  // 
  // Sets all uniform matrix attributes, binds all relevant buffers, and draws the
  // indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
  // names to `Buffer` objects of type `gl.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
  // object of type `gl.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
  // like `gl.TRIANGLES` or `gl.LINES`. This method automatically creates and caches
  // vertex attribute pointers for attributes as needed.
  drawBuffers: function(vertexBuffers, indexBuffer, mode) {
    this.uniforms({
      _gl_ModelViewMatrix: gl.modelviewMatrix,
      _gl_ProjectionMatrix: gl.projectionMatrix
    });
    if (this.needsMVPM) this.uniforms({
      _gl_ModelViewProjectionMatrix: Matrix.multiply(gl.projectionMatrix, gl.modelviewMatrix, resultMatrix)
    });
    if (this.needsNM) {
      var m = Matrix.transpose(Matrix.inverse(gl.modelviewMatrix, tempMatrix), resultMatrix).m;
      this.uniforms({
        _gl_NormalMatrix: [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]
      });
    }

    // Create and enable attribute pointers as necessary.
    var length = 0;
    for (var attribute in vertexBuffers) {
      var buffer = vertexBuffers[attribute];
      var location = this.attributes[attribute] ||
        gl.getAttribLocation(this.program, attribute.replace(/^gl_/, '_gl_'));
      if (location == -1 || !buffer.buffer) continue;
      this.attributes[attribute] = location;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, false, 0, 0);
      length = buffer.buffer.length / buffer.buffer.spacing;
    }

    // Disable unused attribute pointers.
    for (var attribute in this.attributes) {
      if (!(attribute in vertexBuffers)) {
        gl.disableVertexAttribArray(this.attributes[attribute]);
      }
    }

    // Draw the geometry.
    if (length && (!indexBuffer || indexBuffer.buffer)) {
      if (indexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
        gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawArrays(mode, 0, length);
      }
    }

    return this;
  }
};
