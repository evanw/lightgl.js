// Provides a simple wrapper around WebGL textures that supports render-to-texture.

// ### new Texture(width, height[, options])
//
// The arguments `width` and `height` give the size of the texture in texels.
// WebGL texture dimensions must be powers of two unless `filter` is set to
// either `gl.NEAREST` or `gl.REPEAT` and `wrap` is set to `gl.CLAMP_TO_EDGE`
// (which they are by default).
//
// Texture parameters can be passed in via the `options` argument.
// Example usage:
// 
//     var t = new Texture(256, 256, {
//         // Defaults to gl.LINEAR, set both at once with "filter"
//         magFilter: gl.NEAREST,
//         minFilter: gl.LINEAR,
// 
//         // Defaults to gl.CLAMP_TO_EDGE, set both at once with "wrap"
//         wrapS: gl.REPEAT,
//         wrapT: gl.REPEAT,
// 
//         format: gl.RGB, // Defaults to gl.RGBA
//         type: gl.FLOAT // Defaults to gl.UNSIGNED_BYTE
//     });
Texture = function(width, height, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = width;
    this.height = height;
    this.format = options.format || gl.RGBA;
    this.type = options.type || gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.filter || options.magFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.filter || options.minFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
};

// ### .bind([unit])
// 
// Bind this texture to the given texture unit (0-7, defaults to 0).
Texture.prototype.bind = function(unit) {
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, this.id);
};

// ### .unbind([unit])
// 
// Clear the given texture unit (0-7, defaults to 0).
Texture.prototype.unbind = function(unit) {
    gl.activeTexture(gl.TEXTURE0 + (unit || 0));
    gl.bindTexture(gl.TEXTURE_2D, null);
};

var framebuffer;
var renderbuffer;

// ### .drawTo(callback)
// 
// Render all draw calls in `callback` to this texture. This method sets up
// a framebuffer with this texture as the color attachment and a renderbuffer
// as the depth attachment. It also temporarily changes the viewport to the
// size of the texture.
// 
// Example usage:
// 
//     texture.drawTo(function() {
//         gl.clearColor(1, 0, 0, 1);
//         gl.clear(gl.COLOR_BUFFER_BIT);
//     });
Texture.prototype.drawTo = function(callback) {
    var v = gl.getParameter(gl.VIEWPORT);
    framebuffer = framebuffer || gl.createFramebuffer();
    renderbuffer = renderbuffer || gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    if (this.width != renderbuffer.width || this.height != renderbuffer.height) {
        renderbuffer.width = this.width;
        renderbuffer.height = this.height;
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    gl.viewport(0, 0, this.width, this.height);

    callback();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.viewport(v[0], v[1], v[2], v[3]);
};

// ### .swapWith(other)
// 
// Switch this texture with `other`, useful for the ping-pong rendering
// technique used in multi-stage rendering.
Texture.prototype.swapWith = function(other) {
    var temp;
    temp = other.id; other.id = this.id; this.id = temp;
    temp = other.width; other.width = this.width; this.width = temp;
    temp = other.height; other.height = this.height; this.height = temp;
};

// ### .fromImage(image[, options])
// 
// Return a new image created from `image`, an `<img>` tag.
Texture.fromImage = function(image, options) {
    options = options || {};
    var texture = new Texture(image.width, image.height, options);
    gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, texture.type, image);
    if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
};
