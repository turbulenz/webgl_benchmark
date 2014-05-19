// Copyright (c) 2009-2013 Turbulenz Limited

/*global WhichBrowser */
/*exported BenchmarkResultsScreen */

var BenchmarkResultsScreen = (function ()
{
    function BenchmarkResultsScreen() { }

    BenchmarkResultsScreen.version = 1;

    BenchmarkResultsScreen.prototype.loadAndSetTexture =
        function (graphicsDevice, requestHandler, mappingTable, mipMap, name, filename)
        {
            var that = this;
            if (mappingTable)
            {
                var urlMapping = mappingTable.urlMapping;
                var assetPrefix = mappingTable.assetPrefix;
                requestHandler.request({
                    src: ((urlMapping && urlMapping[filename]) || (assetPrefix + filename)),
                    requestFn: function textureRequestFn(src, onload)
                    {
                        return graphicsDevice.createTexture({
                            src: src,
                            mipmaps: mipMap,
                            onload: onload
                        });
                    },
                    onload: function (texture)
                    {
                        if (texture)
                        {
                            that.textureParams[name] = graphicsDevice.createTechniqueParameters();
                            that.textureParams[name].diffuse = texture;
                            that.loadingAssets -= 1;
                        }
                    }
                });
            }
        };

    BenchmarkResultsScreen.prototype.loadAssets = function (graphicsDevice, requestHandler, mappingTable)
    {
        this.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, false, "background",
            "textures/bench-bg.dds");
        this.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, true, "info", "textures/icon_info.dds");
        this.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, true, "heading",
            "textures/yourscore_text_sprite.dds");
        this.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, true, "buttons",
            "textures/result_buttons.dds");
        this.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, true, "modal",
            "textures/modal_abouttest.dds");
    };

    BenchmarkResultsScreen.prototype.hasLoaded = function ()
    {
        return this.simplefonts.hasLoaded() &&
            this.simplefonts.technique2D !== undefined &&
            this.loadingAssets === 0;
    };

    BenchmarkResultsScreen.prototype.renderBackground = function (techniqueParams, screenWidth, screenHeight)
    {
        var gd = this.gd;
        var writer;
        var image = techniqueParams.diffuse;
        var ratio = (image.height * screenWidth) / (image.width * screenHeight);
        var border;
        var uMin, vMin, uMax, vMax;

        gd.setTechnique(this.textureTechnique);
        techniqueParams.clipSpace = this.clipSpace;
        techniqueParams.alpha = 1;
        gd.setTechniqueParameters(techniqueParams);

        writer = gd.beginDraw(gd.PRIMITIVE_TRIANGLE_STRIP, 4, this.textureVertexFormats, this.textureSemantics);
        if (writer)
        {

            if (ratio > 1)
            {
                border = (1 - (1 / ratio)) / 2;
                uMin = 0;
                uMax = 1;
                vMin = border;
                vMax = 1 - border;
            }
            else
            {
                border = (1 - ratio) / 2;
                uMin = border;
                uMax = 1 - border;
                vMin = 0;
                vMax = 1;
            }

            writer(0, 0, uMin, vMin);
            writer(screenWidth, 0, uMax, vMin);
            writer(0, screenHeight, uMin, vMax);
            writer(screenWidth, screenHeight, uMax, vMax);
            gd.endDraw(writer);
        }
    };

    BenchmarkResultsScreen.prototype.renderImage = function (techniqueParams, x, y)
    {
        var gd = this.gd;
        var floor = Math.floor;
        var writer;
        var image = techniqueParams.diffuse;
        var halfWidth = image.width / 2;
        var left = floor(x - halfWidth);
        var right = floor(x + halfWidth);
        var top = floor(y);
        var bottom = floor(y + image.height);

        gd.setTechnique(this.textureTechnique);
        techniqueParams.clipSpace = this.clipSpace;
        techniqueParams.alpha = 1;
        gd.setTechniqueParameters(techniqueParams);
        writer = gd.beginDraw(gd.PRIMITIVE_TRIANGLE_STRIP, 4, this.textureVertexFormats, this.textureSemantics);

        if (writer)
        {
            writer(left, top, 0, 0);
            writer(right, top, 1, 0);
            writer(left, bottom, 0, 1);
            writer(right, bottom, 1, 1);
            gd.endDraw(writer);
        }
    };

    BenchmarkResultsScreen.prototype.renderRectangle = function (techniqueParams, left, right, top, bottom)
    {
        var gd = this.gd;
        var floor = Math.floor;
        var writer;
        var l = floor(left);
        var r = floor(right);
        var t = floor(top);
        var b = floor(bottom);

        gd.setTechnique(this.backgroundTechnique);
        techniqueParams.clipSpace = this.clipSpace;
        gd.setTechniqueParameters(techniqueParams);
        writer = gd.beginDraw(gd.PRIMITIVE_TRIANGLE_STRIP, 4, this.posVertexFormats, this.posSemantics);
        if (writer)
        {
            writer(l, t);
            writer(r, t);
            writer(l, b);
            writer(r, b);
            gd.endDraw(writer);
        }
    };

    BenchmarkResultsScreen.prototype.onmouseup = function (button, x, y)
    {
        var i = 0, inBox, box;
        var clickTarget = { priority: -100, onClick: function () {} };
        if (button === this.id.mouseCodes.BUTTON_0)
        {
            for (i = 0; i < this.hitBoxes.length; i += 1)
            {
                box = this.hitBoxes[i];
                inBox = (x > box.left) && (x < box.right) && (y > box.top) && (y < box.bottom);
                if (inBox && (box.priority > clickTarget.priority))
                {
                    clickTarget = box;
                }
            }

            clickTarget.onClick();
        }
    };

    BenchmarkResultsScreen.prototype.formatMeta = function ()
    {
        var that = this;

        if (!this.testScores.length)
        {
            var testScores = this.playbackController.getScores();

            for (var t in testScores)
            {
                if (testScores.hasOwnProperty(t))
                {
                    this.testScores.push(testScores[t]);
                }
            }
        }

        if (!this.settingsString)
        {
            var benchmarkData = this.playbackController.processData().userData.config;
            var configString = "";
            var flagMap = {
                'true': 'On',
                'false': 'Off'
            };
            var data;

            try
            {
                data = benchmarkData.sequences[0].streams[0].meta.metaDataList[0];
                configString += "Render Target " + flagMap[data.renderTarget];
                configString += ", Shadows " + flagMap[data.shadows];
                configString += ", Bloom " + flagMap[data.postFxBloom];
                configString += ", FxAA " + flagMap[data.postFxFXAA];
                configString += ", Colorization " + flagMap[data.postFxColorization];
                configString += ", TiltShift " + flagMap[data.postFxTiltShift];
                configString += ", Blur " + flagMap[data.postFxBlurScale !== 0];
            }
            catch (_)
            {
                configString = "";
            }

            this.settingsString = configString;
            this.browserConfig = "Fetching browser data...";

            var rendererInfo = ', ' + benchmarkData.playback.playWidth + 'x' + benchmarkData.playback.playHeight +
                '\n' + 'Renderer: ' + benchmarkData.hardware.renderer;

            if (WhichBrowser)
            {
                var wb = new WhichBrowser();
                wb.onReady(function (info)
                {
                    var content = info.os.name;

                    if (info.os.version)
                    {
                        if (info.os.version.alias)
                        {
                            content += ' ' + info.os.version.alias;
                        }
                        else
                        {
                            content += ' ' + info.os.version.value;
                        }
                    }

                    content += ', ' + info.browser.name;
                    if (info.browser.version)
                    {
                        content += ' ' + info.browser.version.value;
                    }
                    that.browserConfig = content + rendererInfo;
                });
            }
            else
            {
                that.browserConfig = "Unknown browser" + rendererInfo;
            }
        }
    };

    BenchmarkResultsScreen.prototype.wrap = function (buffer, fontParams, maxLineLength, breakExpression)
    {
        var out = [];
        var testExpression = breakExpression || /[,\.!?\-\s]/;
        var whitespaceExpression = /\s/;
        var breakAt = 0;
        var keepBreakCharacter = true;
        var index = 0;
        var width = 0;
        var thisChar, charCode, glyph;

        var fontResults = {};
        this.simplefonts.calculateFontAndScaleFromInputParams(fontParams, fontResults);

        var font = fontResults.font;
        var glyphs = font.glyphs;
        var unknownGlyph = glyphs[font.unknownGlyphIndex];
        var spacing = fontParams.spacing || 0;
        var scale = fontResults.scale;

        var split = function ()
        {
            out.push(buffer.slice(0, keepBreakCharacter ? breakAt + 1 : breakAt));
            buffer = buffer.slice(breakAt + 1);
            breakAt = 0;
            keepBreakCharacter = true;
            index = 0;
            width = 0;
        };

        while (buffer.length > 0)
        {
            charCode = buffer.charCodeAt(index);
            glyph = glyphs[charCode] || unknownGlyph;
            if (glyph)
            {
                if (glyph.awidth)
                {
                    width += ((glyph.awidth * scale) + spacing);
                }
                else
                {
                    width += spacing;
                }
            }

            if (width > maxLineLength)
            {
                // no break characters - force a linebreak
                if (breakAt === 0)
                {
                    breakAt = Math.max(index - 1, 0);
                    keepBreakCharacter = true;
                }
                split();
            }
            else if (index === buffer.length)
            {
                breakAt = index;
                keepBreakCharacter = true;
                split();
            }
            else
            {
                thisChar = buffer[index];
                if (testExpression.test(thisChar))
                {
                    breakAt = index;
                    keepBreakCharacter = !whitespaceExpression.test(thisChar);
                    if (thisChar === '\n')
                    {
                        split();
                    }
                }
                index += 1;
            }
        }

        return out;
    };

    BenchmarkResultsScreen.prototype.render = function ()
    {
        var gd = this.gd;
        var screenWidth = gd.width;
        var screenHeight = gd.height;
        var fontParams, i, testScore, left, right, top, bottom;

        if ((screenWidth === 0) || (screenHeight === 0) || !this.hasLoaded())
        {
            return;
        }

        this.formatMeta();
        var browserDataLines = this.wrap(this.browserConfig, this.fontParams.config, 600);
        var runDataLines = this.wrap(this.settingsString, this.fontParams.config, 600);

        gd.clear(this.backgroundColor);

        var centerx = screenWidth * 0.5;
        var centery = screenHeight * 0.5;
        var gridWidth = 212;
        var gridHeight = 108;
        var gutterWidth = 2;

        var heights = [];
        var totalHeight = 0;
        var yLocation;
        var baseFontHeight = 16;
        var margin = 10;

        this.clipSpace[0] = 2 / screenWidth;
        this.clipSpace[1] = -2 / screenHeight;

        if (this.textureParams.background)
        {
            this.renderBackground(this.textureParams.background, screenWidth, screenHeight);
        }

        heights.push(this.textureParams.heading.diffuse.height + margin);
        heights.push((gridHeight * 2) + margin);
        fontParams = this.fontParams.config;
        heights.push(((1 + browserDataLines.length + runDataLines.length) * (baseFontHeight * fontParams.scale)) + 40);
        heights.push(this.textureParams.buttons.diffuse.height);

        for (i = 0; i < heights.length; i += 1)
        {
            totalHeight += heights[i];
        }

        yLocation = Math.max(centery - (totalHeight / 2), 0);

        if (this.textureParams.heading)
        {
            this.renderImage(this.textureParams.heading, centerx, yLocation);
        }
        yLocation += heights.shift();

        for (i = 0; i < 5; i += 1)
        {
            if (i === 4)
            {
                left = (0.5 * gridWidth) + centerx;
                right = left + gridWidth - gutterWidth;
                top = yLocation;
                bottom = top + (2 * gridHeight) - gutterWidth;
                this.renderRectangle(this.hilightBackground, left, right, top, bottom);
                top += gridHeight / 2;
            }
            else
            {
                left = ((i % 2) * gridWidth) - (gridWidth * 1.5) + centerx;
                right = left + gridWidth - gutterWidth;
                top = (Math.floor(i / 2) * gridHeight) + yLocation;
                bottom = top + gridHeight - gutterWidth;
                this.renderRectangle(this.lightBackground, left, right, top, bottom);
            }

            if (i < this.testScores.length)
            {
                testScore = this.testScores[i];
            }
            else
            {
                testScore = {name: "Unknown test", score: 0};
            }

            fontParams = this.fontParams.scoreHeading;
            fontParams.x = (left + right) / 2;
            fontParams.y = top + 20;
            this.simplefonts.drawFont(testScore.name.toUpperCase(), fontParams);

            fontParams = this.fontParams.scoreValue;
            fontParams.x = (left + right) / 2;
            fontParams.y = top + 20 + (16 * this.fontParams.scoreHeading.scale);
            this.simplefonts.drawFont(Math.floor(testScore.score) + "", fontParams);
        }

        if (this.textureParams.info)
        {
            this.renderImage(this.textureParams.info, centerx + 260, yLocation + (gridHeight / 2) + 20);

            this.infoHitbox.left = centerx + 250;
            this.infoHitbox.right = centerx + 270;
            this.infoHitbox.top = yLocation + (gridHeight / 2) + 20;
            this.infoHitbox.bottom = yLocation + (gridHeight / 2) + 40;
        }
        yLocation += heights.shift();

        this.renderRectangle(this.darkBackground, centerx - (gridWidth * 1.5), centerx + (gridWidth * 1.5) - 2,
            yLocation, yLocation + heights[0] - margin);
        fontParams = this.fontParams.config;
        fontParams.x = centerx;
        fontParams.y = yLocation + 10;
        this.simplefonts.drawFont("CONFIGURATION", fontParams);
        fontParams.y += (baseFontHeight * fontParams.scale) + 5;
        this.simplefonts.drawFont(browserDataLines.join('\n'), fontParams);
        fontParams.y += (browserDataLines.length * baseFontHeight * fontParams.scale) + 5;
        this.simplefonts.drawFont(runDataLines.join('\n'), fontParams);
        yLocation += heights.shift();

        if (this.textureParams.buttons)
        {
            this.renderImage(this.textureParams.buttons, centerx, yLocation);
            this.twitterHitbox.left = centerx + 112;
            this.twitterHitbox.right = centerx + 144;
            this.twitterHitbox.top = yLocation;
            this.twitterHitbox.bottom = yLocation + 32;

            this.restartHitbox.left = centerx - 145;
            this.restartHitbox.right = centerx + 145;
            this.restartHitbox.top = yLocation + 60;
            this.restartHitbox.bottom = yLocation + 128;

            this.playHitbox.left = centerx - 145;
            this.playHitbox.right = centerx + 145;
            this.playHitbox.top = yLocation + 144;
            this.playHitbox.bottom = yLocation + 210;
        }

        this.simplefonts.render();

        if (this.renderModal)
        {
            this.renderRectangle(this.modalBackground, 0, screenWidth, 0, screenHeight);

            this.modalBackgroundHitbox.right = screenWidth;
            this.modalBackgroundHitbox.bottom = screenHeight;

            if (this.textureParams.modal)
            {
                this.renderImage(this.textureParams.modal, centerx,
                    centery - (this.textureParams.modal.diffuse.height / 2));

                this.modalHitbox.left = centerx - this.modalHitbox.halfWidth;
                this.modalHitbox.right = centerx + this.modalHitbox.halfWidth;
                this.modalHitbox.top = centery - this.modalHitbox.halfHeight;
                this.modalHitbox.bottom = centery + this.modalHitbox.halfHeight;

                this.closeModalHitbox.left = centerx + 260;
                this.closeModalHitbox.right = centerx + 290;
                this.closeModalHitbox.top = centery - 160;
                this.closeModalHitbox.bottom = centery - 130;
            }

            this.hitBoxes = [ this.modalBackgroundHitbox,
                              this.modalHitbox,
                              this.closeModalHitbox];
        }
        else
        {
            this.hitBoxes = [this.playHitbox,
                             this.twitterHitbox,
                             this.restartHitbox,
                             this.infoHitbox];
        }
    };

    BenchmarkResultsScreen.create = function create(gd, md, id, playbackController, simplefonts)
    {
        var f = new BenchmarkResultsScreen();
        f.gd = gd;
        f.md = md;
        f.id = id;

        id.addEventListener('mouseup', function (button, x, y) { f.onmouseup(button, x, y); });

        f.clipSpace = md.v4Build(1.0, 1.0, -1.0, 1.0);

        f.backgroundColor = md.v4Build(0.231, 0.231, 0.231, 1.0);
        f.backgroundTechnique = null;
        f.posVertexFormats = [
            gd.VERTEXFORMAT_FLOAT2
        ];
        f.posSemantics = gd.createSemantics([
            'POSITION'
        ]);

        f.lightBackground = gd.createTechniqueParameters();
        f.lightBackground.color = md.v4Build(1, 1, 1, 0.2);
        f.modalBackground = gd.createTechniqueParameters();
        f.modalBackground.color = md.v4Build(0, 0, 0, 0.6);
        f.darkBackground = gd.createTechniqueParameters();
        f.darkBackground.color = md.v4Build(0, 0, 0, 0.2);
        f.hilightBackground = gd.createTechniqueParameters();
        f.hilightBackground.color = md.v4Build(0.0, 0.8, 0.8, 1.0);

        f.playbackController = playbackController;
        f.settingsString = "";
        f.browserConfig = "Unknown browser\nUnknown renderer";
        f.testScores = [];

        f.textureTechnique = null;
        f.textureVertexFormats = [
            gd.VERTEXFORMAT_FLOAT2,
            gd.VERTEXFORMAT_FLOAT2
        ];
        f.textureSemantics = gd.createSemantics([
            'POSITION',
            'TEXCOORD0'
        ]);

        f.textureParams = {
            background: null,
            heading: null,
            info: null,
            modal: null,
            buttons: null
        };
        f.loadingAssets = 5;

        // UI FUNCTIONALITY
        f.renderModal = false;
        var makeHitbox = function (priority, onClick, halfWidth, halfHeight)
        {
            return {
                priority: priority,
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                halfWidth: halfWidth || 0,
                halfHeight: halfHeight || 0,
                onClick: onClick
            };
        };

        f.playHitbox = makeHitbox(1, function () { window.open('http://ga.me/games/polycraft', '_blank'); });
        f.twitterHitbox = makeHitbox(1, function ()
        {
            var width = 550;
            var height = 270;
            var left = window.screenLeft + ((window.outerWidth - width) / 2);
            var top = window.screenTop + ((window.outerHeight - height) / 2);
            var opts = 'status=1' +
                ',width=' + width +
                ',height=' + height +
                ',top=' + top +
                ',left=' + left;

            window.open('http://twitter.com/intent/tweet?' +
                'text=' + encodeURIComponent('I got ' + Math.floor(f.testScores[4].score) + ' on polycraft.gl') +
                '&url=' + encodeURIComponent('http://polycraft.gl') +
                '&hashtags=' + encodeURIComponent('html5,webgl,turbulenz'), 'intent', opts);
        });
        f.restartHitbox = makeHitbox(1, function () { window.location.reload(); });
        f.infoHitbox = makeHitbox(1, function () { f.renderModal = true; });
        f.modalBackgroundHitbox = makeHitbox(100, function () { f.renderModal = false; });
        f.modalHitbox = makeHitbox(101, function () { }, 314, 180);
        f.closeModalHitbox = makeHitbox(102, function () { f.renderModal = false; });
        f.hitBoxes = [];

        //FONT RENDERING
        f.simplefonts = simplefonts;

        f.fontParams = {};
        f.fontParams.scoreHeading = {
            scale: 1,
            spacing: 2,
            fontStyle: "regular",
            valignment: simplefonts.textVerticalAlign.TOP
        };

        f.fontParams.scoreValue = {
            scale: 3,
            fontStyle: "light",
            valignment: simplefonts.textVerticalAlign.TOP
        };

        f.fontParams.config = {
            scale: 1.5,
            fontStyle: "light",
            valignment: simplefonts.textVerticalAlign.TOP
        };

        // SHADERS
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
                            "clipSpace",
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
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nuniform vec4 color;void main()\n{gl_FragColor=color;}"
                },
                "vp_background": {
                    "type": "vertex",
                    "code": "#ifdef GL_ES\n#define TZ_LOWP lowp\nprecision mediump float;\nprecision mediump int;\n#else\n#define TZ_LOWP\n#endif\nattribute vec4 ATTR0;\nvec4 _OutPosition1;uniform vec4 clipSpace;void main()\n{_OutPosition1.xy=ATTR0.xy*clipSpace.xy+clipSpace.zw;_OutPosition1.zw=ATTR0.zw;gl_Position=_OutPosition1;}"
                }
            }
        };
        var shader = gd.createShader(shaderParams);
        if (shader)
        {
            f.backgroundTechnique = shader.getTechnique("background");
            f.textureTechnique = shader.getTechnique("texture");
            return f;
        }
        return null;
    };

    return BenchmarkResultsScreen;
})();

