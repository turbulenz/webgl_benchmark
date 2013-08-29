//
// BenchmarkApp - The benchmarking application
//

/*global TurbulenzEngine: false*/
/*global LoadingScreen: false*/
/*global PlaybackController: false*/
/*global Config: false*/
/*global d3: false*/

function BenchmarkApp() {}

BenchmarkApp.prototype =
{
    init : function benchmarkappInitFn()
    {
        var config = this.config;
        this.playbackController.init(config.prefixAssetURL, config.captureLookUp[config.defaultCapture], config.prefixTemplatesURL);

        // Controls
        var saveElement = document.getElementById("buttonSave");
        var pauseElement = document.getElementById("buttonPause");
        var stepElement = document.getElementById("buttonStep");
        var abortElement = document.getElementById("buttonAbort");
        var fixedElement = document.getElementById("checkboxFixed");
        var multisamplingElement = document.getElementById("multisampling");

        var captureNameElement = document.getElementById("captureName");
        if (captureNameElement)
        {
            captureNameElement.textContent = config.defaultCapture;
        }

        if (multisamplingElement)
        {
            multisamplingElement.textContent = this.playbackController.multisample;
        }

        var playbackController = this.playbackController;

        if (saveElement)
        {
            saveElement.onclick = function ()
            {
                playbackController.outputData(config.defaultCapture);
            };
        }

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

        if (abortElement)
        {
            abortElement.disabled = true;
            abortElement.onclick = function ()
            {
                playbackController.abort();
            };
        }

        if (fixedElement)
        {
            fixedElement.checked = playbackController.fixedFrameRate;
            fixedElement.onclick = function ()
            {
                playbackController.fixedFrameRate = fixedElement.checked;
            };
        }

        var that = this;
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
                    return;
                }
                requestAnimationFrame(update);
            }
        }

        function loadingUpdate()
        {
            var graphicsDevice = that.graphicsDevice;
            var playbackController = that.playbackController;

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

        var resultsData = this.playbackController.processData();
        var userData = resultsData.userData;
        if (!userData)
        {
            engineElem.innerHTML = "<h1>No data to graph</h1>";
        }

        var margin = {top: 10, right: 10, bottom: 100, left: 40},
            margin2 = {top: 430, right: 10, bottom: 20, left: 40},
            width = 960 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom,
            height2 = 500 - margin2.top - margin2.bottom;

        var xRange = [0, width];
        var yRange = [height, 0];
        var yRange2 = [height2, 0];

        var hardwareName = userData.config.hardware.name;
        var stream0 = userData.data.sequences[0].streams[0];
        var stats = stream0.stats;
        var frames = stream0.frames;
        var frameTime = frames.msPerFrame;
        var frameCount = stats.frameCount;
        var maxFrameMs = stats.maxFrameMs;

        var scales = {
            x: d3.scale.linear().range(xRange),
            y: d3.scale.linear().range(yRange),
            x2: d3.scale.linear().range(xRange),
            y2: d3.scale.linear().range(yRange2)
        };

        var axes = {
            x: d3.svg.axis().scale(scales.x).orient("bottom"),
            x2: d3.svg.axis().scale(scales.x2).orient("bottom"),
            y: d3.svg.axis().scale(scales.y).orient("left")
        };

        var brushed = function brushedFn() {
            scales.x.domain(brush.empty() ? scales.x2.domain() : brush.extent());
            focus.select(".x.axis").call(axes.x);
            updateFocusLines();
        };

        var brush = d3.svg.brush()
            .x(scales.x2)
            .on("brush", brushed);

        var hardwareNames = {};
        var lines = [];
        var color = d3.scale.category20();
        var lineNames = [];

        var graph = d3.select("#results").append("svg:svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        graph.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        var focus = graph.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var context = graph.append("g")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(axes.x);

        focus.append("g")
            .attr("class", "y axis")
            .call(axes.y);

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height2 + ")")
            .call(axes.x2);

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", height2 + 7);

        var updateDomains = function updateDomainsFn(newFrameTime)
        {
            scales.x.domain(d3.extent(newFrameTime.map(function (d, i) { return i; })));
            scales.y.domain([0, d3.max(newFrameTime.map(function (d) { return d; }))]);
            scales.x2.domain(scales.x.domain());
            scales.y2.domain(scales.y.domain());

            context.select(".x.axis").call(axes.x2);
            focus.select(".x.axis").call(axes.x);
            context.select(".y.axis").call(axes.y);
            focus.select(".y.axis").call(axes.y);
        };

        var createLine = function createLineFn(lineName, data)
        {
            var line = d3.svg.line();
            line.x(function (d, i) {
                return scales.x(i);
            });
            line.y(function (d) {
                return scales.y(d);
            });
            var line2 = d3.svg.line();
            line2.x(function (d, i) {
                return scales.x2(i);
            });
            line2.y(function (d) {
                return scales.y2(d);
            });
            var lineData = {
                lineName: lineName,
                line: line,
                line2: line2,
                data: data,
                className: 'line'
            };
            lines.push(lineData);
            return lineData;
        };

        var updateNames = function updateNamesFn(hardwareName, resultData)
        {
            var lineName;
            if (!hardwareNames[hardwareName])
            {
                hardwareNames[hardwareName] = [resultData];
                lineName = hardwareName;
            }
            else
            {
                hardwareNames[hardwareName].push(resultData);
                lineName = hardwareName + '-' + hardwareNames[hardwareName].length;
            }

            lineNames.push(lineName);
            //TODO: Fix color domains
            //color.domain(lineNames);
        };

        var clearFocusLines = function clearFocusLinesFn()
        {
            var lineData;
            for (var i = 0; i < lines.length; i += 1)
            {
                lineData = lines[i];
                if (lineData.focus)
                {
                    lineData.focus.remove();
                    delete lineData.focus;
                }
            }
        };

        var createFocusLine = function createFocusLineFn(lineData, index)
        {
            return focus.append("svg:path")
                .attr("d", lineData.line(lineData.data))
                .attr("class", lineData.className)
                .style("stroke", color(index)/*lineData.lineName*/)
                .attr("clip-path", "url(#clip)");
        };

        var updateFocusLines = function updateFocusLinesFn()
        {
            var lineData;
            for (var i = 0; i < lines.length; i += 1)
            {
                lineData = lines[i];
                if (lineData.focus)
                {
                    lineData.focus.attr("d", lineData.line(lineData.data));
                    lineData.focus.style("stroke", color(i)/*lineData.lineName*/);
                }
                else
                {
                    lineData.focus = createFocusLine(lineData, i);
                }
            }
        };

        var createContextLine = function createContextLineFn(lineData, index)
        {
            return context.append("svg:path")
                .attr("d", lineData.line2(lineData.data))
                .attr("class", lineData.className)
                .style("stroke", color(index)/*lineData.lineName*/)
                .attr("clip-path", "url(#clip)");
        };

        var clearContextLines = function clearContextLinesFn()
        {
            var lineData;
            for (var i = 0; i < lines.length; i += 1)
            {
                lineData = lines[i];
                if (lineData.context)
                {
                    lineData.context.remove();
                    delete lineData.context;
                }
            }
        };

        var updateContextLines = function updateContextLinesFn()
        {
            var lineData;
            for (var i = 0; i < lines.length; i += 1)
            {
                lineData = lines[i];
                if (lineData.context)
                {
                    lineData.context.attr("d", lineData.line(lineData.data));
                    lineData.context.style("stroke", color(i)/*lineData.lineName*/);
                }
                else
                {
                    lineData.context = createContextLine(lineData, i);
                }
            }
        };

        var updateLegend = function updateLegendFn()
        {
            graph.selectAll(".legend").remove();
            var legend = graph.selectAll(".legend")
                .data(lineNames)
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                .attr("x", width - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", function (d, i) {
                    return color(i);
                });

            legend.append("text")
                .attr("x", width - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function (d) { return d; });
        };

        var resultLoadedCallback = function resultLoadedCallbackFn(resultData)
        {
            if (resultData.version !== 0)
            {
                //TODO: Result data not supported
                return;
            }

            var hardwareName = resultData.config.hardware.name;
            var stream0 = resultData.data.sequences[0].streams[0];
            var stats = stream0.stats;
            var frames = stream0.frames;
            var newFrameTime = frames.msPerFrame;
            var newFrameCount = stats.frameCount;
            var newMaxFrameMs = stats.maxFrameMs;

            var domainUpdate = false;
            if (newMaxFrameMs > maxFrameMs)
            {
                domainUpdate = true;
            }

            if (newFrameCount > frameCount)
            {
                domainUpdate = true;
            }

            if (domainUpdate)
            {
                updateDomains(newFrameTime);
            }
            updateNames(hardwareName, resultData);
            createLine(lineNames[lineNames - 1], newFrameTime);
            updateFocusLines();
            updateContextLines();
            updateLegend();
        };

        // Add initial data
        updateDomains(frameTime);
        updateNames(hardwareName, userData);
        createLine(lineNames[lineNames - 1], frameTime);
        updateFocusLines();
        updateContextLines();
        updateLegend();

        this.playbackController.loadResults(resultLoadedCallback);
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

    benchmarkApp.playbackController = PlaybackController.create(config, graphicsDevice);
    benchmarkApp.playbackController.multisample = multisample;
    benchmarkApp.playbackController.antialias = antialias;

    benchmarkApp.loadingScreen = LoadingScreen.create(graphicsDevice, mathDevice, {progress: 0});

    benchmarkApp.intervalID = null;

    return benchmarkApp;
};
