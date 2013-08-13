//
// PostFx - A post effects manager with some basic effects
//

function PostFx() {}

PostFx.prototype =
{
    destroyBuffers: function destroyBuffersFn()
    {
        if (this.renderTarget)
        {
            this.renderTarget.destroy();
            this.renderTarget = null;
        }

        if (this.renderBuffer)
        {
            this.renderBuffer.destroy();
            this.renderBuffer = null;
        }

        if (this.renderTexture)
        {
            this.renderTexture.destroy();
            this.renderTexture = null;
        }

        if (this.postFXTarget)
        {
            this.postFXTarget.destroy();
            this.postFXTarget = null;
        }

        if (this.postFXTexture)
        {
            this.postFXTexture.destroy();
            this.postFXTexture = null;
        }

        if (this.postFX2Target)
        {
            this.postFX2Target.destroy();
            this.postFX2Target = null;
        }

        if (this.postFX2Texture)
        {
            this.postFX2Texture.destroy();
            this.postFX2Texture = null;
        }
    },

    createBuffers: function createBuffersFn()
    {
        var graphicsDevice = this.graphicsDevice;

        var defaultHeight = 1024;
        var defaultWidth = 1024;

        var renderTextureParameters =
        {
            name       : "rendertexture",
            width      : defaultWidth,
            height     : defaultHeight,
            depth      : 1,
            format     : "R8G8B8A8",
            cubemap    : false,
            mipmaps    : false,
            renderable : true
        };

        var renderBufferParams =
        {
            width  : defaultWidth,
            height : defaultHeight,
            format : "D24S8"
        };

        var renderTargetParams =
        {
            colorTexture0 : null,
            depthBuffer : null
        };

        var postFXTextureParameters =
        {
            name       : "postfxtexture",
            width      : defaultWidth / 2,
            height     : defaultHeight / 2,
            depth      : 1,
            format     : "R8G8B8A8",
            cubemap    : false,
            mipmaps    : false,
            renderable : true
        };

        var postFXTargetParams =
        {
            colorTexture0 : null
        };

        var postFX2TextureParameters =
        {
            name       : "postfx2texture",
            width      : defaultWidth / 2,
            height     : defaultHeight / 2,
            depth      : 1,
            format     : "R8G8B8A8",
            cubemap    : false,
            mipmaps    : false,
            renderable : true
        };

        var postFX2TargetParams =
        {
            colorTexture0 : null
        };


        // Create renderTarget textures & buffers
        this.renderTexture = graphicsDevice.createTexture(renderTextureParameters);
        if (!this.renderTexture)
        {
            this.errorCallback("Render Texture not created.");
        }

        this.renderBuffer = graphicsDevice.createRenderBuffer(renderBufferParams);
        if (!this.renderBuffer)
        {
            this.errorCallback("Render Buffer not created.");
        }

        if (this.renderTexture && this.renderBuffer)
        {
            renderTargetParams.colorTexture0 = this.renderTexture;
            renderTargetParams.depthBuffer = this.renderBuffer;

            this.renderTarget = graphicsDevice.createRenderTarget(renderTargetParams);
        }

        // Create postFX textures & buffers
        this.postFXTexture = graphicsDevice.createTexture(postFXTextureParameters);
        if (!this.postFXTexture)
        {
            this.errorCallback("PostFX Texture not created.");
        }

        if (this.postFXTexture)
        {
            postFXTargetParams.colorTexture0 = this.postFXTexture;

            this.postFXTarget = graphicsDevice.createRenderTarget(postFXTargetParams);
        }

        // Create postFX2 textures & buffers
        this.postFX2Texture = graphicsDevice.createTexture(postFX2TextureParameters);
        if (!this.postFX2Texture)
        {
            this.errorCallback("PostFX2 Texture not created.");
        }

        if (this.postFX2Texture)
        {
            postFX2TargetParams.colorTexture0 = this.postFX2Texture;

            this.postFX2Target = graphicsDevice.createRenderTarget(postFX2TargetParams);
        }
    },

    // Process effect finds the requested effect, sets the technique and input texture, then runs on the specified render target
    processEffect: function processEffectFn(params)
    {
        var graphicsDevice = this.graphicsDevice;
        var outputTarget = params.outputTarget;
        var inputTexture0 = params.inputTexture0;

        var effect = this.effects[params.effect];
        if (effect)
        {
            var techniqueParameters = effect.techniqueParameters;

            graphicsDevice.setTechnique(effect.technique);

            techniqueParameters.inputTexture0 = inputTexture0;
            graphicsDevice.setTechniqueParameters(techniqueParameters);

            if (graphicsDevice.beginRenderTarget(outputTarget))
            {
                // Apply the effect to the output render target
                graphicsDevice.setStream(this.quadVertexBuffer, this.quadSemantics);
                graphicsDevice.draw(this.quadPrimitive, 4);

                graphicsDevice.endRenderTarget();
            }
        }
    },

    renderCopy: function renderCopyFn(inputTexture)
    {
        var graphicsDevice = this.graphicsDevice;
        // The copy is applied directly from the default render target to backbuffer
        var copy = this.effects.copy;
        if (copy)
        {
            var copyTechniqueParameters = copy.techniqueParameters;
            copyTechniqueParameters.inputTexture0 = inputTexture;

            // The copy technique & copyTechniqueParameters are set ready for the final pass
            graphicsDevice.setTechnique(copy.technique);
            graphicsDevice.setTechniqueParameters(copyTechniqueParameters);
        }

        // The final step is to apply the final postFX technique to the backbuffer
        graphicsDevice.setStream(this.quadVertexBuffer, this.quadSemantics);
        graphicsDevice.draw(this.quadPrimitive, 4);
    },


    renderInvertEffect: function renderInvertEffectFn(inputTexture)
    {
        var graphicsDevice = this.graphicsDevice;

        // The invert is also applied directly from the default render target to backbuffer
        var invert = this.effects.invert;
        if (invert)
        {
            var invertTechniqueParameters = invert.techniqueParameters;
            invertTechniqueParameters.inputTexture0 = inputTexture;

            // The invert technique & techniqueParameters are set ready for the final pass
            graphicsDevice.setTechnique(invert.technique);
            graphicsDevice.setTechniqueParameters(invertTechniqueParameters);
        }

        // The final step is to apply the final postFX technique to the backbuffer
        graphicsDevice.setStream(this.quadVertexBuffer, this.quadSemantics);
        graphicsDevice.draw(this.quadPrimitive, 4);
    },

    renderBloomEffect: function renderBloomEffectFn(inputTexture)
    {
        var graphicsDevice = this.graphicsDevice;
        // To demonstrate the use of multiple render targets, this bloom effect uses additional render targets

        // Pass 1: Luminance of inputTexture, down-sampled to the smaller postFXTarget
        this.processEffect({
            effect : "luminance",
            outputTarget : this.postFXTarget,
            inputTexture0 : inputTexture
        });

        // Pass 2: blur the texture in the vertical direction to postFX2Target
        this.processEffect({
            effect : "blurvert",
            outputTarget : this.postFX2Target,
            inputTexture0 : this.postFXTexture
        });

        // Pass 3: blur the texture in the horizontal direction back to postFXTarget
        this.processEffect({
            effect : "blurhorz",
            outputTarget : this.postFXTarget,
            inputTexture0 : this.postFX2Texture
        });

        // The composite is applied to the postFX texture and the input texture to the backbuffer
        var composite = this.effects.composite;
        if (composite)
        {
            var compositeTechniqueParameters = composite.techniqueParameters;
            compositeTechniqueParameters.inputTexture0 = inputTexture;
            compositeTechniqueParameters.inputTexture1 = this.postFXTexture;

            // The composite technique & techniqueParameters, ready for the final pass
            graphicsDevice.setTechnique(composite.technique);
            graphicsDevice.setTechniqueParameters(compositeTechniqueParameters);
        }

        // The final step is to apply the final postFX technique to the backbuffer
        graphicsDevice.setStream(this.quadVertexBuffer, this.quadSemantics);
        graphicsDevice.draw(this.quadPrimitive, 4);
    }

};

