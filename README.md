# lightgl.js

This library makes it easier to quickly prototype WebGL applications. It's lower level than many other WebGL libraries and while it doesn't provide a scene graph, it re-implements OpenGL's modelview/projection matrix stack to provide similar functionality. It also re-introduces some built-in uniforms from GLSL, including `gl_Vertex` and `gl_ModelViewProjectionMatrix`.

## Building the library

* `python build.py`: build `lightgl.js` from the files in the `src` directory
* `python build.py debug`: rebuild the library any time the contents of the `src` directory change
* `python build.py release`: minify the library using Google Closure Compiler, which assumes there is a `closure` command in your path that runs `compiler.jar`
* `docco src/*.js`: build the documentation, which is generated in the `docs` directory

## Sample code

    <script src="lightgl.js"></script>
    <body><script>

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

    </script></body>

## Documentation

Documentation is available at http://evanw.github.com/lightgl.js/docs/main.html.
