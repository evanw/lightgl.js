from model import *

def _index(part):
    indices = [int(p) - 1 if p else -1 for p in part.split('/')]
    while len(indices) < 3:
        indices.append(-1)
    return indices[:3]

def load(f):
    # parse obj
    vertices = []
    normals = []
    coords = []
    triangles = []
    for line in f:
        parts = line.strip().split()
        if len(parts) == 4 and parts[0] == 'v':
            vertices.append(map(float, parts[1:]))
        elif len(parts) == 4 and parts[0] == 'vn':
            normals.append(map(float, parts[1:]))
        elif len(parts) >= 3 and parts[0] == 'vt':
            coords.append(map(float, parts[1:3]))
        elif len(parts) >= 4 and parts[0] == 'f':
            indices = [_index(p) for p in parts[1:]]
            for i in range(2, len(indices)):
                triangles.append([indices[0], indices[i - 1], indices[i]])

    # convert to model
    model = Model()
    vertex_map = {}
    for t in triangles:
        abc = [0, 0, 0]
        for i in range(3):
            v, c, n = t[i]
            vertex = tuple(vertices[v] + (normals[n] if 0 <= n < len(normals) else [0, 0, 0]) + (coords[c] if 0 <= c < len(coords) else [0, 0]))
            if vertex not in vertex_map:
                vertex_map[vertex] = len(model.vertices)
                model.vertices.append(Vertex(*vertex))
            abc[i] = vertex_map[vertex]
        model.triangles.append(Triangle(*abc))
    return model

def dump(model, f):
    f.write(''.join('v {0} {1} {2}\n'.format(v.pos.x, v.pos.y, v.pos.z) for v in model.vertices))
    f.write(''.join('vt {0} {1}\n'.format(v.coord.x, v.coord.y) for v in model.vertices))
    f.write(''.join('vn {0} {1} {2}\n'.format(v.normal.x, v.normal.y, v.normal.z) for v in model.vertices))
    f.write(''.join('f {0}/{0}/{0} {1}/{1}/{1} {2}/{2}/{2}\n'.format(t.a + 1, t.b + 1, t.c + 1) for t in model.triangles))
