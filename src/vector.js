Vector = function(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

Vector.prototype.add = function(v) { return new Vector(this.x + v.x, this.y + v.y, this.z + v.z); };
Vector.prototype.subtract = function(v) { return new Vector(this.x - v.x, this.y - v.y, this.z - v.z); };
Vector.prototype.multiply = function(n) { return new Vector(this.x * n, this.y * n, this.z * n); };
Vector.prototype.divide = function(n) { return new Vector(this.x / n, this.y / n, this.z / n); };
Vector.prototype.dot = function(v) { return this.x * v.x + this.y * v.y + this.z * v.z; };
Vector.prototype.cross = function(v) { return new Vector(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); };
Vector.prototype.length = function() { return Math.sqrt(this.dot(this)); };
Vector.prototype.unit = function() { return this.divide(this.length()); };
