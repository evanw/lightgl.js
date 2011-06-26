Texture = function(width, height, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = width;
    this.height = height;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.magFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.minFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
    var format = options.format || gl.RGBA;
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, options.type || gl.UNSIGNED_BYTE, null);
};

Texture.prototype.bind = function(unit) {
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, this.id);
};

Texture.prototype.unbind = function(unit) {
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, null);
};

Texture.fromImage = function(image) {
    var texture = new Texture(image.width, image.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
};
