# lightgl.js

This library makes it easier to quickly prototype WebGL applications. It's lower level than many other WebGL libraries and while it doesn't provide a scene graph, it re-implements OpenGL's modelview/projection matrix stack to provide similar functionality. It also re-introduces some built-in uniforms from GLSL, including `gl_Vertex` and `gl_ModelViewProjectionMatrix`.

## Building the library

* `python build.py`: build `lightgl.js` from the files in the `src` directory
* `python build.py debug`: rebuild the library any time the contents of the `src` directory change
* `python build.py release`: minify the library using Google Closure Compiler, which assumes there is a `closure` command in your path that runs `compiler.jar`
* `docco src/*.js`: build the documentation, which is generated in the `docs` directory

## Sample code

    <script src="lightgl.js"></script>
    <script>

    var mesh;
    var shader;
    var angle = 0;

    function setup() {
        document.body.appendChild(gl.canvas);
        gl.clearColor(0, 0, 0, 1);
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(45, gl.canvas.width / gl.canvas.height, 0.01, 100);
        gl.matrixMode(gl.MODELVIEW);
        mesh = Mesh.cube();
        shader = new Shader('\
            void main() {\
                gl_Position = gl_ModelViewProjectionMatrix * vec4(gl_Vertex, 1.0);\
            }\
        ', '\
            void main() {\
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\
            }\
        ');
    }

    function update(seconds) {
        angle += 45 * seconds;
    }

    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        gl.translate(0, 0, -5);
        gl.rotate(30, 1, 0, 0);
        gl.rotate(angle, 0, 1, 0);
        shader.draw(mesh);
    }

    </script>
