//
// BenchmarkApp - The benchmarking application
//

/*global TurbulenzEngine: false*/
/*global BenchmarkLoadingScreen: false*/
/*global PlaybackController: false*/
/*global Config: false*/
/*global BenchmarkGraph: false*/
/*global RequestHandler: false*/
/*global Utilities: false*/
/*global debug: false*/
/*global FontManager: false*/
/*global ShaderManager: false*/
/*global TextureManager: false*/
/*global SimpleFontRenderer: false*/

function BenchmarkApp() {}

BenchmarkApp.prototype =
{
    init : function benchmarkappInitFn()
    {
        var config = this.config;
        var that = this;

        var streamIDs = config.streamIDs || {};

        var metaResponse = false;
        var metaLoaded = function metaLoadedFn(responseText, status)
        {
            if (config.graphOnStart)
            {
                return;
            }

            var streamMeta = null;
            if (status === 200)
            {
                try
                {
                    streamMeta = JSON.parse(responseText);
                }
                catch (e)
                {
                    Utilities.error("Could not parse meta information");
                }
            }

            // Default benchmark behaviour
            // Single sequence, single stream, single test

            var test = {
                name: config.defaultTestName || "default",
                id: "0"
            };

            if (streamMeta)
            {
                var streamMetaVersion = streamMeta.version;
                debug.assert(streamMetaVersion === 0, "Stream meta is an unrecognized version");
                var streamTests = streamMeta.tests;
                if (!streamTests[test.name])
                {
                    Utilities.error("Test cannot be found in the stream: " + test.name);
                }
            }

            var stream = {
                name: config.defaultCapture,
                meta: streamMeta,
                tests: [test],
                id: streamIDs[config.defaultCapture] //TODO: Enforce a streamID is present
            };


            var sequenceList = [{
                name: config.defaultSequenceName || "Default Sequence",
                streams: [stream]
            }];

            that.playbackController.init(config.prefixAssetURL, prefixCaptureURL, config.prefixTemplatesURL, sequenceList);
            metaResponse = true;
        };

        var prefixCaptureURL = config.captureLookUp[config.defaultCapture];

        this.requestHandler.request({
            src: prefixCaptureURL + 'meta.json',
            onload: metaLoaded
        });

        // Controls
        // var saveElement = document.getElementById("buttonSave");
        // var pauseElement = document.getElementById("buttonPause");
        // var stepElement = document.getElementById("buttonStep");
        // var abortElement = document.getElementById("buttonAbort");
        // var fixedElement = document.getElementById("checkboxFixed");
        // var multisamplingElement = document.getElementById("multisampling");
        // var fullscreenElement = document.getElementById("buttonFullscreen");

        var elements = this.elements;
        var streamIDElement = elements.streamID;
        if (streamIDElement)
        {
            streamIDElement.textContent = streamIDs[config.defaultCapture];
        }

        var captureNameElement = elements.captureName;
        if (captureNameElement)
        {
            captureNameElement.textContent = config.defaultCapture;
        }

        var multisamplingElement = elements.multisampling;
        if (multisamplingElement)
        {
            multisamplingElement.textContent = this.playbackController.multisample;
        }

        var playbackController = this.playbackController;

        var saveElement = elements.save;
        if (saveElement)
        {
            saveElement.disabled = true;
            saveElement.onclick = function ()
            {
                playbackController.outputData(config.defaultCapture);
            };
        }

        var downloadCSVElement = elements.downloadCSV;
        if (downloadCSVElement)
        {
            downloadCSVElement.disabled = true;
            downloadCSVElement.onclick = function ()
            {
                playbackController.outputData(config.defaultCapture, 'CSV');
            };
        }

        var fullscreenElement = elements.fullscreen;
        if (fullscreenElement)
        {
            fullscreenElement.onclick = function ()
            {
                if (!that.graphicsDevice.fullscreen)
                {
                    that.graphicsDevice.fullscreen = true;
                }
            };
        }

        var pauseElement = elements.pause;
        var stepElement = elements.step;
        if (pauseElement)
        {
            pauseElement.onclick = function ()
            {
                if (playbackController.paused)
                {
                    pauseElement.value = "Pause";
                    playbackController.play();
                }
                else
                {
                    pauseElement.value = "Play";
                    playbackController.pause();
                }
                if (stepElement)
                {
                    stepElement.disabled = !playbackController.paused;
                }
            };
        }

        if (stepElement)
        {
            stepElement.disabled = true;
            stepElement.onclick = function ()
            {
                playbackController.step = true;
            };
        }

        var abortElement = elements.abort;
        if (abortElement)
        {
            abortElement.disabled = true;
            abortElement.onclick = function ()
            {
                playbackController.abort();
            };
        }

        var fixedElement = elements.fixed;
        if (fixedElement)
        {
            fixedElement.checked = playbackController.fixedFrameRate;
            fixedElement.onclick = function ()
            {
                playbackController.fixedFrameRate = fixedElement.checked;
            };
        }

        var requestAnimationFrame = (window.requestAnimationFrame ||
                                     window.webkitRequestAnimationFrame ||
                                     window.oRequestAnimationFrame ||
                                     window.msRequestAnimationFrame ||
                                     window.mozRequestAnimationFrame);
        function update()
        {
            var graphicsDevice = that.graphicsDevice;
            if (!TurbulenzEngine.isUnloading()) {
                that.playbackController.update();
                if (abortElement && abortElement.disabled)
                {
                    abortElement.disabled = false;
                }
                if (that.playbackController.atEnd)
                {
                    if (saveElement && saveElement.disabled)
                    {
                        saveElement.disabled = false;
                    }
                    if (downloadCSVElement && downloadCSVElement.disabled)
                    {
                        downloadCSVElement.disabled = false;
                    }
                    if (config.graphOnEnd)
                    {
                        that.displayResults();
                        return;
                    }
                    if (!that.formattedScores)
                    {
                        that.formattedScores = that._formatScores(that.playbackController.getScores());
                    }
                    if (graphicsDevice.beginFrame())
                    {
                        graphicsDevice.clear(that.loadingColor);
                        that.loadingScreen.render(1, 1);
                        that.renderResults();
                        graphicsDevice.endFrame();
                    }
                }
                requestAnimationFrame(update);
            }
        }

        function loadingUpdate()
        {
            var graphicsDevice = that.graphicsDevice;
            var playbackController = that.playbackController;

            if (config.graphOnStart)
            {
                if (that.playbackController.gameSession)
                {
                    if (!that.playbackController.userDataManager)
                    {
                        return;
                    }
                }

                that.displayResults();
                TurbulenzEngine.clearInterval(that.intervalID);
                return;
            }

            if (!that.preloaded)
            {
                that.preloaded = that.loadingScreen.hasLoaded();
            }

            if (that.preloaded && (playbackController.addingResources || playbackController.loadingResources || playbackController.loadingTemplates || playbackController.loadingAppResources))
            {
                playbackController.update();
                var progress = playbackController.getLoadingProgress();
                that.loadingScreen.setProgress(progress);
            }
            else if (that.preloaded && metaResponse)
            {
                // Clear font and progress rendering
                that.loadingScreen.simplefonts = null;
                that.loadingScreen.progress = null;

                TurbulenzEngine.clearInterval(that.intervalID);
                requestAnimationFrame(update);
            }

            if (graphicsDevice.beginFrame())
            {
                graphicsDevice.clear(this.loadingColor);
                that.loadingScreen.render(1, 1);
                graphicsDevice.endFrame();
            }
        }

        this.intervalID = TurbulenzEngine.setInterval(loadingUpdate, 1000 / 60);
    },

    _formatScores : function benchmarkAppFormatScoresFn(testScores)
    {
        var scorePanelWrapX = 3;
        var scorePanelWidth = 1000;
        var scorePerPanelHeight = 100;
        var simplefonts = this.simplefonts;
        var horizontalAlign = simplefonts.textHorizontalAlign.CENTER;
        var verticalAlign = simplefonts.textVerticalAlign.MIDDLE;
        var formattedScores = [];
        var testScore, scoreText, testScoreInt;
        var index = 0;
        for (var t in testScores)
        {
            if (testScores.hasOwnProperty(t))
            {
                testScore = testScores[t];
                testScoreInt = Math.floor(testScore.score);

                scoreText = testScoreInt + "";
                if (testScore.completeRatio === 0.0)
                {
                    scoreText = "Not started";
                }

                formattedScores.push({
                    text: testScore.name,
                    fontParams: {
                        x: ((scorePanelWidth / scorePanelWrapX) * (index % scorePanelWrapX)) + (scorePanelWidth * 0.5 / scorePanelWrapX) - (scorePanelWidth * 0.5),
                        y: (scorePerPanelHeight * Math.floor(index / scorePanelWrapX)) + (scorePerPanelHeight * 0.5) - (scorePerPanelHeight / 3),

                        r: 1.0,
                        g: 1.0,
                        b: 1.0,

                        alignment : horizontalAlign,
                        valignment : verticalAlign,

                        scale: 2.0,
                        fontStyle: "regular"
                    }
                });

                formattedScores.push({
                    text: scoreText,
                    fontParams: {
                        x: ((scorePanelWidth / scorePanelWrapX) * (index % scorePanelWrapX)) + (scorePanelWidth * 0.5 / scorePanelWrapX) - (scorePanelWidth * 0.5),
                        y: (scorePerPanelHeight * Math.floor(index / scorePanelWrapX)) + (scorePerPanelHeight * 0.5),

                        r: 1.0,
                        g: 1.0,
                        b: 1.0,

                        alignment : horizontalAlign,
                        valignment : verticalAlign,

                        scale: 3.0,
                        fontStyle: "regular"
                    }
                });
                if (!testScore.complete)
                {
                    formattedScores.push({
                        text: "(Incomplete, Accuracy: " + Math.floor(testScore.completeRatio * 100) + "%)",
                        fontParams: {
                            x: ((scorePanelWidth / scorePanelWrapX) * (index % scorePanelWrapX)) + (scorePanelWidth * 0.5 / scorePanelWrapX) - (scorePanelWidth * 0.5),
                            y: (scorePerPanelHeight * Math.floor(index / scorePanelWrapX)) + (scorePerPanelHeight * 0.5) + (scorePerPanelHeight / 3),

                            r: 1.0,
                            g: 1.0,
                            b: 1.0,

                            alignment : horizontalAlign,
                            valignment : verticalAlign,

                            scale: 1.0,
                            fontStyle: "regular"
                        }
                    });
                }

                index += 1;
            }
        }
        return formattedScores;
    },

    renderResults : function benchmarkAppRenderResultsFn()
    {
        var formattedScores = this.formattedScores;
        var formattedScore;
        var simplefonts = this.simplefonts;
        var length = formattedScores.length;

        var graphicsDevice = this.graphicsDevice;

        var centerX = graphicsDevice.width / 2;
        var centerY = graphicsDevice.height / 2;

        var scorePanelTop = centerY - 200;
        for (var i = 0; i < length; i += 1)
        {
            formattedScore = formattedScores[i];
            formattedScore.fontParams.x += centerX;
            formattedScore.fontParams.y += scorePanelTop;
            simplefonts.drawFont(formattedScore.text, formattedScore.fontParams);
            formattedScore.fontParams.x -= centerX;
            formattedScore.fontParams.y -= scorePanelTop;
        }
        simplefonts.render();
    },

    displayResults : function benchmarkAppDisplayResultsFn()
    {
        if (this.graphicsDevice.fullscreen)
        {
            this.graphicsDevice.fullscreen = false;
        }

        var that = this;
        var engineElem = document.getElementById("engine");
        if (!engineElem)
        {
            //TODO: Return results via console output
            return;
        }
        var canvas = TurbulenzEngine.canvas;
        if (canvas)
        {
            canvas.style.display = "none";
        }

        var resultsElem = document.getElementById(this.resultsID);
        var resultsData = this.playbackController.processData();
        var userData = resultsData.userData;
        if (!userData)
        {
            if (resultsElem)
            {
                resultsElem.innerHTML = "<h1>No data to graph</h1>";
            }
        }

        if (userData)
        {
            if (!this.graph.init(userData))
            {
                if (resultsElem)
                {
                    resultsElem.innerHTML = "<h1>Could not initialize graph</h1>";
                }
            }
        }
        else if (this.playbackController.userDataManager)
        {
            if (resultsElem)
            {
                resultsElem.innerHTML = "<h1>Loading...</h1>";
            }
        }

        this.playbackController.loadResults(function loadResultsCallbackFn(resultData) {
            if (!that.graph.initialized)
            {
                resultsElem.innerHTML = "";
                that.graph.init(resultData);
            }
            else
            {
                that.graph.addResult(resultData);
            }
        });
    },

    shutdown : function benchmarkappShutdownFn()
    {
        if (this.intervalID)
        {
            TurbulenzEngine.clearInterval(this.intervalID);
            this.intervalID = null;
        }
        if (this.playbackController)
        {
            this.playbackController.destroy();
            this.playbackController = null;
        }
    }
};

