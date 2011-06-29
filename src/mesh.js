// Represents indexed triangle geometry with arbitrary additional attributes.
// You need a shader to draw a mesh; meshes can't draw themselves.

// ### new Indexer()
// 
// Generates indices into a list of unique objects from a stream of objects
// that may contain duplicates. This is useful for generating compact indexed
// meshes from unindexed data.
Indexer = function() {
    this.unique = [];
    this.indices = [];
    this.map = {};
};

// ### .add(v)
// 
// Adds the object `obj` to `unique` if it hasn't already been added. Returns
// the index of `obj` in `unique`.
Indexer.prototype.add = function(obj) {
    var key = JSON.stringify(obj);
    if (!(key in this.map)) {
        this.map[key] = this.unique.length;
        this.unique.push(obj);
    }
    return this.map[key];
};

// ### new Triangle(a, b, c)
// 
// Holds the three vertex indices for a triangle.
Triangle = function(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
};

// ### .flip()
// 
// Reverses the ordering of the vertices on this triangle, which flipps the
// surface normal. Flipping all triangles on a mesh turns it inside out.
Triangle.prototype.flip = function() {
    var temp = this.b;
    this.b = this.c;
    this.c = temp;
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

// ### .transform(matrix)
// 
// Transform all vertices by `matrix` and all normals by the inverse transpose
// of `matrix`.
Mesh.prototype.transform = function(matrix) {
    this.vertices = this.vertices.map(function(v) { return matrix.transformPoint(v); });
    if (this.normals) {
        var invTrans = matrix.inverse().transpose();
        this.normals = this.normals.map(function(n) { return invTrans.transformVector(n).unit(); });
    }
    this.compile();
    return this;
};

// ### .computeNormals()
// 
// Computes a new normal for each vertex from the average normal of the
// neighboring triangles. This means adjacent triangles must share vertices
// for the resulting normals to be smooth.
Mesh.prototype.computeNormals = function() {
    if (!this.normals) this.addVertexBuffer('gl_Normal', 'normals', vectorToList3);
    for (var i = 0; i < this.vertices.length; i++) {
        this.normals[i] = new Vector();
    }
    for (var i = 0; i < this.triangles.length; i++) {
        var t = this.triangles[i];
        var a = this.vertices[t.a];
        var b = this.vertices[t.b];
        var c = this.vertices[t.c];
        var normal = b.subtract(a).cross(c.subtract(a)).unit();
        this.normals[t.a] = this.normals[t.a].add(normal);
        this.normals[t.b] = this.normals[t.b].add(normal);
        this.normals[t.c] = this.normals[t.c].add(normal);
    }
    for (var i = 0; i < this.vertices.length; i++) {
        this.normals[i] = this.normals[i].unit();
    }
    this.compile();
    return this;
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

// ### Mesh.plane([detailX, detailY, options])
// 
// Generates a square 2x2 mesh the xy plane centered at the origin. The mesh
// is a grid of `detailX` by `detailY` cells. Only generates a single cell
// by default.
Mesh.plane = function(detailX, detailY, options) {
    var mesh = new Mesh(options);
    detailX = detailX || 1;
    detailY = detailY || 1;

    for (var y = 0; y <= detailY; y++) {
        var t = y / detailY;
        for (var x = 0; x <= detailX; x++) {
            var s = x / detailX;
            mesh.vertices.push(new Vector(2 * s - 1, 2 * t - 1));
            if (mesh.coords) mesh.coords.push(new Vector(s, t));
            if (mesh.normals) mesh.normals.push(new Vector(0, 0, 1));
            if (x < detailX && y < detailY) {
                var i = x + y * (detailX + 1);
                mesh.triangles.push(new Triangle(i, i + 1, i + detailX + 1));
                mesh.triangles.push(new Triangle(i + detailX + 1, i + 1, i + detailX + 2));
            }
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

function pickOctant(i) {
    return new Vector((i & 1) * 2 - 1, (i & 2) - 1, (i & 4) / 2 - 1);
}

// ### Mesh.cube([options])
// 
// Generates a 2x2x2 box centered at the origin.
Mesh.cube = function(options) {
    var mesh = new Mesh(options);

    for (var i = 0; i < cubeData.length; i++) {
        var data = cubeData[i], v = i * 4;
        for (var j = 0; j < 4; j++) {
            var d = data[j];
            mesh.vertices.push(pickOctant(d));
            if (mesh.coords) mesh.coords.push(new Vector(j & 1, (j & 2) / 2));
            if (mesh.normals) mesh.normals.push(new Vector(data[4], data[5], data[6]));
        }
        mesh.triangles.push(new Triangle(v, v + 1, v + 2));
        mesh.triangles.push(new Triangle(v + 2, v + 1, v + 3));
    }

    mesh.compile();
    return mesh;
};

// ### Mesh.sphere([detail, options])
// 
// Generates a geodesic sphere of radius 1 with `detail * detail` facets
// per octant. Generates 36 facets per octant by default.
Mesh.sphere = function(detail, options) {
    var mesh = new Mesh(options);
    var indexer = new Indexer();
    detail = detail || 6;

    for (var octant = 0; octant < 8; octant++) {
        var scale = pickOctant(octant);
        var flip = scale.x * scale.y * scale.z > 0;
        var data = [];
        for (var i = 0; i <= detail; i++) {
            // Generate a row of vertices on the surface of the sphere
            // using barycentric coordinates.
            for (var j = 0; i + j <= detail; j++) {
                var a = i / detail;
                var b = j / detail;
                var c = (detail - i - j) / detail;
                var vertex = { vertex: new Vector(a, b, c).unit().multiply(scale) };
                if (mesh.coords) vertex.coord = scale.y > 0 ? new Vector(1 - a, c) :  new Vector(c, 1 - a);
                data.push(indexer.add(vertex));
            }

            // Generate triangles from this row and the previous row.
            if (i > 0) {
                for (var j = 0; i + j <= detail; j++) {
                    var a = (i - 1) * (detail + 1) + ((i - 1) - (i - 1) * (i - 1)) / 2 + j;
                    var b = i * (detail + 1) + (i - i * i) / 2 + j;
                    mesh.triangles.push(new Triangle(data[a], data[a + 1], data[b]));
                    if (flip) mesh.triangles[mesh.triangles.length - 1].flip();
                    if (i + j < detail) {
                        mesh.triangles.push(new Triangle(data[b], data[a + 1], data[b + 1]));
                        if (flip) mesh.triangles[mesh.triangles.length - 1].flip();
                    }
                }
            }
        }
    }

    // Reconstruct the geometry from the indexer.
    mesh.vertices = indexer.unique.map(function(v) { return v.vertex; });
    console.log(indexer.map);
    if (mesh.coords) mesh.coords = indexer.unique.map(function(v) { return v.coord; });
    if (mesh.normals) mesh.normals = mesh.vertices;
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
