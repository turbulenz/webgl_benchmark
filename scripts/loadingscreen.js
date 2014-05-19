// Copyright (c) 2009-2013 Turbulenz Limited
/*exported BenchmarkLoadingScreen*/

var BenchmarkLoadingScreen = (function () {
    function BenchmarkLoadingScreen() { }
    BenchmarkLoadingScreen.version = 1;
    BenchmarkLoadingScreen.prototype.setProgress = function (progress) {
        this.progress = progress;
    };
    BenchmarkLoadingScreen.prototype.setTexture = function (texture) {
        this.textureMaterial.diffuse = texture;
        this.textureWidthHalf = (texture.width * 0.5);
        this.textureHeightHalf = (texture.height * 0.5);
        this.textureWidth = texture.width;
        this.textureHeight = texture.height;
        this.textureRatio = (texture.height / texture.width);
    };
    BenchmarkLoadingScreen.prototype.setImage = function (texture) {
        this.imageMaterial.diffuse = texture;
        this.imageWidthHalf = (texture.width * 0.5);
        this.imageHeightHalf = (texture.height * 0.5);
        this.imageWidth = texture.width;
        this.imageHeight = texture.height;
        this.imageRatio = (texture.height / texture.width);
    };
    BenchmarkLoadingScreen.prototype.setSimpleFonts = function (simplefonts) {
        this.simplefonts = simplefonts;

        var scale = 1.5;
        var horizontalAlign = simplefonts.textHorizontalAlign.CENTER;
        var verticalAlign = simplefonts.textVerticalAlign.MIDDLE;
        var fontStyle = "regular";
        var v3Color = this.md.v3BuildOne();

        this.fontParams =
        {
            x : 0,
            y : 0,

            r : v3Color[0],
            g : v3Color[1],
            b : v3Color[2],

            scale : scale,
            alignment : horizontalAlign,
            valignment : verticalAlign,
            fontStyle : fontStyle
        };

        this.checkFontLoaded = true;
    };
    BenchmarkLoadingScreen.prototype.loadAndSetTexture = function (graphicsDevice, requestHandler, mappingTable, name) {
        var that = this;
        this.checkTextureLoaded = true;
        if (mappingTable) {
            var urlMapping = mappingTable.urlMapping;
            var assetPrefix = mappingTable.assetPrefix;
            requestHandler.request({
                src: ((urlMapping && urlMapping[name]) || (assetPrefix + name)),
                requestFn: function textureRequestFn(src, onload) {
                    return graphicsDevice.createTexture({
                        src: src,
                        mipmaps: false,
                        onload: onload
                    });
                },
                onload: function (t) {
                    if (t) {
                        that.setTexture(t);
                        that.textureLoaded = true;
                    }
                }
            });
        }
    };
    BenchmarkLoadingScreen.prototype.loadAndSetImage = function (graphicsDevice, requestHandler, mappingTable, name) {
        var that = this;
        this.checkImageLoaded = true;
        if (mappingTable) {
            var urlMapping = mappingTable.urlMapping;
            var assetPrefix = mappingTable.assetPrefix;
            requestHandler.request({
                src: ((urlMapping && urlMapping[name]) || (assetPrefix + name)),
                requestFn: function textureRequestFn(src, onload) {
                    return graphicsDevice.createTexture({
                        src: src,
                        mipmaps: true,
                        onload: onload
                    });
                },
                onload: function (t) {
                    if (t) {
                        that.setImage(t);
                        that.imageLoaded = true;
                    }
                }
            });
        }
    };
    BenchmarkLoadingScreen.prototype.hasLoaded = function () {
        var textureLoaded = this.checkTextureLoaded ? this.textureLoaded: true;
        var imageLoaded = this.checkImageLoaded ? this.imageLoaded: true;
        var simplefonts = this.simplefonts;
        var fontLoaded = this.checkFontLoaded ?
                            ((simplefonts !== undefined) && simplefonts.hasLoaded() && (simplefonts.technique2D !== undefined)):
                            true;

        return (textureLoaded && fontLoaded && imageLoaded);
    };
    BenchmarkLoadingScreen.prototype.render = function (backgroundAlpha, textureAlpha) {
        var gd = this.gd;
        var screenWidth = gd.width;
        var screenHeight = gd.height;
        if ((screenWidth === 0) || (screenHeight === 0)) {
            return;
        }

        var writer;
        var primitive = gd.PRIMITIVE_TRIANGLE_STRIP;
        var backgroundMaterial;
        if (0 < backgroundAlpha) {
            // TODO: Cache this.backgroundColor here, rather than below
            this.backgroundColor[3] = backgroundAlpha;
            if (backgroundAlpha >= 1) {
                gd.clear(this.backgroundColor);
            } else {
                gd.setTechnique(this.backgroundTechnique);
                var backgroundColor = this.backgroundColor;
                backgroundMaterial = this.backgroundMaterial;
                backgroundMaterial.color = backgroundColor;
                gd.setTechniqueParameters(backgroundMaterial);
                writer = gd.beginDraw(primitive, 4, this.posVertexFormats, this.posSemantics);
                if (writer) {
                    writer(-1, -1);
                    writer(1, -1);
                    writer(-1, 1);
                    writer(1, 1);
                    gd.endDraw(writer);
                    writer = null;
                }
            }
        }
        var centerx = 0;
        var centery = 0;
        var left = 0;
        var right = 0;
        var top = 0;
        var bottom = 0;
        var assetTracker = this.assetTracker;
        var progress = (assetTracker && assetTracker.getLoadingProgress()) || this.progress;
        var xScale = 2 / screenWidth;
        var yScale = -2 / screenHeight;
        var textureWidthHalf = this.textureWidthHalf;
        var imageWidthHalf = this.imageWidthHalf;
        var imageHeightHalf = this.imageHeightHalf;
        var screenWidthHalf;
        var screenHeightHalf;
        var screenRatio = (screenHeight / screenWidth);
        var scaledTextureHeightHalf, scaledTextureWidthHalf;
        var clipSpace = this.clipSpace;

        if (0 < textureWidthHalf && 0 < textureAlpha) {
            var textureMaterial = this.textureMaterial;
            gd.setTechnique(this.textureTechnique);
            clipSpace[0] = xScale;
            clipSpace[1] = yScale;
            textureMaterial.clipSpace = clipSpace;
            textureMaterial.alpha = textureAlpha;
            gd.setTechniqueParameters(textureMaterial);
            writer = gd.beginDraw(primitive, 4, this.textureVertexFormats, this.textureSemantics);
            if (writer) {
                screenWidthHalf = centerx = (screenWidth * 0.5);
                screenHeightHalf = centery = (screenHeight * 0.5);

                var textureRatio = this.textureRatio;

                if (textureRatio > screenRatio)
                {
                    scaledTextureHeightHalf = screenWidthHalf * textureRatio;
                    left = 0;
                    right = screenWidth;
                    top = (centery - scaledTextureHeightHalf);
                    bottom = (centery + scaledTextureHeightHalf);
                }
                else
                {
                    scaledTextureWidthHalf = screenHeightHalf / textureRatio;
                    left = (centerx - scaledTextureWidthHalf);
                    right = (centerx + scaledTextureWidthHalf);
                    top = 0;
                    bottom = screenHeight;
                }

                writer(left, top, 0, 0);
                writer(right, top, 1, 0);
                writer(left, bottom, 0, 1);
                writer(right, bottom, 1, 1);
                gd.endDraw(writer);
                writer = null;
            }
        }
        if ((progress !== null) && (0 < imageWidthHalf && 0 < textureAlpha)) {
            var imageMaterial = this.imageMaterial;
            gd.setTechnique(this.textureTechnique);
            clipSpace[0] = xScale;
            clipSpace[1] = yScale;
            imageMaterial.clipSpace = clipSpace;
            imageMaterial.alpha = textureAlpha;
            gd.setTechniqueParameters(imageMaterial);
            writer = gd.beginDraw(primitive, 4, this.textureVertexFormats, this.textureSemantics);
            if (writer) {
                centerx = (screenWidth * 0.5);
                centery = (screenHeight * 0.5);

                left = (centerx - imageWidthHalf);
                right = (centerx + imageWidthHalf);
                top = (centery - imageHeightHalf - this.imageOffset);
                bottom = (centery + imageHeightHalf - this.imageOffset);

                writer(left, top, 0, 0);
                writer(right, top, 1, 0);
                writer(left, bottom, 0, 1);
                writer(right, bottom, 1, 1);
                gd.endDraw(writer);
                writer = null;
            }
        }
        if ((progress !== null) && (backgroundAlpha > 0)) {
            if (progress < 0) {
                progress = 0;
            } else if (progress > 1) {
                progress = 1;
            }
            backgroundMaterial = this.backgroundMaterial;
            var barBackgroundColor = this.barBackgroundColor;
            var barColor = this.barColor;
            barColor[3] = backgroundAlpha;
            centerx = this.barCenter.x * screenWidth;
            centery = this.barCenter.y * screenHeight;
            var barBackgroundWidth = this.barBackgroundWidth;
            var halfBarHeight = 0.5 * this.barBackgroundHeight;
            var barBorderSize = this.barBorderSize;
            gd.setTechnique(this.backgroundTechnique);
            backgroundMaterial.color = barBackgroundColor;
            gd.setTechniqueParameters(backgroundMaterial);
            writer = gd.beginDraw(primitive, 4, this.posVertexFormats, this.posSemantics);
            if (writer) {
                left = centerx - (0.5 * barBackgroundWidth);
                right = left + barBackgroundWidth;
                top = (centery - halfBarHeight);
                bottom = (centery + halfBarHeight);
                writer((left * xScale) - 1, (top * yScale) + 1);
                writer((right * xScale) - 1, (top * yScale) + 1);
                writer((left * xScale) - 1, (bottom * yScale) + 1);
                writer((right * xScale) - 1, (bottom * yScale) + 1);
                gd.endDraw(writer);
            }
            backgroundMaterial.color = barColor;
            gd.setTechniqueParameters(backgroundMaterial);
            writer = gd.beginDraw(primitive, 4, this.posVertexFormats, this.posSemantics);
            if (writer) {
                left = left + barBorderSize;
                right = left + ((barBackgroundWidth - (2 * barBorderSize)) * progress);
                top = top + barBorderSize;
                bottom = bottom - barBorderSize;
                writer((left * xScale) - 1, (top * yScale) + 1);
                writer((right * xScale) - 1, (top * yScale) + 1);
                writer((left * xScale) - 1, (bottom * yScale) + 1);
                writer((right * xScale) - 1, (bottom * yScale) + 1);
                gd.endDraw(writer);
                writer = null;
            }
        }
        var simplefonts = this.simplefonts;
        if (simplefonts)
        {
            var fontLoaded = simplefonts.hasLoaded();
            if (fontLoaded)
            {
                this.fontParams.x = this.barCenter.x * screenWidth;
                this.fontParams.y = this.barCenter.y * screenHeight + this.textOffset;
                simplefonts.drawFont("" + Math.floor(progress * 100) + "%", this.fontParams);
                simplefonts.render();
            }
        }
    };
    BenchmarkLoadingScreen.create = function create(gd, md, parameters) {
        var f = new BenchmarkLoadingScreen();
        f.textOffset = 30;
        f.imageOffset = 80;
        f.gd = gd;
        f.md = md;
        f.backgroundColor = md.v4Build(0.231, 0.231, 0.231, 1.0);
        f.backgroundTechnique = null;
        f.backgroundMaterial = gd.createTechniqueParameters();
        f.posVertexFormats = [
            gd.VERTEXFORMAT_FLOAT2
        ];
        f.posSemantics = gd.createSemantics([
            'POSITION'
        ]);
        f.clipSpace = md.v4Build(1.0, 1.0, -1.0, 1.0);
        f.textureWidthHalf = 0;
        f.textureHeightHalf = 0;
        f.textureTechnique = null;
        f.textureMaterial = gd.createTechniqueParameters();
        f.imageMaterial = gd.createTechniqueParameters();
        f.textureVertexFormats = [
            gd.VERTEXFORMAT_FLOAT2,
            gd.VERTEXFORMAT_FLOAT2
        ];
        f.textureSemantics = gd.createSemantics([
            'POSITION',
            'TEXCOORD0'
        ]);
        f.checkFontLoaded = true;
        f.checkTextureLoaded = false;
        f.checkImageLoaded = false;
        f.barBackgroundColor = md.v4Build(1, 1, 1, 0.2);
        f.barColor = md.v4BuildOne();
        f.barCenter = {
            x: 0.5,
            y: 0.5
        };
        f.barBorderSize = 0;
        f.barBackgroundWidth = 544;
        f.barBackgroundHeight = 2;
        f.assetTracker = null;
        f.progress = null;
        if (parameters) {
            if (parameters.backgroundColor) {
                f.backgroundColor = parameters.backgroundColor;
            }
            if (parameters.barBackgroundColor) {
                f.barBackgroundColor = parameters.barBackgroundColor;
            }
            if (parameters.barColor) {
                f.barColor = parameters.barColor;
            }
            if (parameters.barCenter) {
                var percentage;
                percentage = parameters.barCenter.x;
                f.barCenter.x = (percentage > 1.0) ? 1.0 : ((percentage < 0.0) ? 0.0 : percentage);
                percentage = parameters.barCenter.y;
                f.barCenter.y = (percentage > 1.0) ? 1.0 : ((percentage < 0.0) ? 0.0 : percentage);
            }
            if (parameters.barBorderSize) {
                f.barBorderSize = parameters.barBorderSize;
            }
            if (parameters.barBackgroundWidth) {
                f.barBackgroundWidth = parameters.barBackgroundWidth;
            }
            if (parameters.barBackgroundHeight) {
                f.barBackgroundHeight = parameters.barBackgroundHeight;
            }
            if (parameters.assetTracker) {
                f.assetTracker = parameters.assetTracker;
            }
            if (parameters.progress) {
                f.progress = parameters.progress;
            }
            if (parameters.simplefonts) {
                f.simplefonts = parameters.simplefonts;
            }
            if (parameters.checkFontLoaded) {
                f.checkFontLoaded = true;
            }
        }
        var shaderParams = {
            "version": 1,
            "name": "loadingscreen.cgfx",
            "samplers": {
                "diffuse": {
                    "MinFilter": 9729,
                    "MagFilter": 9729,
                    "WrapS": 33071,
                    "WrapT": 33071
                }
            },
            "parameters": {
                "color": {
                    "type": "float",
                    "columns": 4
                },
                "clipSpace": {
                    "type": "float",
                    "columns": 4
                },
                "alpha": {
                    "type": "float"
                },
                "diffuse": {
                    "type": "sampler2D"
                }
            },
            "techniques": {
                "background": [
                    {
                        "parameters": [
                            "color"
                        ],
                        "semantics": [
                            "POSITION"
                        ],
                        "states": {
                            "DepthTestEnable": false,
                            "DepthMask": false,
                            "CullFaceEnable": false,
                            "BlendEnable": true,
                            "BlendFunc": [
                                770,
                                771
                            ]
                        },
                        "programs": [
                            "vp_background",
                            "fp_background"
                        ]
                    }
                ],
                "texture": [
                    {
                        "parameters": [
                            "clipSpace",
                            "alpha",
                            "diffuse"
                        ],
                        "semantics": [
                            "POSITION",
                            "TEXCOORD0"
                        ],
                        "states": {
                            "DepthTestEnable": false,
                            "DepthMask": false,
                            "CullFaceEnable": false,
                            "BlendEnable": true,
                            "BlendFunc": [
                                770,
                                771
                            ]
                        },
                        "programs": [
                            "vp_texture",
                            "fp_texture"
                        ]
                    }
                ]
            },
            "programs": {
                "fp_texture": {
                    "type": "fragment",
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[1];\nfloat _TMP0;float _TMP1;float _TMP12;uniform float alpha;uniform sampler2D diffuse;void main()\n{vec4 _textureColor;_textureColor=texture2D(diffuse,tz_TexCoord[0].xy);_TMP1=min(1.0,alpha);_TMP12=max(0.0,_TMP1);_TMP0=_TMP12*_TMP12*(3.0-2.0*_TMP12);_textureColor.w=_textureColor.w*_TMP0;gl_FragColor=_textureColor;}"
                },
                "vp_texture": {
                    "type": "vertex",
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvarying vec4 tz_TexCoord[1];attribute vec4 ATTR0;attribute vec4 ATTR8;\nvec4 _OutPosition1;vec2 _OutUV1;uniform vec4 clipSpace;void main()\n{_OutPosition1.xy=ATTR0.xy*clipSpace.xy+clipSpace.zw;_OutPosition1.zw=ATTR0.zw;_OutUV1=ATTR8.xy;tz_TexCoord[0].xy=ATTR8.xy;gl_Position=_OutPosition1;}"
                },
                "fp_background": {
                    "type": "fragment",
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nvec4 _ret_0;float _TMP0;float _TMP1;float _TMP11;uniform vec4 color;void main()\n{_TMP1=min(1.0,color.w);_TMP11=max(0.0,_TMP1);_TMP0=_TMP11*_TMP11*(3.0-2.0*_TMP11);_ret_0=vec4(color.x,color.y,color.z,_TMP0);gl_FragColor=_ret_0;}"
                },
                "vp_background": {
                    "type": "vertex",
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nattribute vec4 ATTR0;\nvoid main()\n{gl_Position=ATTR0;}"
                }
            }
        };
        var shader = gd.createShader(shaderParams);
        if (shader) {
            f.backgroundTechnique = shader.getTechnique("background");
            f.textureTechnique = shader.getTechnique("texture");
            return f;
        }
        return null;
    };
    return BenchmarkLoadingScreen;
})();

