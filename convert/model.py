import math

class Vector2:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class Vector3:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def __add__(self, v):
        return Vector3(self.x + v.x, self.y + v.y, self.z + v.z)

    def __sub__(self, v):
        return Vector3(self.x - v.x, self.y - v.y, self.z - v.z)

    def __mul__(self, n):
        return Vector3(self.x * n, self.y * n, self.z * n)

    def __div__(self, n):
        n = float(n)
        return Vector3(self.x / n, self.y / n, self.z / n)

    def cross(self, v):
        return Vector3(self.y * v.z - self.z * v.y, self.z * v.x - self.x * v.z, self.x * v.y - self.y * v.x)

    def length(self):
        return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)

    def unit(self):
        return self / self.length()

class Vertex:
    def __init__(self, x, y, z, nx=0, ny=0, nz=0, s=0, t=0):
        self.pos = Vector3(x, y, z)
        self.normal = Vector3(nx, ny, nz)
        self.coord = Vector2(s, t)

class Triangle:
    def __init__(self, a, b, c):
        self.a = a
        self.b = b
        self.c = c

class Model:
    def __init__(self):
        self.vertices = []
        self.triangles = []

    def center(self):
        x, y, z = 0, 1.0e9, 0
        for v in self.vertices:
            x += v.pos.x
            y = min(y, v.pos.y)
            z += v.pos.z
        x /= len(self.vertices)
        z /= len(self.vertices)
        for v in self.vertices:
            v.pos.x -= x
            v.pos.y -= y
            v.pos.z -= z

    def compute_normals(self):
        for v in self.vertices:
            v.normal.x, v.normal.y, v.normal.z = 0, 0, 0
        for t in self.triangles:
            a, b, c = self.vertices[t.a], self.vertices[t.b], self.vertices[t.c]
            n = (b.pos - a.pos).cross(c.pos - a.pos).unit()
            a.normal += n
            b.normal += n
            c.normal += n
        for v in self.vertices:
            v.normal = v.normal.unit()
