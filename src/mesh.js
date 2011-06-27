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

function vectorToList2(v) { return [v.x, v.y]; }
function vectorToList3(v) { return [v.x, v.y, v.z]; }
function triangleToList(t) { return [t.a, t.b, t.c]; }
function listToVector2(v) { return new Vector(v[0], v[1]); }
function listToVector3(v) { return new Vector(v[0], v[1], v[2]); }
function listToTriangle(t) { return new Triangle(t[0], t[1], t[2]); }

Mesh = function(options) {
    options = options || {};
    this.vertexBuffers = {};
    this.indexBuffer = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Int16Array);
    this.triangles = [];
    this.addVertexBuffer('gl_Vertex', 'vertices', vectorToList3);
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
    this.indexBuffer.data = Array.prototype.concat.apply([], this.triangles.map(triangleToList));
    this.indexBuffer.compile();
};

Mesh.prototype.computeAABB = function() {
    var aabb = { min: new Vector(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE) };
    aabb.max = aabb.min.negative();
    for (var i = 0; i < this.vertices.length; i++) {
        var v = this.vertices[i];
        aabb.min = Vector.min(aabb.min, v);
        aabb.max = Vector.max(aabb.max, v);
    }
    return aabb;
};

Mesh.prototype.computeBoundingSphere = function() {
    var aabb = this.computeAABB();
    var sphere = { center: aabb.min.add(aabb.max).divide(2), radius: 0 };
    for (var i = 0; i < this.vertices.length; i++) {
        sphere.radius = Math.max(sphere.radius, this.vertices[i].subtract(sphere.center).length());
    }
    return sphere;
};

Mesh.plane = function(sizeX, sizeY, countX, countY, options) {
    var mesh = new Mesh(options);
    for (var y = 0; y <= countY; y++) {
        var t = y / countY;
        for (var x = 0; x <= countX; x++) {
            var s = x / countX;
            mesh.vertices.push(new Vector((s - 0.5) * sizeX, (t - 0.5) * sizeY, 0));
            if (mesh.coords) mesh.coords.push(new Vector(s, t));
            if (mesh.normals) mesh.normals.push(new Vector(0, 0, 1));
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

var cubeData = [
    [0, 4, 2, 6, -1, 0, 0], // -x
    [1, 3, 5, 7, +1, 0, 0], // +x
    [0, 1, 4, 5, 0, -1, 0], // -y
    [2, 6, 3, 7, 0, +1, 0], // +y
    [0, 2, 1, 3, 0, 0, -1], // -z
    [4, 5, 6, 7, 0, 0, +1]  // +z
];

Mesh.cube = function(sizeX, sizeY, sizeZ) {
    var mesh = new Mesh();
    for (var i = 0; i < cubeData.length; i++) {
        var data = cubeData[i], v = i * 4;
        for (var j = 0; j < 4; j++) {
            var d = data[j];
            mesh.vertices.push(new Vector(((d & 1) - 0.5) * sizeX, ((d & 2) / 2 - 0.5) * sizeY, ((d & 4) / 4 - 0.5) * sizeZ));
            if (mesh.coords) mesh.coords.push(new Vector(j & 1, (j & 2) / 2));
            if (mesh.normals) mesh.normals.push(new Vector(data[4], data[5], data[6]));
        }
        mesh.triangles.push(new Triangle(v, v + 1, v + 2));
        mesh.triangles.push(new Triangle(v + 2, v + 1, v + 3));
    }
    mesh.compile();
    return mesh;
};

Mesh.load = function(json, options) {
    options = options || {};
    if (!json.coords) options.coords = false;
    if (!json.normals) options.normals = false;
    var mesh = new Mesh(options);
    mesh.vertices = json.vertices.map(listToVector3);
    if (mesh.coords) mesh.coords = json.coords.map(listToVector2);
    if (mesh.normals) mesh.normals = json.normals.map(listToVector3);
    mesh.triangles = json.triangles.map(listToTriangle);
    mesh.compile();
    return mesh;
};
