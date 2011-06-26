function compileSource(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw 'compile error: ' + gl.getShaderInfoLog(shader);
    }
    return shader;
}

Shader = function(vertexSource, fragmentSource) {
    // Headers are prepended to the sources to provide some automatic functionality
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

    // Substitute the 'gl_' prefix for '_gl_' to avoid compile errors
    function regexMap(regex, text, callback) {
        while ((result = regex.exec(text)) != null) {
            callback(result);
        }
    }
    function fix(header, source) {
        source = header + source;
        regexMap(/gl_\w+/g, header, function(result) {
            source = source.replace(new RegExp(result, 'g'), '_' + result);
        });
        return source;
    }

    // Compile and link the shaders
    this.program = gl.createProgram();
    gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource = fix(vertexHeader, vertexSource)));
    gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource = fix(fragmentHeader, fragmentSource)));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw 'link error: ' + gl.getProgramInfoLog(this.program);
    }
    this.attributes = {};

    // Detect all the samplers so we know to upload them as ints instead of
    var isSampler = {};
    regexMap(/uniform\s*sampler\dD\s*(\w+)\s*;/g, vertexSource + fragmentSource, function(groups) {
        isSampler[groups[1]] = 1;
    });
    this.isSampler = isSampler;
};

function isArray(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
}

function isNumber(obj) {
    return Object.prototype.toString.call(obj) == '[object Number]';
}

Shader.prototype.uniforms = function(uniforms) {
    gl.useProgram(this.program);

    // Guess uniform type from values, using special parsing to distinguish sampler uniforms for textures
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
                case 9: gl.uniformMatrix3fv(location, false, new Float32Array([
                    // Matrices need to be transposed
                    value[0], value[3], value[6],
                    value[1], value[4], value[7],
                    value[2], value[5], value[8]
                ])); break;
                case 16: gl.uniformMatrix4fv(location, false, new Float32Array([
                    // Matrices need to be transposed
                    value[0], value[4], value[8], value[12],
                    value[1], value[5], value[9], value[13],
                    value[2], value[6], value[10], value[14],
                    value[3], value[7], value[11], value[15]
                ])); break;
                default: throw 'don\'t know how to load uniform "' + name + '" of length ' + value.length;
            }
        } else if (isNumber(value)) {
            // Textures need to be uploaded as ints, not floats
            (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
        } else {
            throw 'attempted to set uniform "' + name + '" to invalid value ' + value;
        }
    }

    // Allow chaining
    return this;
};

Shader.prototype.draw = function(vertexBuffers, indexBuffer) {
    // Sneak the matrices in as uniforms, substituting the 'gl_' prefix for '_gl_'
    this.uniforms({
        _gl_ModelViewMatrix: gl.modelviewMatrix,
        _gl_ProjectionMatrix: gl.projectionMatrix,
        _gl_ModelViewProjectionMatrix: gl.projectionMatrix.multiply(gl.modelviewMatrix)
    });

    // Allow passing a mesh as the only argument
    if (arguments.length == 1) {
        var mesh = arguments[0];
        vertexBuffers = mesh.vertexBuffers;
        indexBuffer = mesh.indexBuffer;
    }

    // Point attributes to vertex buffers, substituting the 'gl_' prefix for '_gl_'
    for (var name in vertexBuffers) {
        var vertexBuffer = vertexBuffers[name];
        var attribute = this.attributes[name] || gl.getAttribLocation(this.program, name.replace(/^gl_/, '_gl_'));
        if (attribute == -1) continue;
        this.attributes[name] = attribute;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, vertexBuffer.spacing, gl.FLOAT, false, 0, 0);
    }

    // Only enable attributes found in vertexBuffers
    for (var name in this.attributes) {
        if (!(name in vertexBuffers)) {
            gl.disableVertexArray(this.attributes[name]);
        }
    }

    // Draw the geometry as triangles
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
    gl.drawElements(gl.TRIANGLES, indexBuffer.data.length, gl.UNSIGNED_SHORT, 0);

    // Allow chaining
    return this;
};
