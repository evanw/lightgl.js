Triangle = function(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
};

Buffer = function(target, type) {
    this.buffer = gl.createBuffer();
    this.target = target;
    this.type = type;
    this.spacing = 0;
    this.data = [];
};

Buffer.prototype.compile = function() {
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(this.data), gl.STATIC_DRAW);
};

function vectorToList3(v) {
    return [v.x, v.y, v.z];
}

function vectorToList2(v) {
    return [v.x, v.y];
}

Mesh = function(options) {
    options = options || {};
    this.vertexBuffers = {};
    this.indexBuffer = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Int16Array);
    this.triangles = [];
    this.addVertexBuffer('gl_Vertex', 'positions', vectorToList3);
    if (!('coords' in options) || options.coords) this.addVertexBuffer('gl_TexCoord', 'coords', vectorToList2);
    if (!('normals' in options) || options.normals) this.addVertexBuffer('gl_Normal', 'normals', vectorToList3);
};

Mesh.prototype.addVertexBuffer = function(attribute, name, converter) {
    var buffer = this.vertexBuffers[attribute] = new Buffer(gl.ARRAY_BUFFER, Float32Array);
    buffer.converter = converter;
    buffer.name = name;
    this[name] = [];
};

Mesh.prototype.compile = function() {
    // Compile vertex buffers
    for (var name in this.vertexBuffers) {
        var buffer = this.vertexBuffers[name];
        var data = this[buffer.name].map(buffer.converter);
        buffer.data = Array.prototype.concat.apply([], data);
        buffer.spacing = data[0].length;
        buffer.compile();
    }

    // Compile index buffer
    this.indexBuffer.data = Array.prototype.concat.apply([], this.triangles.map(function(t) { return [t.a, t.b, t.c]; }));
    this.indexBuffer.compile();
};

Mesh.plane = function(sizeX, sizeY, countX, countY, options) {
    var mesh = new Mesh(options);
    for (var y = 0; y <= countY; y++) {
        var t = y / countY;
        for (var x = 0; x <= countX; x++) {
            var s = x / countX;
            mesh.positions.push(new Vector((s - 0.5) * sizeX, (t - 0.5) * sizeY, 0));
            if (mesh.coords) mesh.coords.push(new Vector(s, t));
            if (mesh.normals) mesh.normals.push(new Vector(0, 1, 0));
        }
    }
    for (var y = 0; y < countY; y++) {
        for (var x = 0; x < countX; x++) {
            var i = x + y * (countX + 1);
            mesh.triangles.push(new Triangle(i, i + 1, i + countX + 1));
            mesh.triangles.push(new Triangle(i + countX + 1, i + 1, i + countX + 2));
        }
    }
    mesh.compile();
    return mesh;
};
