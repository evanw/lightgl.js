from model import *
import json
import re
import os

def load(f):
    data = json.loads(re.compile(r'^var\s+\w+\s*=(.*);\s*$', re.S).sub(r'\1', f.read()))
    model = Model()
    model.vertices = [Vertex(*v) for v in data['vertices']]
    if 'normals' in data:
        for v, n in zip(model.vertices, data['normals']):
            v.normal = Vector3(*n)
    if 'coords' in data:
        for v, c in zip(model.vertices, data['coords']):
            v.coord = Vector2(*c)
    model.triangles = [Triangle(*t) for t in data['triangles']]
    return model

def dump(model, f):
    data = {
        'vertices': [[v.pos.x, v.pos.y, v.pos.z] for v in model.vertices],
        'coords': [[v.coord.x, v.coord.y] for v in model.vertices],
        'normals': [[v.normal.x, v.normal.y, v.normal.z] for v in model.vertices],
        'triangles': [[t.a, t.b, t.c] for t in model.triangles],
    }

    # only write out coords and normals if they are non-zero
    if not any(any(c) for c in data['coords']):
        del data['coords']
    if not any(any(n) for n in data['normals']):
        del data['normals']

    # we could just use json.dump(data, f) but that bloats the file format with a lot of numbers like 1.00000000000000001
    f.write('var %s = {\n' % re.sub(r'\..+$', '', os.path.basename(f.name)))
    for name in ['vertices', 'coords', 'normals', 'triangles']:
        if name not in data: continue
        elements = ','.join('[%s]' % ','.join(re.sub(r'\.?0+$', '', '%f' % y) for y in x) for x in data[name])
        f.write('    "%s": [%s]%s\n' % (name, elements, '' if name == 'triangles' else ','))
    f.write('};\n')
