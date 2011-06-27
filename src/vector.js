Vector = function(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

Vector.prototype.negative = function() { return new Vector(-this.x, -this.y, -this.z); };
Vector.prototype.add = function(v) { var b = v instanceof Vector; return new Vector(this.x + (b ? v.x : v), this.y + (b ? v.y : v), this.z + (b ? v.z : v)); };
Vector.prototype.subtract = function(v) { var b = v instanceof Vector; return new Vector(this.x - (b ? v.x : v), this.y - (b ? v.y : v), this.z - (b ? v.z : v)); };
Vector.prototype.multiply = function(v) { var b = v instanceof Vector; return new Vector(this.x * (b ? v.x : v), this.y * (b ? v.y : v), this.z * (b ? v.z : v)); };
Vector.prototype.divide = function(v) { var b = v instanceof Vector; return new Vector(this.x / (b ? v.x : v), this.y / (b ? v.y : v), this.z / (b ? v.z : v)); };
Vector.prototype.dot = function(v) { return this.x * v.x + this.y * v.y + this.z * v.z; };
Vector.prototype.cross = function(v) { return new Vector(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); };
Vector.prototype.length = function() { return Math.sqrt(this.dot(this)); };
Vector.prototype.unit = function() { return this.divide(this.length()); };
Vector.prototype.min = function() { return Math.min(Math.min(this.x, this.y), this.z); };
Vector.prototype.max = function() { return Math.max(Math.max(this.x, this.y), this.z); };
Vector.prototype.toAngles = function() { return { theta: Math.atan2(this.z, this.x), phi: Math.asin(this.y / this.length()) }; };

Vector.fromAngles = function(theta, phi) { return new Vector(Math.cos(theta) * Math.cos(phi), Math.sin(phi), Math.sin(theta) * Math.cos(phi)); };
Vector.random = function() { return Vector.fromAngles(Math.random() * Math.PI * 2, Math.asin(Math.random() * 2 - 1)); };
Vector.min = function(a, b) { return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)); };
Vector.max = function(a, b) { return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)); };
Vector.lerp = function(a, b, percent) { return new Vector(a.x + (b.x - a.x) * percent, a.y + (b.y - a.y) * percent, a.z + (b.z - a.z) * percent); };
