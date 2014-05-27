// Copyright (c) 2013-2014 Turbulenz Limited

/*global TurbulenzEngine*/
/*exported BenchmarkResultsScreen*/

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
                            that.textureParams[name].clipSpace = that.clipSpace;
                            that.textureParams[name].alpha = 1;
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
        var i, inBox, box;
        var clickTarget = this.defaultClickTarget;
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

    BenchmarkResultsScreen.prototype.onmouseover = function (x, y)
    {
        this.mouseX = x;
        this.mouseY = y;
    };

    BenchmarkResultsScreen.prototype.onmousewheel = function (delta)
    {
        this.velocity += 30;
        if (delta > 0)
        {
            this.direction = 1;
        }
        else
        {
            this.direction = -1;
        }
    };

    BenchmarkResultsScreen.prototype.formatMeta = function ()
    {
        var that = this;
        if (!this.testScores.length)
        {
            this.testScores = this.playbackController.getScores();
        }

        if (!this.numSettingsLines)
        {
            var benchmarkData = this.playbackController.processData().userData.config;
            var browserData = benchmarkData.browser;
            var osData = browserData.os;
            var prefixWithComma = false;
            var data;
            var options;
            var settingsString, settingsLines;
            var browserString, browserLines;
            var i;

            if (benchmarkData.benchmark && benchmarkData.benchmark.version)
            {
                this.versionString = ' ( ' + (benchmarkData.benchmark.name ? benchmarkData.benchmark.name + ', ': '') + (benchmarkData.benchmark.type ? benchmarkData.benchmark.type + ',': '') + ' v' + benchmarkData.benchmark.version + ' ) ';
            }

            try
            {
                data = benchmarkData.sequences[0].streams[0].meta.metaDataList[0];
                settingsString = "Enabled Settings: ";
                options = [
                    [data.renderTarget, 'Render Target'],
                    [data.shadows, 'Shadows'],
                    [data.postFxBloom, 'Bloom'],
                    [data.postFxFXAA, 'FxAA'],
                    [data.postFxColorization, 'Colorization'],
                    [data.postFxTiltShift, 'Tilt-shift'],
                    [data.postFxBlurScale !== 0, 'Blur']
                ];

                for (i = 0 ; i < options.length; i += 1)
                {
                    if (options[i][0])
                    {
                        if (prefixWithComma)
                        {
                            settingsString += ", ";
                        }
                        settingsString += options[i][1];
                        prefixWithComma = true;
                    }
                }
            }
            catch (_)
            {
                settingsString = "Setting info unavailable";
            }

            settingsLines = this.wrap(settingsString, this.fontParams.config, this.configBoxWidth);
            this.numSettingsLines = settingsLines.length;
            this.settingsText = settingsLines.join('\n');
            this.numBrowserLines = 1;
            this.browserText = 'Fetching browser data...';

            browserString = osData.name;

            if (osData.version && osData.version.value)
            {
                if (osData.version.alias)
                {
                    browserString += ' ' + osData.version.alias;
                }
                else
                {
                    browserString += ' ' + osData.version.value;
                }
            }

            browserString += ', ' + browserData.name;
            if (browserData.version && browserData.version.value)
            {
                browserString += ' ' + browserData.version.value;
            }
            browserString += ', ' + benchmarkData.playback.playWidth + 'x' + benchmarkData.playback.playHeight + '\n';
            browserString += 'Renderer: ' + (benchmarkData.hardware.renderer || 'Unknown');
            browserLines = that.wrap(browserString, that.fontParams.config, that.configBoxWidth);
            that.numBrowserLines = browserLines.length;
            that.browserText = browserLines.join('\n');
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

        gd.clear(this.backgroundColor);

        var centerx = screenWidth * 0.5;
        var centery = screenHeight * 0.5;
        var gridWidth = 212;
        var gridHeight = 108;
        var gutterWidth = 2;

        this.heights.length = 0;
        var heights = this.heights;
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
        heights.push(((1 + this.numBrowserLines + this.numSettingsLines) * (baseFontHeight * fontParams.scale)) + 40);
        heights.push(this.textureParams.buttons.diffuse.height);

        for (i = 0; i < heights.length; i += 1)
        {
            totalHeight += heights[i];
        }

        this.velocity = Math.floor(this.velocity * 0.9);
        this.offset += this.velocity * this.direction;
        this.offset = Math.min(Math.max(screenHeight - totalHeight, this.offset), 0);

        yLocation = Math.max(centery - (totalHeight / 2), 0) + this.offset;

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
                this.infoHitbox.left = left;
                this.infoHitbox.right = right;
                this.infoHitbox.top = top;
                this.infoHitbox.bottom = bottom;
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
                testScore = this.defaultTestScore;
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
        }
        yLocation += heights.shift();

        this.renderRectangle(this.darkBackground, centerx - (gridWidth * 1.5), centerx + (gridWidth * 1.5) - 2,
            yLocation, yLocation + heights[0] - margin);
        fontParams = this.fontParams.config;
        fontParams.x = centerx;
        fontParams.y = yLocation + 10;
        this.simplefonts.drawFont("CONFIGURATION" + this.versionString, fontParams);
        fontParams.y += (baseFontHeight * fontParams.scale) + 5;
        this.simplefonts.drawFont(this.browserText, fontParams);
        fontParams.y += (this.numBrowserLines * baseFontHeight * fontParams.scale) + 5;
        this.simplefonts.drawFont(this.settingsText, fontParams);
        yLocation += heights.shift();

        if (this.textureParams.buttons)
        {
            this.renderImage(this.textureParams.buttons, centerx, yLocation);
            this.twitterHitbox.update(centerx, yLocation);
            this.restartHitbox.update(centerx, yLocation);
            this.playHitbox.update(centerx, yLocation);
        }

        this.simplefonts.render();

        this.hitBoxes.length = 0;
        if (this.renderModal)
        {
            this.renderRectangle(this.modalBackground, 0, screenWidth, 0, screenHeight);

            this.modalBackgroundHitbox.right = screenWidth;
            this.modalBackgroundHitbox.bottom = screenHeight;

            if (this.textureParams.modal)
            {
                this.renderImage(this.textureParams.modal, centerx,
                    centery - (this.textureParams.modal.diffuse.height / 2));

                this.modalHitbox.update(centerx, centery);
                this.closeModalHitbox.update(centerx, centery);
            }

            this.hitBoxes.push(this.modalBackgroundHitbox,
                               this.modalHitbox,
                               this.closeModalHitbox);
        }
        else
        {
            this.hitBoxes.push(this.playHitbox,
                               this.twitterHitbox,
                               this.restartHitbox,
                               this.infoHitbox);
        }

        this.updateCursor();
    };

    BenchmarkResultsScreen.prototype.updateCursor = function ()
    {
        var inBox = false;
        var clickTarget = this.defaultClickTarget;
        var element = TurbulenzEngine.canvas;
        var x = this.mouseX;
        var y = this.mouseY;
        var i, box;

        for (i = 0; i < this.hitBoxes.length; i += 1)
        {
            box = this.hitBoxes[i];
            inBox = (x > box.left) && (x < box.right) && (y > box.top) && (y < box.bottom);
            if (inBox && (box.priority > clickTarget.priority))
            {
                clickTarget = box;
            }
        }

        if (element)
        {
            element.style.cursor = clickTarget.cursor;
        }

        if (this.renderHitboxes)
        {
            for (i = 0 ; i < this.hitBoxes.length; i += 1)
            {
                box = this.hitBoxes[i];
                if (box !== clickTarget)
                {
                    this.renderRectangle(this.darkBackground, box.left, box.right, box.top, box.bottom);
                }
                else
                {
                    this.renderRectangle(this.debugBackground, box.left, box.right, box.top, box.bottom);
                }
            }
        }
    };

    BenchmarkResultsScreen.create = function create(gd, md, id, playbackController, simplefonts)
    {
        var f = new BenchmarkResultsScreen();
        f.gd = gd;
        f.md = md;
        f.id = id;

        id.addEventListener('mouseup', function (button, x, y) { f.onmouseup(button, x, y); });
        id.addEventListener('mouseover', function (x, y) { f.onmouseover(x, y); });
        id.addEventListener('mousewheel', function (delta) { f.onmousewheel(delta); });

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
        f.lightBackground.clipSpace = f.clipSpace;
        f.modalBackground = gd.createTechniqueParameters();
        f.modalBackground.color = md.v4Build(0, 0, 0, 0.6);
        f.modalBackground.clipSpace = f.clipSpace;
        f.darkBackground = gd.createTechniqueParameters();
        f.darkBackground.color = md.v4Build(0, 0, 0, 0.2);
        f.darkBackground.clipSpace = f.clipSpace;
        f.hilightBackground = gd.createTechniqueParameters();
        f.hilightBackground.color = md.v4Build(0.0, 0.8, 0.8, 1.0);
        f.hilightBackground.clipSpace = f.clipSpace;

        f.debugBackground = gd.createTechniqueParameters();
        f.debugBackground.color = md.v4Build(1.0, 0.0, 0.0, 0.5);
        f.debugBackground.clipSpace = f.clipSpace;
        f.renderHitboxes = false;

        f.playbackController = playbackController;
        f.numSettingsLines = 0;
        f.settingsText = '';
        f.numBrowserLines = 2;
        f.browserText = 'Unknown browser\nUnknown renderer';
        f.testScores = [];
        f.versionString = '';

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
        f.mouseX = 0;
        f.mouseY = 0;
        f.offset = 0;
        f.velocity = 0;
        f.direction = 1;
        f.configBoxWidth = 600;
        f.renderModal = false;
        f.heights = [];
        f.defaultTestScore = {name: "Unknown test", score: 0};
        var makeHitbox = function (priority, onClick, width, height, offsetx, offsety)
        {
            return {
                priority: priority,
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                onClick: onClick,
                offsetx: offsetx || 0,
                offsety: offsety || 0,
                halfwidth: (width / 2) || 0,
                height: height || 0,
                cursor: 'pointer',
                update: function (x, y)
                {
                    this.left = x + this.offsetx - this.halfwidth;
                    this.right = this.left + (2 * this.halfwidth);
                    this.top = y + this.offsety;
                    this.bottom = this.top + this.height;
                }
            };
        };

        f.defaultClickTarget = makeHitbox(-100, function () {});
        f.defaultClickTarget.cursor = 'default';

        f.twitterHitbox = makeHitbox(1, function ()
        {
            var width = 550;
            var height = 320;
            var left = window.screenLeft + ((window.outerWidth - width) / 2);
            var top = window.screenTop + ((window.outerHeight - height) / 2);
            var opts = 'status=1' +
                ',width=' + width +
                ',height=' + height +
                ',top=' + top +
                ',left=' + left;

            window.open('http://twitter.com/intent/tweet?' +
                'text=' + encodeURIComponent('My device scored ' + Math.floor(f.testScores[4].score) + ' running the ' +
                'polycraft.gl #webgl benchmark. Try it at http://polycraft.gl powered by @turbulenz') +
                '&suggest=' + encodeURIComponent('turbulenz'), 'intent', opts);
        }, 290, 32);
        f.playHitbox = makeHitbox(1, function () { window.open('http://ga.me/games/polycraft', '_blank'); }, 290, 70, 0,
            142);
        f.restartHitbox = makeHitbox(1, function () {
            if (window.startTest && window.onbeforeunload && !this.isRestarting)
            {
                this.isRestarting = true;
                window.setTimeout(function () {

                    window.onbeforeunload();
                    window.setTimeout(function () {
                        window.startTest();
                    }, 200);

                }, 0);
            }
            else
            {
                window.location.reload();
            }
        }, 290, 70, 0, 60);
        f.infoHitbox = makeHitbox(1, function () { f.renderModal = true; });
        f.modalBackgroundHitbox = makeHitbox(100, function () { f.renderModal = false; });
        f.modalHitbox = makeHitbox(101, function () { }, 628, 360, 0, -180);
        f.modalHitbox.cursor = 'default';
        f.closeModalHitbox = makeHitbox(102, function () { f.renderModal = false; }, 30, 30, 275, -160);
        f.hitBoxes = [];

        //FONT RENDERING
        f.simplefonts = simplefonts;

        f.fontParams = {};
        f.fontParams.scoreHeading = {
            scale: 1,
            spacing: 2,
            valignment: simplefonts.textVerticalAlign.TOP
        };

        f.fontParams.scoreValue = {
            scale: 3,
            valignment: simplefonts.textVerticalAlign.TOP
        };

        f.fontParams.config = {
            scale: 1.5,
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

