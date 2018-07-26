# lightgl.js

This library makes it easier to quickly prototype WebGL applications. It's lower level than many other WebGL libraries and while it doesn't provide a scene graph, it re-implements OpenGL's modelview/projection matrix stack to provide similar functionality. It also re-introduces some built-in uniforms from GLSL (such as `gl_Vertex` and `gl_ModelViewProjectionMatrix`) and OpenGL's immediate mode.

## Install from npm

```shell
npm install lightgl
```

## Building the library

* `python build.py`: build `lightgl.js` from the files in the `src` directory
* `python build.py debug`: rebuild the library any time the contents of the `src` directory change
* `python build.py release`: minify the library using [UglifyJS](https://github.com/mishoo/UglifyJS2), which assumes there is an `uglifyjs` command in your path
* `docco src/*.js`: build the documentation, which is generated in the `docs` directory

The latest lightgl.js build can be found at http://evanw.github.com/lightgl.js/lightgl.js.

## Sample code
```html
    <!DOCTYPE html>
    <html><body>
      <script src="lightgl.js"></script>
      <script>

    var angle = 0;
    var gl = GL.create();
    var mesh = GL.Mesh.cube();
    var shader = new GL.Shader('\
      void main() {\
        gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
      }\
    ', '\
      void main() {\
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\
      }\
    ');

    gl.onupdate = function(seconds) {
      angle += 45 * seconds;
    };

    gl.ondraw = function() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.loadIdentity();
      gl.translate(0, 0, -5);
      gl.rotate(30, 1, 0, 0);
      gl.rotate(angle, 0, 1, 0);

      shader.draw(mesh);
    };

    gl.fullscreen();
    gl.animate();

      </script>
    </body></html>
```

## Documentation

The documentation is automatically generated using [Docco](http://jashkenas.github.com/docco/):

* [main.js](http://evanw.github.com/lightgl.js/docs/main.html): `GL`
* [matrix.js](http://evanw.github.com/lightgl.js/docs/matrix.html): `GL.Matrix`
* [mesh.js](http://evanw.github.com/lightgl.js/docs/mesh.html): `GL.Indexer`, `GL.Buffer`, `GL.Mesh`
* [raytracer.js](http://evanw.github.com/lightgl.js/docs/raytracer.html): `GL.HitTest`, `GL.Raytracer`
* [shader.js](http://evanw.github.com/lightgl.js/docs/shader.html): `GL.Shader`
* [texture.js](http://evanw.github.com/lightgl.js/docs/texture.html): `GL.Texture`
* [vector.js](http://evanw.github.com/lightgl.js/docs/vector.html): `GL.Vector`

## Examples

Available examples:

* [Simple rotating cube](http://evanw.github.com/lightgl.js/tests/readme.html)
* [Multitexturing](http://evanw.github.com/lightgl.js/tests/multitexture.html)
* [First person camera](http://evanw.github.com/lightgl.js/tests/camera.html)
* [Scene manipulation](http://evanw.github.com/lightgl.js/tests/scenemanip.html)
* [OpenGL immediate mode](http://evanw.github.com/lightgl.js/tests/immediatemode.html)
* [Rendering to a texture](http://evanw.github.com/lightgl.js/tests/rtt.html)
* [Shadow map from a point light](http://evanw.github.com/lightgl.js/tests/shadowmap.html)
* [Realtime raytracing](http://evanw.github.com/lightgl.js/tests/raytracing.html)
* [Constructive solid geometry](http://evanw.github.com/lightgl.js/tests/csg.html)
* [GPU lightmap generation](http://evanw.github.com/lightgl.js/tests/gpulightmap.html)
