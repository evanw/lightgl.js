Matrix = function() {
    this.m = Array.prototype.concat.apply([], arguments);
    if (!this.m.length) {
        this.m = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }
};

Matrix.prototype.inverse = function() {
    // Implementation from the Mesa OpenGL function __gluInvertMatrixd()
    var m = this.m, inv = new Matrix(
        m[5]*m[10]*m[15] - m[5]*m[14]*m[11] - m[6]*m[9]*m[15] + m[6]*m[13]*m[11] + m[7]*m[9]*m[14] - m[7]*m[13]*m[10],
        -m[1]*m[10]*m[15] + m[1]*m[14]*m[11] + m[2]*m[9]*m[15] - m[2]*m[13]*m[11] - m[3]*m[9]*m[14] + m[3]*m[13]*m[10],
        m[1]*m[6]*m[15] - m[1]*m[14]*m[7] - m[2]*m[5]*m[15] + m[2]*m[13]*m[7] + m[3]*m[5]*m[14] - m[3]*m[13]*m[6],
        -m[1]*m[6]*m[11] + m[1]*m[10]*m[7] + m[2]*m[5]*m[11] - m[2]*m[9]*m[7] - m[3]*m[5]*m[10] + m[3]*m[9]*m[6],

        -m[4]*m[10]*m[15] + m[4]*m[14]*m[11] + m[6]*m[8]*m[15] - m[6]*m[12]*m[11] - m[7]*m[8]*m[14] + m[7]*m[12]*m[10],
        m[0]*m[10]*m[15] - m[0]*m[14]*m[11] - m[2]*m[8]*m[15] + m[2]*m[12]*m[11] + m[3]*m[8]*m[14] - m[3]*m[12]*m[10],
        -m[0]*m[6]*m[15] + m[0]*m[14]*m[7] + m[2]*m[4]*m[15] - m[2]*m[12]*m[7] - m[3]*m[4]*m[14] + m[3]*m[12]*m[6],
        m[0]*m[6]*m[11] - m[0]*m[10]*m[7] - m[2]*m[4]*m[11] + m[2]*m[8]*m[7] + m[3]*m[4]*m[10] - m[3]*m[8]*m[6],

        m[4]*m[9]*m[15] - m[4]*m[13]*m[11] - m[5]*m[8]*m[15] + m[5]*m[12]*m[11] + m[7]*m[8]*m[13] - m[7]*m[12]*m[9],
        -m[0]*m[9]*m[15] + m[0]*m[13]*m[11] + m[1]*m[8]*m[15] - m[1]*m[12]*m[11] - m[3]*m[8]*m[13] + m[3]*m[12]*m[9],
        m[0]*m[5]*m[15] - m[0]*m[13]*m[7] - m[1]*m[4]*m[15] + m[1]*m[12]*m[7] + m[3]*m[4]*m[13] - m[3]*m[12]*m[5],
        -m[0]*m[5]*m[11] + m[0]*m[9]*m[7] + m[1]*m[4]*m[11] - m[1]*m[8]*m[7] - m[3]*m[4]*m[9] + m[3]*m[8]*m[5],

        -m[4]*m[9]*m[14] + m[4]*m[13]*m[10] + m[5]*m[8]*m[14] - m[5]*m[12]*m[10] - m[6]*m[8]*m[13] + m[6]*m[12]*m[9],
        m[0]*m[9]*m[14] - m[0]*m[13]*m[10] - m[1]*m[8]*m[14] + m[1]*m[12]*m[10] + m[2]*m[8]*m[13] - m[2]*m[12]*m[9],
        -m[0]*m[5]*m[14] + m[0]*m[13]*m[6] + m[1]*m[4]*m[14] - m[1]*m[12]*m[6] - m[2]*m[4]*m[13] + m[2]*m[12]*m[5],
        m[0]*m[5]*m[10] - m[0]*m[9]*m[6] - m[1]*m[4]*m[10] + m[1]*m[8]*m[6] + m[2]*m[4]*m[9] - m[2]*m[8]*m[5]
    );
    var det = m[0]*inv.m[0] + m[1]*inv.m[4] + m[2]*inv.m[8] + m[3]*inv.m[12];
    if (det == 0) return new Matrix();
    for (var i = 0; i < 16; i++) inv.m[i] /= det;
    return inv;
};

Matrix.prototype.multiply = function(matrix) {
    var a = this.m, b = matrix.m;
    return new Matrix(
        a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
        a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
        a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
        a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],

        a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12],
        a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13],
        a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
        a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],

        a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12],
        a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13],
        a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
        a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],

        a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12],
        a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13],
        a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
        a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15]
    );
};

Matrix.prototype.transformPoint = function(v) {
    var m = this.m;
    return new Vector(
        m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3],
        m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7],
        m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11]
    ).divide(m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15]);
};

Matrix.prototype.transformVector = function(v) {
    var m = this.m;
    return new Vector(
        m[0] * v.x + m[1] * v.y + m[2] * v.z,
        m[4] * v.x + m[5] * v.y + m[6] * v.z,
        m[8] * v.x + m[9] * v.y + m[10] * v.z
    );
};

Matrix.perspective = function(fov, aspect, near, far) {
    var y = Math.tan(fov * Math.PI / 360) * near;
    var x = y * aspect;
    return Matrix.frustum(-x, x, -y, y, near, far);
};

Matrix.frustum = function(l, r, b, t, n, f) {
    return new Matrix(
        2*n/(r-l), 0, (r+l)/(r-l), 0,
        0, 2*n/(t-b), (t+b)/(t-b), 0,
        0, 0, -(f+n)/(f-n), -2*f*n/(f-n),
        0, 0, -1, 0
    );
};

Matrix.ortho = function(l, r, b, t, n, f) {
    return new Matrix(
        2/(r-l), 0, 0, (r+l)/(r-l),
        0, 2/(t-b), 0, (t+b)/(t-b),
        0, 0, -2/(f-n), (f+n)/(f-n),
        0, 0, 0, 1
    );
};

Matrix.scale = function(x, y, z) {
    return new Matrix(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
};

Matrix.translate = function(x, y, z) {
    return new Matrix(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1
    );
};

Matrix.rotate = function(a, x, y, z) {
    if (a && (x || y || z)) {
        var d = Math.sqrt(x*x + y*y + z*z);
        a *= Math.PI / 180; x /= d; y /= d; z /= d;
        var c = Math.cos(a), s = Math.sin(a), t = 1 - c;
        return new Matrix(
            x*x*t+c, x*y*t-z*s, x*z*t+y*s, 0,
            y*x*t+z*s, y*y*t+c, y*z*t-x*s, 0,
            z*x*t-y*s, z*y*t+x*s, z*z*t+c, 0,
            0, 0, 0, 1
        );
    } else {
        return new Matrix();
    }
};

Matrix.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    var e = new Vector(ex, ey, ez);
    var c = new Vector(cx, cy, cz);
    var u = new Vector(ux, uy, uz);
    var f = e.subtract(c).unit();
    var s = u.cross(f).unit();
    var t = f.cross(s).unit();
    return new Matrix(
        s.x, s.y, s.z, -s.dot(e),
        t.x, t.y, t.z, -t.dot(e),
        f.x, f.y, f.z, -f.dot(e),
        0, 0, 0, 1
    );
};