PostFx.create = function postFxCreateFn(graphicsDevice, mathDevice)
{
    var postFx = new PostFx();

    postFx.graphicsDevice = graphicsDevice;

    var shaderParams = {
        "version": 1,
        "name": "postfx.cgfx",
        "samplers": {
            "inputTexture0": {
                "MinFilter": 9729,
                "MagFilter": 9729,
                "WrapS": 33071,
                "WrapT": 33071
            },
            "inputTexture1": {
                "MinFilter": 9729,
                "MagFilter": 9729,
                "WrapS": 33071,
                "WrapT": 33071
            }
        },
        "parameters": {
            "alpha": {
                "type": "float"
            },
            "luminance": {
                "type": "float"
            },
            "bgColor": {
                "type": "float",
                "columns": 4
            },
            "horzDim": {
                "type": "float"
            },
            "vertDim": {
                "type": "float"
            },
            "Gauss": {
                "type": "float",
                "rows": 9,
                "values": [0.93, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
            },
            "inputTexture0": {
                "type": "sampler2D"
            },
            "inputTexture1": {
                "type": "sampler2D"
            }
        },
        "techniques": {
            "copy": [{
                "parameters": ["inputTexture0"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": false
                },
                "programs": ["vp", "fp_copy"]
            }],
            "invert": [{
                "parameters": ["inputTexture0"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": false
                },
                "programs": ["vp", "fp_invert"]
            }],
            "luminance": [{
                "parameters": ["luminance", "bgColor", "inputTexture0"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": false
                },
                "programs": ["vp", "fp_luminance"]
            }],
            "blurvert": [{
                "parameters": ["vertDim", "Gauss", "inputTexture0"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": false
                },
                "programs": ["vp", "fp_basicblur_vert"]
            }],
            "blurhorz": [{
                "parameters": ["horzDim", "Gauss", "inputTexture0"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": false
                },
                "programs": ["vp", "fp_basicblur_horz"]
            }],
            "composite": [{
                "parameters": ["alpha", "inputTexture0", "inputTexture1"],
                "semantics": ["POSITION", "TEXCOORD0"],
                "states": {
                    "DepthTestEnable": false,
                    "DepthMask": false,
                    "CullFaceEnable": false,
                    "BlendEnable": true
                },
                "programs": ["vp", "fp_composite"]
            }]
        },
        "programs": {
            "fp_composite": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;vec4 _TMP1;vec4 _TMP0;uniform float alpha;uniform sampler2D inputTexture0;uniform sampler2D inputTexture1;void main()\n{vec3 _color1;vec3 _TMP10;_TMP0=texture2D(inputTexture0,tz_TexCoord[0].xy);_TMP1=texture2D(inputTexture1,tz_TexCoord[0].xy);_color1=_TMP1.xyz*alpha;_TMP10=_TMP0.xyz+_color1;_ret_0=vec4(_TMP10.x,_TMP10.y,_TMP10.z,1.0);gl_FragColor=_ret_0;}"
            },
            "vp": {
                "type": "vertex",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];attribute vec4 ATTR8;attribute vec4 ATTR0;\nvoid main()\n{tz_TexCoord[0].xy=ATTR8.xy;gl_Position=ATTR0;}"
            },
            "fp_basicblur_horz": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _TMP1;vec2 _c0013;vec2 _c0015;uniform float horzDim;uniform float Gauss[9];uniform sampler2D inputTexture0;void main()\n{vec2 _step;vec4 _color;vec4 _color2;vec2 _dir;_step=vec2(1.0/horzDim,0.0);_TMP1=texture2D(inputTexture0,tz_TexCoord[0].xy);_color=_TMP1*9.94035751E-02;_c0013=tz_TexCoord[0].xy+_step;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[0]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_step;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[0]*9.94035751E-02);_dir=_step+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[1]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[1]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[2]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[2]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[3]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[3]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[4]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[4]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[5]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[5]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[6]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[6]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[7]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[7]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[8]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[8]*9.94035751E-02);gl_FragColor=_color;}"
            },
            "fp_basicblur_vert": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _TMP1;vec2 _c0013;vec2 _c0015;uniform float vertDim;uniform float Gauss[9];uniform sampler2D inputTexture0;void main()\n{vec2 _step;vec4 _color;vec4 _color2;vec2 _dir;_step=vec2(0.0,1.0/vertDim);_TMP1=texture2D(inputTexture0,tz_TexCoord[0].xy);_color=_TMP1*9.94035751E-02;_c0013=tz_TexCoord[0].xy+_step;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[0]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_step;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[0]*9.94035751E-02);_dir=_step+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[1]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[1]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[2]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[2]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[3]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[3]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[4]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[4]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[5]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[5]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[6]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[6]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[7]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[7]*9.94035751E-02);_dir=_dir+_step;_c0013=tz_TexCoord[0].xy+_dir;_color2=texture2D(inputTexture0,_c0013);_color=_color+_color2*(Gauss[8]*9.94035751E-02);_c0015=tz_TexCoord[0].xy-_dir;_color2=texture2D(inputTexture0,_c0015);_color=_color+_color2*(Gauss[8]*9.94035751E-02);gl_FragColor=_color;}"
            },
            "fp_luminance": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;float _TMP1;float _TMP0;float _a0013;float _val0015;uniform float luminance;uniform vec4 bgColor;uniform sampler2D inputTexture0;void main()\n{vec4 _color;float _lum;_color=texture2D(inputTexture0,tz_TexCoord[0].xy);_lum=_color.x*3.00000012E-01+_color.y*5.89999974E-01+_color.z*1.09999999E-01;_a0013=_lum-luminance;_TMP0=max(_a0013,0.0);_val0015=float((_TMP0>0.0));_TMP1=_val0015-float((_TMP0<0.0));_ret_0=bgColor+_TMP1*(_color-bgColor);gl_FragColor=_ret_0;}"
            },
            "fp_invert": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nuniform sampler2D inputTexture0;void main()\n{vec4 _color;_color=texture2D(inputTexture0,tz_TexCoord[0].xy);_color.xyz=1.0-_color.xyz;gl_FragColor=_color;}"
            },
            "fp_copy": {
                "type": "fragment",
                "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;vec4 _TMP0;uniform sampler2D inputTexture0;void main()\n{_TMP0=texture2D(inputTexture0,tz_TexCoord[0].xy);_ret_0=vec4(_TMP0.x,_TMP0.y,_TMP0.z,1.0);gl_FragColor=_ret_0;}"
            }
        }
    };

    var shader = graphicsDevice.createShader(shaderParams);

    // Render Target
    postFx.renderBuffer = null;
    postFx.renderTarget = null;
    postFx.renderTexture = null;
    // PostFX Target
    postFx.postFXTarget = null;
    postFx.postFXTexture = null;
    // PostFX2 Target
    postFx.postFX2Target = null;
    postFx.postFX2Texture = null;

    /*jshint white: false*/
    // Create a quad
    var quadVertexBufferParams = {
        numVertices: 4,
        attributes: ['FLOAT2', 'FLOAT2'],
        dynamic: false,
        data: [
            -1.0,  1.0, 0.0, 1.0,
             1.0,  1.0, 1.0, 1.0,
            -1.0, -1.0, 0.0, 0.0,
             1.0, -1.0, 1.0, 0.0
        ]
    };
    /*jshint white: true*/
    postFx.quadSemantics = graphicsDevice.createSemantics(['POSITION', 'TEXCOORD0']);
    postFx.quadPrimitive = graphicsDevice.PRIMITIVE_TRIANGLE_STRIP;
    postFx.quadVertexBuffer = graphicsDevice.createVertexBuffer(quadVertexBufferParams);

    var defaultHeight = 1024;
    var defaultWidth = 1024;

    var effects = postFx.effects = {};

    if (shader)
    {
        var technique = shader.getTechnique("luminance");
        if (technique)
        {
            effects.luminance = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        luminance: 0.61,
                        bgColor: mathDevice.v4BuildZero(),
                        inputTexture0: null
                    })
                };
        }

        technique = shader.getTechnique("blurvert");
        if (technique)
        {
            effects.blurvert = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        vertDim: defaultHeight / 2, // Is applied to the render target half the size
                        inputTexture0: null
                    })
                };
        }

        technique = shader.getTechnique("blurhorz");
        if (technique)
        {
            effects.blurhorz = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        horzDim: defaultWidth / 2, // Is applied to the render target half the size
                        inputTexture0: null
                    })
                };
        }

        technique = shader.getTechnique("composite");
        if (technique)
        {
            effects.composite = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        alpha: 0.8,
                        inputTexture0: null,
                        inputTexture1: null
                    })
                };
        }

        technique = shader.getTechnique("copy");
        if (technique)
        {
            effects.copy = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        inputTexture0: null
                    })
                };
        }

        technique = shader.getTechnique("invert");
        if (technique)
        {
            effects.invert = {
                    technique : technique,
                    techniqueParameters : graphicsDevice.createTechniqueParameters({
                        inputTexture0: null
                    })
                };
        }
    }

    return postFx;
};
