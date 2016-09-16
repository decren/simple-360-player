(function (global) {
    'use strict'

    var FRAGMENT_SOURCE = '\
            varying mediump vec3 vDirection;\
            uniform sampler2D uSampler;\
            void main(void) {\
                mediump float theta = atan(vDirection.x, -1.0 * vDirection.z);\
                mediump float phi = atan(vDirection.y, length(vDirection.xz));\
                gl_FragColor = texture2D(uSampler, vec2(mod(theta / (2.0*3.141592653589), 1.0), phi / 3.141592653589 + 0.5));\
            }\
        ',

        VERTEX_SOURCE = '\
            attribute mediump vec2 aVertexPosition;\
            varying mediump vec3 vDirection;\
            void main(void) {\
                gl_Position = vec4(aVertexPosition, 1.0, 1.0);\
                vDirection = vec3(aVertexPosition, 1.0);\
            }\
        ';

    /**
     * Initializes and manages WebGL components of the player.
     */
    function WebGL(canvas) {
        this.gl = null;
        this.canvas = canvas;
        try {
            this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        } catch (e) {}

        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clearDepth(1.0);
        this.gl.disable(this.gl.DEPTH_TEST);

        this.initTexture()
        this.initBuffers();
        this.initShaders();
        this.initProgram();
    }

    /**
     * Init the quad buffers - this.positionsBuffer, this.verticesBuffer
     */
    WebGL.prototype.initBuffers = function () {
        var gl = this.gl;
        this.positionsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsBuffer);
        var positions = [
            -1.0, -1.0,
             1.0, -1.0,
             1.0,  1.0,
            -1.0,  1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.verticesBuffer);
        var indices = [
            0,  1,  2, 0,  2,  3,
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(indices), gl.STATIC_DRAW);
    };

    WebGL.prototype.initTexture = function () {
        var gl = this.gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    WebGL.prototype.updateTexture = function () {
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
        gl.UNSIGNED_BYTE, video);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    /**
     * Init the quad buffers - this.positionsBuffer, this.verticesBuffer
     */
    WebGL.prototype.initShaders = function () {
        var gl = this.gl;

        this.fragment = gl.createShader(gl.FRAGMENT_SHADER);
        this.vertex = gl.createShader(gl.VERTEX_SHADER);

        gl.shaderSource(this.vertex, VERTEX_SOURCE);
        gl.shaderSource(this.fragment, FRAGMENT_SOURCE);

        gl.compileShader(this.vertex);
        gl.compileShader(this.fragment);
    };

    WebGL.prototype.initProgram = function () {
        var gl = this.gl;
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertex);
        gl.attachShader(this.program, this.fragment);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(this.program));
        }

        gl.useProgram(this.program);

        this.attributes = {};
        this.attributes.aVertexPosition = gl.getAttribLocation(this.program, "aVertexPosition");
        gl.enableVertexAttribArray(this.attributes.aVertexPosition);

        this.uniforms = {};
        this.uniforms.uSampler = gl.getUniformLocation(this.program, "uSampler");
        gl.enableVertexAttribArray(this.uniforms.uSampler);
    };

    WebGL.prototype.draw = function () {
        var gl = this.gl;

        gl.useProgram(this.program);

        this.updateTexture();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsBuffer);
        gl.vertexAttribPointer(this.attributes['aVertexPosition'], 2, gl.FLOAT, false, 0, 0);

        // Specify the texture to map onto the faces.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uniforms.uSampler, 0);


        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        var rotation = mat4.create();
        var perspectiveMatrix = mat4.create();

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.verticesBuffer);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    };

    /**
     * Simple360Player constructor
     *
     * Pass in the video element as 'el'
     */
    function Simple360Player(el) {
        this.el = el;
        this.canvas = document.createElement('canvas');
        this.container = document.createElement('div')
        this.width = 640;
        this.height = 480;

        this.container.className = "simple-360-player";
        this.container.appendChild(this.canvas);

    }

    Simple360Player.prototype.init = function () {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.el.parentNode.appendChild(this.container);

        this.webGL = new WebGL(this.canvas);
        if (!this.webGL.gl) {
            console.error("Unable to initialize WebGL context.");
        }

        this.draw();
        this.el.play();
    };

    Simple360Player.prototype.draw = function () {
        var _this = this;
        (function drawFrame() {
            _this.webGL.draw();
            _this.reqAnimFrameID = requestAnimationFrame(drawFrame);
        }())
    };

    global.Simple360Player = Simple360Player
})(window)
