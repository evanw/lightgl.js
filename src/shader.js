// Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
// prefixed with `gl_`, are automatically added to all shader sources to make
// simple shaders easier to write.
// 
// Example usage:
// 
//     var shader = new Shader('\
//         void main() {\
//             gl_Position = gl_ModelViewProjectionMatrix\
//                           * vec4(gl_Vertex, 1.0);\
//         }\
//     ', '\
//         uniform vec3 color;\
//         void main() {\
//             gl_FragColor = vec4(color, 1.0);\
//         }\
//     ');
// 
//     shader.uniforms({
//         color: [1, 0, 0]
//     }).draw(mesh);

// ### new Shader(vertexSource, fragmentSource)
// 
// Compiles a shader program using the provided vertex and fragment shaders.
Shader = function(vertexSource, fragmentSource) {
    // Headers are prepended to the sources to provide some automatic functionality.
    var header = '\
        uniform mat4 gl_ModelViewMatrix;\
        uniform mat4 gl_ProjectionMatrix;\
        uniform mat4 gl_ModelViewProjectionMatrix;\
    ';
    var vertexHeader = '\
        attribute vec3 gl_Vertex;\
        attribute vec2 gl_TexCoord;\
        attribute vec3 gl_Normal;\
    ' + header;
    var fragmentHeader = '\
        precision highp float;\
    ' + header;

    // The `gl_` prefix must be substituted for something else to avoid compile errors,
    // since it's a reserved prefix. This prefixes all reserved names with `_`.
    function regexMap(regex, text, callback) {
        while ((result = regex.exec(text)) != null) {
            callback(result);
        }
    }
    // Insert the header after any extensions, since those must come first.
    function fix(header, source) {
        var match = /^((\s*\/\/.*\n|\s*#extension.*\n)+)[^]*$/.exec(source);
        source = match ? match[1] + header + source.substr(match[1].length) : header + source;
        regexMap(/\bgl_\w+\b/g, header, function(result) {
            source = source.replace(new RegExp(result, 'g'), '_' + result);
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
            __error('compile error: ' + gl.getShaderInfoLog(shader));
        }
        return shader;
    }
    this.program = gl.createProgram();
    gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        __error('link error: ' + gl.getProgramInfoLog(this.program));
    }
    this.attributes = {};

    // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
    // To do this automatically, we detect and remember all uniform samplers in the source code.
    var isSampler = {};
    regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertexSource + fragmentSource, function(groups) {
        isSampler[groups[2]] = 1;
    });
    this.isSampler = isSampler;
    this.needsMVP = (vertexSource + fragmentSource).indexOf('gl_ModelViewProjectionMatrix') != -1;
};

function isArray(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
}

function isNumber(obj) {
    return Object.prototype.toString.call(obj) == '[object Number]';
}

// ### .uniforms(uniforms)
// 
// Set a uniform for each property of `uniforms`. The correct `gl.uniform*()` method is
// inferred from the value types and from the stored uniform sampler flags.
Shader.prototype.uniforms = function(uniforms) {
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
                default: __error('don\'t know how to load uniform "' + name + '" of length ' + value.length);
            }
        } else if (isNumber(value)) {
            (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
        } else {
            __error('attempted to set uniform "' + name + '" to invalid value ' + value);
        }
    }

    return this;
};

// ### .draw(mesh[, mode])
// 
// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
// mesh geometry as indexed triangles or indexed lines. Set `mode` to `gl.LINES`
// (and either add indices to `lines` or call `computeWireframe()`) to draw the
// mesh in wireframe.
Shader.prototype.draw = function(mesh, mode) {
    this.drawBuffers(mesh.vertexBuffers,
        mesh.indexBuffers[mode == gl.LINES ? 'lines' : 'triangles'],
        mode || gl.TRIANGLES);
};

// ### .drawBuffers(vertexBuffers, indexBuffer, mode)
// 
// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
// indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
// names to `Buffer` objects of type `gl.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
// object of type `gl.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
// like `gl.TRIANGLES` or `gl.LINES`. This method automatically creates and caches
// vertex attribute pointers for attributes as needed.
Shader.prototype.drawBuffers = function(vertexBuffers, indexBuffer, mode) {
    this.uniforms({
        _gl_ModelViewMatrix: gl.modelviewMatrix,
        _gl_ProjectionMatrix: gl.projectionMatrix
    });
    if (this.needsMVP) this.uniforms({
        _gl_ModelViewProjectionMatrix: gl.projectionMatrix.multiply(gl.modelviewMatrix)
    });

    // Create and enable attribute pointers as necessary.
    for (var attribute in vertexBuffers) {
        var buffer = vertexBuffers[attribute];
        var location = this.attributes[attribute] ||
            gl.getAttribLocation(this.program, attribute.replace(/^gl_/, '_gl_'));
        if (location == -1) continue;
        this.attributes[attribute] = location;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, false, 0, 0);
    }

    // Disable unused attribute pointers.
    for (var attribute in this.attributes) {
        if (!(attribute in vertexBuffers)) {
            gl.disableVertexAttribArray(this.attributes[attribute]);
        }
    }

    // Draw the geometry.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
    gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);

    return this;
};
