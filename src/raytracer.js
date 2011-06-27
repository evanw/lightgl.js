HitTest = function(t, hit, normal) {
    this.t = arguments.length ? t : Number.MAX_VALUE;
    this.hit = hit;
    this.normal = normal;
};

HitTest.prototype.mergeWith = function(other) {
    if (other.t > 0 && other.t < this.t) {
        this.t = other.t;
        this.hit = other.hit;
        this.normal = other.normal;
    }
};

Raytracer = function() {
    var v = gl.getParameter(gl.VIEWPORT);
    var m = gl.modelviewMatrix.m;

    // Reconstruct the eye position
    var axisX = new Vector(m[0], m[4], m[8]);
    var axisY = new Vector(m[1], m[5], m[9]);
    var axisZ = new Vector(m[2], m[6], m[10]);
    var offset = new Vector(m[3], m[7], m[11]);
    this.eye = new Vector(-offset.dot(axisX), -offset.dot(axisY), -offset.dot(axisZ));

    // Generate rays through the four corners of the frustum
    var minX = v[0], maxX = minX + v[2];
    var minY = v[1], maxY = minY + v[3];
    this.ray00 = gl.unProject(minX, minY, 1).subtract(this.eye);
    this.ray10 = gl.unProject(maxX, minY, 1).subtract(this.eye);
    this.ray01 = gl.unProject(minX, maxY, 1).subtract(this.eye);
    this.ray11 = gl.unProject(maxX, maxY, 1).subtract(this.eye);
    this.viewport = v;
};

Raytracer.prototype.getRayForPixel = function(x, y) {
    x = (x - this.viewport[0]) / this.viewport[2];
    y = 1 - (y - this.viewport[1]) / this.viewport[3];
    var ray0 = Vector.lerp(this.ray00, this.ray10, x);
    var ray1 = Vector.lerp(this.ray01, this.ray11, x);
    return Vector.lerp(ray0, ray1, y).unit();
};

Raytracer.hitTestAABB = function(origin, ray, minCorner, maxCorner) {
    // Use the slab intersection method
    var tMin = minCorner.subtract(origin).divide(ray);
    var tMax = maxCorner.subtract(origin).divide(ray);
    var t1 = Vector.min(tMin, tMax);
    var t2 = Vector.max(tMin, tMax);
    var tNear = t1.max();
    var tFar = t2.min();

    if (tNear > 0 && tNear < tFar) {
        var epsilon = 1.0e-6, min = minCorner.add(epsilon), max = maxCorner.subtract(epsilon), hit = origin.add(ray.multiply(tNear));
        return new HitTest(tNear, hit, new Vector((hit.x > max.x) - (hit.x < min.x), (hit.y > max.y) - (hit.y < min.y), (hit.z > max.z) - (hit.z < min.z)));
    }

    return null;
};

Raytracer.hitTestSphere = function(origin, ray, center, radius) {
    var offset = origin.subtract(center);
    var a = ray.dot(ray);
    var b = 2 * ray.dot(offset);
    var c = offset.dot(offset) - radius * radius;
    var discriminant = b * b - 4 * a * c;

    if (discriminant > 0) {
        var t = (-b - Math.sqrt(discriminant)) / (2 * a), hit = origin.add(ray.multiply(t));
        return new HitTest(t, hit, hit.subtract(center).divide(radius));
    }

    return null;
};

Raytracer.hitTestTriangle = function(origin, ray, a, b, c) {
    var ab = b.subtract(a);
    var ac = c.subtract(a);
    var normal = ab.cross(ac).unit();
    var t = normal.dot(a.subtract(origin)).divide(normal.dot(ray));

    if (t > 0) {
        var hit = origin.add(ray.multiply(t));
        var toHit = hit.subtract(a);
        var dot00 = ac.dot(ac);
        var dot01 = ac.dot(ab);
        var dot02 = ac.dot(toHit);
        var dot11 = ab.dot(ab);
        var dot12 = ab.dot(toHit);
        var divide = dot00 * dot11 - dot01 * dot01;
        var u = (dot11 * dot02 - dot01 * dot12) / divide;
        var v = (dot00 * dot12 - dot01 * dot02) / divide;
        if (u >= 0 && v >= 0 && u + v <= 1) return new HitTest(t, hit, normal);
    }

    return null;
};
