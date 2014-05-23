// Copyright (c) 2013-2014 Turbulenz Limited
//
// BenchmarkApp - The benchmarking application
//

/*global TurbulenzEngine: false*/
/*global BenchmarkLoadingScreen: false*/
/*global BenchmarkResultsScreen: false*/
/*global PlaybackController: false*/
/*global Config: false*/
/*global BenchmarkGraph: false*/
/*global RequestHandler: false*/
/*global FontManager: false*/
/*global ShaderManager: false*/
/*global TextureManager: false*/
/*global SimpleFontRenderer: false*/

function BenchmarkApp() {}

BenchmarkApp.prototype =
{
    errorCodes: {
        OK                          : 0,
        META_REQUEST_FAILED         : 1,
        META_FILE_MISSING           : 2,
        META_PARSE_FAIL             : 3,
        META_VERSION_INCOMPAT       : 4,
        META_VERSION_MISSING        : 5,
        STREAM_TEST_MISSING         : 6,
        STREAM_ID_MISSING           : 7,
        STREAM_PREFIX_MISSING       : 8,
        SEQUENCE_PARSE_FAIL         : 9,
        MAPPING_TABLE_MISSING       : 10,
        RESULT_TEMPLATE_MISSING     : 11,
        RESULT_TEMPLATE_INCOMPAT    : 12,
        RESULT_TEMPLATE_EMPTY       : 13,
        RESULT_TEMPLATE_PARSE_FAIL  : 14
    },

    userErrorMsg: {
        1: "The benchmark was unable to load at this time. Please try again later.",
        2: "The benchmark was unable to load. If this issue persists please report it.",
        3: "The benchmark data is corrupt. Please report this error.",
        4: "The benchmark is not compatible with this version of the data. Please report this error.",
        5: "The benchmark data is not recognized. Please report this error.",
        6: "The benchmark data is corrupt. Please report this error.",
        7: "The benchmark data is corrupt. Please report this error.",
        8: "The benchmark configuration is corrupt. Please report this error.",
        9: "The benchmark configuration is corrupt. Please report this error.",
        10: "The benchmark data is missing. Please report this error.",
        11: "The benchmark configuration is corrupt. Please report this error.",
        12: "The benchmark is not compatible with this version of the configuration. Please report this error.",
        13: "The benchmark configuration is corrupt. Please report this error.",
        14: "The benchmark configuration is corrupt. Please report this error.",
    },

    consoleErrorMsg: {
        1: "META_REQUEST_FAILED: Failed to load stream information",
        2: "META_FILE_MISSING: The meta file request returned a 404",
        3: "META_PARSE_FAIL: The meta file could not be parsed",
        4: "META_VERSION_INCOMPAT: The version of the meta file loaded is incompatible with this benchmark",
        5: "META_VERSION_MISSING: The version of the meta file is missing",
        6: "STREAM_TEST_MISSING: Test cannot be found in the stream: ",
        7: "STREAM_ID_MISSING: The stream ID cannot be found for default capture: ",
        8: "STREAM_PREFIX_CAP_MISSING: The prefixCaptureURL cannot be found for default capture: ",
        9: "SEQUENCE_PARSE_FAIL: The sequence to play cannot be read as expected",
        10: "MAPPING_TABLE_MISSING: The mapping table cannot be found",
        11: "RESULT_TEMPLATE_MISSING: The result template file cannot be found",
        12: "RESULT_TEMPLATE_INCOMPAT: The version in the result template file is not compatible with the benchmark",
        13: "RESULT_TEMPLATE_EMPTY: The result template file is empty",
        14: "RESULT_TEMPLATE_PARSE_FAIL: The result template file failed to parse with the error: "
    },

    init : function benchmarkappInitFn()
    {
        var config = this.config;
        var that = this;

        var streamIDs = config.streamIDs || {};

        // This version of the benchmark app understands streams with the following versions:
        var supportedStreamMetaVersions = [0, 1];

        var loadingErrorTitle = "Loading Error";
        var loadingStatus = 0; //OK
        var loadingErrorArgs = [];
        var errorCodes = this.errorCodes;

        var metaResponse = false;
        var metaLoaded = function metaLoadedFn(responseText, status)
        {
            if (config.graphOnStart)
            {
                return;
            }

            if (status !== 200)
            {
                if (status === 404)
                {
                    loadingStatus = errorCodes.META_FILE_MISSING;
                }
                else
                {
                    loadingStatus = errorCodes.META_REQUEST_FAILED;
                }
                return;
            }

            var streamMeta = null;
            try
            {
                streamMeta = JSON.parse(responseText) || {};
            }
            catch (e)
            {
                loadingStatus = errorCodes.META_PARSE_FAIL;
                return;
            }

            // Default benchmark behaviour
            // Single sequence, single stream, single test

            var test = {
                name: config.defaultTestName || "default",
                id: "0"
            };

            var streamMetaVersion = streamMeta.version;
            if (streamMetaVersion === undefined)
            {
                loadingStatus = errorCodes.META_VERSION_MISSING;
                return;
            }
            var length = supportedStreamMetaVersions.length;
            var streamMetaSupported = false;
            for (var i = 0; i < length; i += 1)
            {
                streamMetaSupported = streamMetaSupported || (streamMetaVersion === supportedStreamMetaVersions[i]);
            }
            if (!streamMetaSupported)
            {
                loadingStatus = errorCodes.META_VERSION_INCOMPAT;
                return;
            }
            var streamTests = streamMeta.tests;
            if (!streamTests || !streamTests[test.name])
            {
                loadingStatus = errorCodes.STREAM_TEST_MISSING;
                loadingErrorArgs.push(test.name);
                return;
            }

            var stream = {
                name: config.defaultCapture,
                meta: streamMeta,
                tests: [test],
                id: streamIDs[config.defaultCapture]
            };
            if (!stream.id)
            {
                loadingStatus = errorCodes.STREAM_ID_MISSING;
                loadingErrorArgs.push(config.defaultCapture);
                return;
            }

            var sequenceList = [{
                name: config.defaultSequenceName || "Default Sequence",
                streams: [stream]
            }];

            loadingStatus = that.playbackController.init(config.prefixAssetURL, prefixCaptureURL, config.prefixTemplatesURL, sequenceList);
            metaResponse = true;
        };

        var prefixCaptureURL = config.captureLookUp[config.defaultCapture];
        if (!prefixCaptureURL)
        {
            loadingStatus = errorCodes.STREAM_PREFIX_MISSING;
            loadingErrorArgs.push(config.defaultCapture);
            that.displayError(loadingErrorTitle, loadingStatus, loadingErrorArgs);
            return;
        }

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
                var playbackController = that.playbackController;
                var errorCodes = that.errorCodes;

                if (loadingStatus !== errorCodes.OK)
                {
                    that.displayError(loadingErrorTitle, loadingStatus, loadingErrorArgs);
                    return;
                }

                if (playbackController && (playbackController.loadingStatus !== errorCodes.OK))
                {
                    that.displayError(loadingErrorTitle, playbackController.loadingStatus, playbackController.loadingErrorArgs);
                    return;
                }
                if (abortElement && abortElement.disabled)
                {
                    abortElement.disabled = false;
                }
                if (playbackController)
                {
                    if (playbackController.atEnd)
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
                        if (graphicsDevice.beginFrame())
                        {
                            graphicsDevice.clear(that.loadingColor);
                            that.resultsScreen.render();
                            graphicsDevice.endFrame();
                        }
                    }
                    else
                    {
                        playbackController.update();
                    }
                }
                requestAnimationFrame(update);
            }
            else
            {
                that.shutdown();
            }
        }

        function loadingUpdate()
        {
            var graphicsDevice = that.graphicsDevice;
            var playbackController = that.playbackController;
            var errorCodes = that.errorCodes;

            if (loadingStatus !== errorCodes.OK)
            {
                that.displayError(loadingErrorTitle, loadingStatus, loadingErrorArgs);
                that.shutdown();
                return;
            }
            if (TurbulenzEngine.isUnloading())
            {
                that.shutdown();
                return;
            }

            if (playbackController && (playbackController.loadingStatus !== errorCodes.OK))
            {
                that.displayError(loadingErrorTitle, playbackController.loadingStatus, playbackController.loadingErrorArgs);
                TurbulenzEngine.clearInterval(that.intervalID);
                return;
            }

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

            if (that.preloaded && (playbackController.addingResources || playbackController.loadingResources || playbackController.loadingTemplates))
            {
                playbackController.update();
                var progress = playbackController.getLoadingProgress();
                that.loadingScreen.setProgress(progress);
            }
            else if (that.preloaded && metaResponse)
            {
                // Clear font and progress rendering
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

    displayError : function benchmarkappDisplayErrorFn(errorTitle, errorCode, errorArgs)
    {
        if (this.graphicsDevice.fullscreen)
        {
            this.graphicsDevice.fullscreen = false;
        }

        var canvas = TurbulenzEngine.canvas;
        if (canvas)
        {
            canvas.style.display = "none";
        }

        var userErrorMsg = this.userErrorMsg;
        var consoleErrorMsg = this.consoleErrorMsg;

        var userErrorDesc = userErrorMsg[errorCode];
        var userErrorCode = "Error Code: " + errorCode;

        var consoleErrorString = errorTitle + ': ' + consoleErrorMsg[errorCode];
        if (errorArgs && errorArgs.length > 0)
        {
            consoleErrorString += errorArgs.toString();
        }


        if (window.showError)
        {
            window.showError({
                title: errorTitle,
                text: userErrorDesc,
                custom: '<p>' + userErrorCode + '</p>',
                linkText: "Go back to the page",
                linkFunction: window.hideError
            });
        }
        else if (window.console)
        {
            window.console.error(consoleErrorString);
        }

        // Developers only
        var resultsElem = document.getElementById(this.resultsID);
        if (resultsElem)
        {
            var div = document.createElement('div');
            div.className = this.resultsID + '-title';
            div.textContent = errorTitle;
            resultsElem.appendChild(div);

            div = document.createElement('div');
            div.className = this.resultsID + '-text';
            div.textContent = userErrorDesc;
            resultsElem.appendChild(div);

            div = document.createElement('div');
            div.className = this.resultsID + '-custom';
            div.textContent = userErrorCode;
            resultsElem.appendChild(div);
        }
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

    var mathDevice = TurbulenzEngine.createMathDevice({});
    var inputDevice = TurbulenzEngine.createInputDevice({});

    var requestHandlerParameters = {};
    var requestHandler = RequestHandler.create(requestHandlerParameters);
    benchmarkApp.requestHandler = requestHandler;

    var shaderManager = ShaderManager.create(graphicsDevice, requestHandler);
    var fontManager = FontManager.create(graphicsDevice, requestHandler);
    var textureManager = TextureManager.create(graphicsDevice, requestHandler);

    var fonts = {
        light: "avenirlight",
        regular: "avenirmedium"
    };

    globals.fontSizes = [8, 16, 32, 64];
    globals.fonts = fonts;
    globals.preload = true;
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
        errorCodes: benchmarkApp.errorCodes,
        graphicsDevice: graphicsDevice,
        mathDevice: mathDevice,
        requestHandler: requestHandler,
        shaderManager: shaderManager,
        fontManager: fontManager,
        elements: benchmarkApp.elements,
        prefixCaptureURL: prefixCaptureURL,
        prefixAssetURL: prefixAssetURL,
        prefixTemplatesURL: prefixTemplatesURL,
        simplefonts: simplefonts,
        mappingTableCallback: function (mappingTable) {
            //TODO: Do mapping table loading in benchmarkapp. Now required globally.
            if (mappingTable)
            {
                fontManager.setPathRemapping(mappingTable.urlMapping, mappingTable.assetPrefix);
                shaderManager.setPathRemapping(mappingTable.urlMapping, mappingTable.assetPrefix);
                simplefonts.preload();
                benchmarkApp.loadingScreen.setSimpleFonts(simplefonts);
                benchmarkApp.loadingScreen.loadAndSetTexture(graphicsDevice, requestHandler, mappingTable, "textures/bench-bg.dds");
                benchmarkApp.loadingScreen.loadAndSetImage(graphicsDevice, requestHandler, mappingTable, "textures/loading_text_sprite.dds");

                benchmarkApp.resultsScreen.loadAssets(graphicsDevice, requestHandler, mappingTable);
            }
        }
    });
    benchmarkApp.playbackController.multisample = multisample;
    benchmarkApp.playbackController.antialias = antialias;

    benchmarkApp.loadingScreen = BenchmarkLoadingScreen.create(graphicsDevice, mathDevice);
    benchmarkApp.resultsScreen = BenchmarkResultsScreen.create(graphicsDevice, mathDevice, inputDevice,
        benchmarkApp.playbackController, simplefonts);

    benchmarkApp.resultsID = "results";

    benchmarkApp.graph = BenchmarkGraph.create({
        elementSelector: "#" + benchmarkApp.resultsID
    });

    benchmarkApp.intervalID = null;

    benchmarkApp.preloaded = false;

    return benchmarkApp;
};
