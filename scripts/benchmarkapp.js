//
// BenchmarkApp - The benchmarking application
//

/*global TurbulenzEngine: false*/
/*global LoadingScreen: false*/
/*global PlaybackController: false*/
/*global Config: false*/
/*global BenchmarkGraph: false*/
/*global RequestHandler: false*/

function BenchmarkApp() {}

BenchmarkApp.prototype =
{
    init : function benchmarkappInitFn()
    {
        var config = this.config;
        var that = this;

        var streamIDs = config.streamIDs || {};

        // Default benchmark behaviour
        // Single sequence, single stream, single test

        var test = {
            name: config.defaultTestName || "default",
            id: "0"
        };

        var stream = {
            name: config.defaultCapture,
            tests: [test]
        };

        //TODO: Enforce a streamID is present
        var streamID = streamIDs[config.defaultCapture];
        if (streamID)
        {
            stream.id = streamID;
        }

        var sequenceList = [{
            name: config.defaultSequenceName || "Default Sequence",
            streams: [stream]
        }];

        var metaLoaded = function metaLoadedFn(responseText, status)
        {
            if (status === 200)
            {
                that.playbackController.streamMeta[stream.id] = JSON.parse(responseText);
            }
        };

        var prefixCaptureURL = config.captureLookUp[config.defaultCapture];

        this.requestHandler.request({
            src: prefixCaptureURL + 'meta.json',
            onload: metaLoaded
        });

        this.playbackController.init(config.prefixAssetURL, prefixCaptureURL, config.prefixTemplatesURL, sequenceList);

        // Controls
        // var saveElement = document.getElementById("buttonSave");
        // var pauseElement = document.getElementById("buttonPause");
        // var stepElement = document.getElementById("buttonStep");
        // var abortElement = document.getElementById("buttonAbort");
        // var fixedElement = document.getElementById("checkboxFixed");
        // var multisamplingElement = document.getElementById("multisampling");
        // var fullscreenElement = document.getElementById("buttonFullscreen");

        var elements = this.elements;
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
            if (!TurbulenzEngine.isUnloading()) {
                that.playbackController.update();
                if (abortElement && abortElement.disabled)
                {
                    abortElement.disabled = false;
                }
                if (that.playbackController.atEnd)
                {
                    that.displayResults();
                    if (saveElement && saveElement.disabled)
                    {
                        saveElement.disabled = false;
                    }
                    return;
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

            if (playbackController.addingResources || playbackController.loadingResources || playbackController.loadingTemplates)
            {
                playbackController.update();
                var progress = playbackController.getLoadingProgress();
                that.loadingScreen.setProgress(progress);
            }
            else
            {
                TurbulenzEngine.clearInterval(that.intervalID);
                requestAnimationFrame(update);
            }

            if (graphicsDevice.beginFrame())
            {
                graphicsDevice.clear(this.loadingColor);
                that.loadingScreen.render(1, 1);
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

    var config = benchmarkApp.config = Config.create();

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

    var elements = benchmarkApp.elements = {};
    var htmlControls = benchmarkApp.htmlControls = {
        "captureName": "captureName",
        "time": "time",
        "frameTime": "frameTime",
        "averageFrameTime": "averageFrameTime",
        "frameNumber": "frameNumber",
        "resolution": "resolution",
        "averageFps": "averageFps",
        "multisampling": null,
        "fullscreen": "buttonFullscreen",
        "pause": null,
        "step": null,
        "abort": null,
        "save": config.enableSave ? "buttonSave": null,
        "fixed": null
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

    benchmarkApp.playbackController = PlaybackController.create(config, graphicsDevice, requestHandler, benchmarkApp.elements);
    benchmarkApp.playbackController.multisample = multisample;
    benchmarkApp.playbackController.antialias = antialias;

    benchmarkApp.loadingScreen = LoadingScreen.create(graphicsDevice, mathDevice, {progress: 0});

    benchmarkApp.resultsID = "results";

    benchmarkApp.graph = BenchmarkGraph.create({
        elementSelector: "#" + benchmarkApp.resultsID
    });

    benchmarkApp.intervalID = null;

    return benchmarkApp;
};