BenchmarkApp.create = function benchmarkAppCreateFn()
{
    var benchmarkApp = new BenchmarkApp();

    var globals = {};

    var config = benchmarkApp.config = Config.create();

    var prefixCaptureURL = config.captureLookUp[config.defaultCapture];
    var prefixAssetURL = config.prefixAssetURL;
    var prefixTemplatesURL = config.prefixTemplatesURL;

    var graphicsDeviceOptions = {};

    if (config.antialias)
    {
        // Specify number of samples (only used in the plugin)
        graphicsDeviceOptions.multisample = (config.multisample && config.multisample > 1) ? config.multisample: 4;
    }

    var graphicsDevice = benchmarkApp.graphicsDevice = TurbulenzEngine.createGraphicsDevice(graphicsDeviceOptions);

    // Multisampling is unknown
    var multisample = -1;
    var antialias = false;
    var gl = graphicsDevice.gl;
    if (gl)
    {
        antialias = gl.getContextAttributes().antialias;
        if (!antialias && config.antialias)
        {
            window.alert("Anti-aliasing was requested, but is not possible");
        }

        multisample = gl.getParameter(gl.SAMPLES);
    }

    var mathDevice = benchmarkApp.mathDevice = TurbulenzEngine.createMathDevice({});

    var requestHandlerParameters = {};
    var requestHandler = benchmarkApp.requestHandler = RequestHandler.create(requestHandlerParameters);

    var shaderManager = ShaderManager.create(graphicsDevice, requestHandler);
    var fontManager = FontManager.create(graphicsDevice, requestHandler);
    var textureManager = TextureManager.create(graphicsDevice, requestHandler);

    var fonts = {
        regular: "avenirmedium",
    };

    globals.fontSizes = [8, 16, 32, 64];
    globals.fonts = fonts;
    globals.mathDevice = mathDevice;
    globals.graphicsDevice = graphicsDevice;
    globals.requestHandler = requestHandler;
    globals.textureManager = textureManager;
    globals.shaderManager = shaderManager;
    globals.fontManager = fontManager;

    var simplefonts = benchmarkApp.simplefonts = SimpleFontRenderer.create(globals);

    var elements = benchmarkApp.elements = {};
    var htmlControls = benchmarkApp.htmlControls = {
        "streamID": "streamID",
        "captureName": "captureName",
        "time": "time",
        "frameTime": "frameTime",
        "averageFrameTime": "averageFrameTime",
        "frameNumber": "frameNumber",
        "resolution": "resolution",
        "averageFps": "averageFps",
        "multisampling": "multisampling",
        "fullscreen": "buttonFullscreen",
        "pause": "buttonPause",
        "step": "buttonStep",
        "abort": "buttonAbort",
        "save": config.enableSave ? "buttonSave": null,
        "downloadCSV": config.enableDownloadCSV ? "buttonDownloadCSV": null,
        "fixed": null//"checkboxFixed"
    };

    var controlElem;
    for (var c in htmlControls)
    {
        if (htmlControls.hasOwnProperty(c))
        {
            if (htmlControls[c])
            {
                controlElem = document.getElementById(htmlControls[c]);
                if (controlElem)
                {
                    controlElem.parentNode.style.display = "block";
                    elements[c] = controlElem;
                    continue;
                }
            }
            elements[c] = null;
        }
    }

    benchmarkApp.playbackController = PlaybackController.create(config, {
        graphicsDevice: graphicsDevice,
        mathDevice: mathDevice,
        requestHandler: requestHandler,
        shaderManager: shaderManager,
        fontManager: fontManager,
        elements: benchmarkApp.elements,
        prefixCaptureURL: prefixCaptureURL,
        prefixAssetURL: prefixAssetURL,
        prefixTemplatesURL: prefixTemplatesURL,
        mappingTableCallback: function (mappingTable) {
            //TODO: Do mapping table loading in benchmarkapp. Now required globally.
            if (mappingTable)
            {
                simplefonts.preload();
                benchmarkApp.loadingScreen.setSimpleFonts(simplefonts);
                benchmarkApp.loadingScreen.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, "textures/bench-bg.dds");
                benchmarkApp.loadingScreen.loadAndSetImage(graphicsDevice, requestHandler, mappingTable, "textures/loading_text_sprite.dds");
            }
        }
    });
    benchmarkApp.playbackController.multisample = multisample;
    benchmarkApp.playbackController.antialias = antialias;

    benchmarkApp.loadingScreen = BenchmarkLoadingScreen.create(graphicsDevice, mathDevice, {progress: 0, checkFontLoaded: true});

    benchmarkApp.resultsID = "results";

    benchmarkApp.graph = BenchmarkGraph.create({
        elementSelector: "#" + benchmarkApp.resultsID
    });

    benchmarkApp.intervalID = null;

    benchmarkApp.preloaded = false;

    return benchmarkApp;
};
