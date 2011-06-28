// Represents indexed triangle geometry with arbitrary additional attributes.
// You need a shader to draw a mesh; meshes can't draw themselves.

// ### new Triangle(a, b, c)
// 
// Holds the three vertex indices for a triangle.
Triangle = function(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
};

// ### new Buffer(target, type)
// 
// Provides a simple method of uploading data to a GPU buffer. Example usage:
// 
//     var vertices = new Buffer(gl.ARRAY_BUFFER, Float32Array);
//     var indices = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Int16Array);
//     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
//     indices.data = [[0, 1, 2], [2, 1, 3]];
//     vertices.compile();
//     indices.compile();
Buffer = function(target, type) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
};

// ### .compile()
// 
// Upload the contents of `data` to the GPU in preparation for rendering. The
// data must be a list of lists where each inner list has the same length. For
// example, each element of data for vertex normals would be a list of length three.
// This will remember the data length and element length for later use by shaders.
Buffer.prototype.compile = function() {
    var data = Array.prototype.concat.apply([], this.data);
    if (data.length) {
        this.buffer = this.buffer || gl.createBuffer();
        this.buffer.length = data.length;
        this.buffer.spacing = data.length / this.data.length;
        gl.bindBuffer(this.target, this.buffer);
        gl.bufferData(this.target, new this.type(data), gl.STATIC_DRAW);
    }
};

function vectorToList2(v) { return [v.x, v.y]; }
function vectorToList3(v) { return [v.x, v.y, v.z]; }
function triangleToList(t) { return [t.a, t.b, t.c]; }
function listToVector2(v) { return new Vector(v[0], v[1]); }
function listToVector3(v) { return new Vector(v[0], v[1], v[2]); }
function listToTriangle(t) { return new Triangle(t[0], t[1], t[2]); }

// ### new Mesh([options])
// 
// Represents a collection of vertex buffers and one index buffer. Each vertex
// buffer maps to one attribute in GLSL and has a corresponding property set
// on the Mesh instance. There are three vertex buffers by default: `vertices`
// maps to `gl_Vertex`, `coords` maps to `gl_TexCoord`, and `normals` maps to
// `gl_Normal`. The `coords` and `normals` vertex buffers can be disabled by
// setting the corresponding options to false.
Mesh = function(options) {
    options = options || {};
    this.vertexBuffers = {};
    this.indexBuffer = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Int16Array);
    this.triangles = [];
    this.addVertexBuffer('gl_Vertex', 'vertices', vectorToList3);
    if (!('coords' in options) || options.coords) this.addVertexBuffer('gl_TexCoord', 'coords', vectorToList2);
    if (!('normals' in options) || options.normals) this.addVertexBuffer('gl_Normal', 'normals', vectorToList3);
};

// ### .addVertexBuffer(attribute, name, converter)
// 
// Add a new vertex buffer with a list as a property called `name` on this object
// and map it to the attribute called `attribute` in all shaders that draw this mesh.
// Use `converter` to convert from elements in `data` to lists, which allows the
// elements of `data` to be complex data types like vectors.
Mesh.prototype.addVertexBuffer = function(attribute, name, converter) {
    var buffer = this.vertexBuffers[attribute] = new Buffer(gl.ARRAY_BUFFER, Float32Array);
    buffer.converter = converter;
    buffer.name = name;
    this[name] = [];
};

// ### .compile()
// 
// Upload all attached buffers to the GPU in preparation for rendering. This
// doesn't need to be called every frame, only needs to be done when the data
// changes.
Mesh.prototype.compile = function() {
    for (var name in this.vertexBuffers) {
        var buffer = this.vertexBuffers[name];
        buffer.data = this[buffer.name].map(buffer.converter);
        buffer.compile();
    }

    this.indexBuffer.data = this.triangles.map(triangleToList);
    this.indexBuffer.compile();
};

// ### .getAABB()
// 
// Computes the axis-aligned bounding box, which is an object whose `min` and
// `max` properties contain the minimum and maximum coordinates of all vertices.
Mesh.prototype.getAABB = function() {
    var aabb = { min: new Vector(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE) };
    aabb.max = aabb.min.negative();
    for (var i = 0; i < this.vertices.length; i++) {
        var v = this.vertices[i];
        aabb.min = Vector.min(aabb.min, v);
        aabb.max = Vector.max(aabb.max, v);
    }
    return aabb;
};

// ### .getBoundingSphere()
// 
// Computes a sphere that contains all vertices (not necessarily the smallest
// sphere). The returned object has two properties, `center` and `radius`.
Mesh.prototype.getBoundingSphere = function() {
    var aabb = this.getAABB();
    var sphere = { center: aabb.min.add(aabb.max).divide(2), radius: 0 };
    for (var i = 0; i < this.vertices.length; i++) {
        sphere.radius = Math.max(sphere.radius, this.vertices[i].subtract(sphere.center).length());
    }
    return sphere;
};

// ### Mesh.plane(sizeX, sizeY, countX, countY[, options])
// 
// Generates a rectangular `sizeX` by `sizeY` mesh the xy plane centered at the
// origin. The mesh is a grid of `countX` by `countY` cells.
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

// ### Mesh.cube(sizeX, sizeY, sizeZ[, options])
// 
// Generates a `sizeX` by `sizeY` by `sizeZ` box centered at the origin.
Mesh.cube = function(sizeX, sizeY, sizeZ, options) {
    var mesh = new Mesh(options);
    for (var i = 0; i < cubeData.length; i++) {
        var data = cubeData[i], v = i * 4;
        for (var j = 0; j < 4; j++) {
            var d = data[j];
            mesh.vertices.push(new Vector(
                ((d & 1) - 0.5) * sizeX,
                ((d & 2) / 2 - 0.5) * sizeY,
                ((d & 4) / 4 - 0.5) * sizeZ
            ));
            if (mesh.coords) mesh.coords.push(new Vector(j & 1, (j & 2) / 2));
            if (mesh.normals) mesh.normals.push(new Vector(data[4], data[5], data[6]));
        }
        mesh.triangles.push(new Triangle(v, v + 1, v + 2));
        mesh.triangles.push(new Triangle(v + 2, v + 1, v + 3));
    }
    mesh.compile();
    return mesh;
};

// ### Mesh.load(json[, options])
// 
// Creates a mesh from the JSON generated by the `convert/convert.py` script.
// Example usage:
// 
//     var data = {
//         vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
//         triangles: [0, 1, 2]
//     };
//     var mesh = Mesh.load(data);
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
