//
// BenchmarkGraph - The graph of the benchmark data
//

/*global d3: false*/

function BenchmarkGraph() {}

BenchmarkGraph.prototype =
{
    init: function initFn(resultData)
    {
        var graphElement = this.graphElement = this.elementSelector ? d3.select(this.elementSelector): null;
        if (!graphElement)
        {
            window.alert("Cannot find element to display benchmark graph");
            return false;
        }

        var margin = this.margin = {top: 10, right: 10, bottom: 100, left: 40};
        var margin2 = {top: 430, right: 10, bottom: 20, left: 40};
        var width = this.width = 960 - margin.left - margin.right;
        var height = this.height = 500 - margin.top - margin.bottom;
        var height2 = this.height2 = 500 - margin2.top - margin2.bottom;
        this.tooltipWidth = 0;

        var xRange = [0, width];
        var yRange = [height, 0];
        var yRange2 = [height2, 0];

        var hardwareName = resultData.config.hardware.name;
        var stream0 = resultData.data.sequences[0].streams[0];
        var stats = stream0.stats;
        var frames = stream0.frames;
        var frameTime = frames.msPerFrame;
        var ignoreFrame = frames.ignoreFrame;
        this.frameCount = stats.frameCount;
        this.maxFrameMs = stats.maxFrameMs;

        var scales = this.scales = {
            x: d3.scale.linear().range(xRange),
            y: d3.scale.linear().range(yRange),
            x2: d3.scale.linear().range(xRange),
            y2: d3.scale.linear().range(yRange2)
        };

        var axes = this.axes = {
            x: d3.svg.axis().scale(scales.x).orient("bottom"),
            x2: d3.svg.axis().scale(scales.x2).orient("bottom"),
            y: d3.svg.axis().scale(scales.y).orient("left")
        };

        this.hardwareNames = {};
        this.lines = [];
        this.color = d3.scale.category20();
        var lineNames = this.lineNames = [];

        var graph = this.graph = graphElement.append("svg:svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        graph.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("id", "clip-rect")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", width)
            .attr("height", height);

        var focus = this.focus = graph.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var context = this.context = graph.append("g")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        this.focusClip = focus.append("g")
            .attr("clip-path", "url(#clip)");
        this.focusBg = this.focusClip.append("g");

        this._addRanges(resultData);

        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(axes.x)
            .append("text")
                .attr("y", 6)
                .attr("x", width)
                .attr("dy", "-1em")
                .style("text-anchor", "end")
                .text("Frame number");

        focus.append("g")
            .attr("class", "y axis")
            .call(axes.y)
            .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "1em")
                .style("text-anchor", "end")
                .text("Time between frames (ms)");

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height2 + ")")
            .call(axes.x2);

        // Add initial data
        this.graphData.push(resultData);
        this._updateNames(hardwareName, resultData);
        var processedData = this._processResultData({
            msPerFrame: frameTime,
            ignoreFrame: ignoreFrame
        });
        this._createLine(lineNames[lineNames.length - 1], processedData);
        this.currentLineIndex = 0;
        this._updateDomains(frameTime);
        this._updateFocusLines();
        this._updateContextLines();

        this._updateLegend();
        this._createTooltip();

        this.initialized = true;
        return true;
    },

    _getFrameData: function getFrameDataFn(resultData, frameDataName)
    {
        var stream0 = resultData.data.sequences[0].streams[0];
        var frames = stream0.frames;
        return frames[frameDataName];
    },

    _setFrameData: function getFrameDataFn(resultData, frameDataName, data)
    {
        var stream0 = resultData.data.sequences[0].streams[0];
        var frames = stream0.frames;
        frames[frameDataName] = data;
    },

    _getStatData: function getStatDataFn(resultData, frameDataName)
    {
        var stream0 = resultData.data.sequences[0].streams[0];
        var stats = stream0.stats;
        return stats[frameDataName];
    },

    _getToolTipText: function getToolTipTextFn(index)
    {
        var resultData = this.graphData[index];
        var textArray = [];

        function addConfig(name, config)
        {
            var i, c, keys, indent;
            textArray.push(name + ":");
            indent = "- ";
            keys = [];
            for (c in config)
            {
                if (config.hasOwnProperty(c))
                {
                    if (c !== "name")
                    {
                        keys.push(c);
                    }
                    else
                    {
                        textArray.push(indent + "name: " + config[c]);
                    }
                }
            }
            keys.sort();
            for (i = 0; i < keys.length; i += 1)
            {
                textArray.push(indent + keys[i] + ": " + config[keys[i]]);
            }
            textArray.push(" ");
        }

        addConfig("Hardware Config", resultData.config.hardware);
        addConfig("Playback Config", resultData.config.playback);

        return textArray;
    },

    _processResultData: function processResultDataFn(dataObject)
    {
        var msPerFrame = dataObject.msPerFrame;
        var ignoreFrame = dataObject.ignoreFrame;

        var processedData = {
            source: dataObject,
            filtered: {}
        };

        var i, length;
        var lastValidTime;

        if (ignoreFrame && this.filterNoIgnored)
        {
            var msPerFrameNoIgnored = [];
            length = msPerFrame.length;
            lastValidTime = 0;
            for (i = 0; i < length; i += 1)
            {
                if (ignoreFrame[i] === 0)
                {
                    lastValidTime = msPerFrame[i];
                    msPerFrameNoIgnored.push(lastValidTime);
                }
                else
                {
                    msPerFrameNoIgnored.push(lastValidTime);
                }
            }

            processedData.filtered.msPerFrameNoIgnored = msPerFrameNoIgnored;
        }

        var msPerFrameAverage = [];
        length = msPerFrame.length;
        var accum = 0;
        var firstIndex = 0, msPerFrameAvg = 0;
        var avgWindow = this.averageWindow;
        lastValidTime = 0;
        var ignoreCount = 0;
        for (i = 0; i < length; i += 1)
        {
            if (ignoreFrame && ignoreFrame[i] === 1)
            {
                ignoreCount += 1;
            }
            else
            {
                accum += msPerFrame[i];
            }

            if (i > avgWindow)
            {
                if (ignoreFrame && ignoreFrame[firstIndex] === 1)
                {
                    ignoreCount -= 1;
                }
                else
                {
                    accum -= msPerFrame[firstIndex];
                }

                msPerFrameAvg = accum / (i - firstIndex + 1 - ignoreCount);
                firstIndex += 1;
            }
            else if (i > 1)
            {
                msPerFrameAvg = accum / (i + 1 - ignoreCount);
            }
            msPerFrameAverage.push(msPerFrameAvg);
        }

        processedData.filtered.msPerFrameAverage = msPerFrameAverage;

        if (this.filterSampleCount > 1)
        {
            var samples = [];
            var msPerFrameSample;
            var sampleCount = 0;
            var sampleMod;
            length = msPerFrame.length;

            while (sampleCount < this.filterSampleCount)
            {
                msPerFrameSample = [];
                sampleMod = Math.pow(2, sampleCount);
                for (i = 0; i < length; i += 1)
                {
                    if (i % sampleMod === 0)
                    {
                        msPerFrameSample.push(msPerFrame[i]);
                    }
                }
                samples.push(msPerFrameSample);
                sampleCount += 1;
            }

            processedData.source.msPerFrameSamples = samples;

            samples = [];
            sampleCount = 0;
            length = msPerFrameAverage.length;

            while (sampleCount < this.filterSampleCount)
            {
                msPerFrameSample = [];
                sampleMod = Math.pow(2, sampleCount);
                for (i = 0; i < length; i += 1)
                {
                    if (i % sampleMod === 0)
                    {
                        msPerFrameSample.push(msPerFrameAverage[i]);
                    }
                }
                samples.push(msPerFrameSample);
                sampleCount += 1;
            }

            processedData.filtered.msPerFrameAverageSamples = samples;
        }

        return processedData;
    },

    addResult: function addResultFn(resultData)
    {
        if (!this.initialized)
        {
            return;
        }

        if (resultData.version !== 0)
        {
            //TODO: Result data not supported
            return;
        }

        var lineNames = this.lineNames;
        var hardwareName = resultData.config.hardware.name;

        var newFrameTime = this._getFrameData(resultData, "msPerFrame");
        var newIgnoreFrame = this._getFrameData(resultData, "ignoreFrame");
        var newFrameCount = this._getStatData(resultData, "frameCount");

        var processedData = this._processResultData({
            msPerFrame: newFrameTime,
            ignoreFrame: newIgnoreFrame,
            frameCount: newFrameCount
        });

        this._updateNames(hardwareName, resultData);
        this._createLine(lineNames[lineNames.length - 1], processedData);

        if (newFrameCount > this.frameCount)
        {
            this._updateDomains(newFrameTime);
        }

        this._updateFocusLines();
        this._updateContextLines();

        this._updateLegend();
        this.graphData.push(resultData);
    },

    _updateDomains: function updateDomainsFn(xData)
    {
        var scales = this.scales;
        var context = this.context;
        var focus = this.focus;
        var axes = this.axes;
        var lines = this.lines;
        var yScaleMax = this.yScaleMax;
        var disableTransitions = this.disableTransitions;
        var focusTrans;
        var contextTrans;
        if (disableTransitions)
        {
            focusTrans = focus;
            contextTrans = context;
        }
        else
        {
            focusTrans = focus.transition().duration(750);
            contextTrans = context.transition().duration(750);
        }


        var lineData;
        var maxY;
        var dataY;

        if (xData)
        {
            scales.x.domain(d3.extent(xData.map(function (d, i) { return i; })));
            scales.x2.domain(scales.x.domain());
            focusTrans.select(".x.axis").call(axes.x);
            contextTrans.select(".x.axis").call(axes.x2);
        }

        var lineStep;
        var xDomain;
        function inXDomain(d, i) {
            var indexStep = i * lineStep;
            if (indexStep < xDomain[0] || indexStep > xDomain[1])
            {
                return 0;
            }
            return d;
        }

        var line;
        if (this.currentLineIndex !== -1)
        {
            line = lines[this.currentLineIndex];
            if (line)
            {
                lineData = line.data;

                xDomain = scales.x.domain();
                lineStep = line.lineStepX;
                dataY = lineData.map(inXDomain);

                maxY = d3.max(dataY) * yScaleMax;
                if (maxY !== this.maxValueY)
                {
                    scales.y.domain([0, maxY]);
                    scales.y2.domain(scales.y.domain());
                    focusTrans.select(".y.axis").call(axes.y);
                    contextTrans.select(".y.axis").call(axes.y);
                    this.maxValueY = maxY;
                }
            }
        }
        else
        {
            scales.y.domain([0, this.maxValueY]);
            scales.y2.domain(scales.y.domain());
            focusTrans.select(".y.axis").call(axes.y);
            contextTrans.select(".y.axis").call(axes.y);
        }

        var testRanges = this.testRanges;
        var testRange;
        var xDomainWidth = xDomain[1] - xDomain[0];
        var length = testRanges.length;
        xDomain = scales.x.domain();
        var testRatio;
        var x, width;

        for (var i = 0; i < length; i += 1)
        {
            testRange = testRanges[i];

            testRatio = this.width / xDomainWidth;
            x = (testRange.x - xDomain[0]) * testRatio;
            width = testRange.width * testRatio;

            testRange.rect
                .attr("x", x)
                .attr("width", width);

            testRange.text
                .attr('x', x + 20);
        }
    },

    _createLine: function createLineFn(lineName, processedData)
    {
        var scales = this.scales;
        var line = d3.svg.line();

        var enableAverage = this.enableAverage;
        var filtered = processedData.filtered;
        var source = processedData.source;
        var samples = enableAverage ? filtered.msPerFrameAverageSamples: source.msPerFrameSamples;
        var data = enableAverage ? filtered.msPerFrameAverage: source.msPerFrame;

        var lineStepX = 1, line2StepX = 1;
        var data2 = data;
        var lineSampleLevel = this.lineSampleLevel;
        var line2SampleLevel = this.line2SampleLevel;

        var sampleCount = samples.length;
        if (samples)
        {
            if (lineSampleLevel && lineSampleLevel > 0 && lineSampleLevel < sampleCount)
            {
                lineStepX = Math.pow(2, lineSampleLevel);
                data = samples[lineSampleLevel];
            }

            if (line2SampleLevel && line2SampleLevel > 0 && line2SampleLevel < sampleCount)
            {
                line2StepX = Math.pow(2, line2SampleLevel);
                data2 = samples[line2SampleLevel];
            }
        }

        line.x(function (d, i) {
            return scales.x(i * lineStepX);
        });
        line.y(function (d) {
            return scales.y(d);
        });
        var line2 = d3.svg.line();
        line2.x(function (d, i) {
            return scales.x2(i * line2StepX);
        });
        line2.y(function (d) {
            return scales.y2(d);
        });
        var lineData = {
            lineName: lineName,
            line: line,
            lineStepX: lineStepX,
            line2: line2,
            line2StepX: line2StepX,
            data: data,
            data2: data2,
            className: 'line'
        };
        this.lines.push(lineData);
        return lineData;
    },

    _addLine: function createLineFn(lineName)
    {
        var added = false;
        var lines = this.lines;
        var length = lines.length;
        var line;
        for (var i = 0; i < length; i += 1)
        {
            line = lines[i];
            if (line && line.lineName === lineName)
            {
                line.hide = false;
                added = true;
            }
        }
        return added;
    },

    _removeLine: function createLineFn(lineName)
    {
        var removed = false;
        var lines = this.lines;
        var length = lines.length;
        var line;
        for (var i = 0; i < length; i += 1)
        {
            line = lines[i];
            if (line && line.lineName === lineName)
            {
                line.hide = true;
                removed = true;
            }
        }
        return removed;
    },

    _updateNames: function updateNamesFn(hardwareName, resultData)
    {
        var hardwareNames = this.hardwareNames;
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

        this.lineNames.push(lineName);
    },

    _clearFocusLines: function clearFocusLinesFn()
    {
        var lines = this.lines;
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
    },

    _createFocusLine: function createFocusLineFn(lineData, index)
    {
        var color = this.color;
        var focus = this.focus;
        return focus.append("svg:path")
            .attr("d", lineData.line(lineData.data))
            .attr("class", lineData.className)
            .style("stroke", color(index))
            .attr("clip-path", "url(#clip)");
    },

    _updateFocusLines: function updateFocusLinesFn()
    {
        var lines = this.lines;
        var lineData;
        var focusTrans;

        for (var i = 0; i < lines.length; i += 1)
        {
            lineData = lines[i];

            if (lineData.hide)
            {
                if (lineData.focus)
                {
                    lineData.focus.remove();
                    delete lineData.focus;
                }
            }
            else
            {
                if (lineData.focus)
                {
                    focusTrans = this.disableTransitions ? lineData.focus: lineData.focus.transition().duration(750);
                    focusTrans.attr("d", lineData.line(lineData.data));
                }
                else
                {
                    lineData.focus = this._createFocusLine(lineData, i);
                }
            }
        }
    },

    _createContextLine: function createContextLineFn(lineData, index)
    {
        var context = this.context;
        var color = this.color;
        return context.append("svg:path")
            .attr("d", lineData.line2(lineData.data2))
            .attr("class", lineData.className)
            .style("stroke", color(index))
            .attr("clip-path", "url(#clip)");
    },

    _clearContextLines: function clearContextLinesFn()
    {
        var lines = this.lines;
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
    },

    _updateContextLines: function updateContextLinesFn()
    {
        var lines = this.lines;
        var lineData;

        for (var i = 0; i < lines.length; i += 1)
        {
            lineData = lines[i];

            if (lineData.hide)
            {
                if (lineData.context)
                {
                    lineData.context.remove();
                    delete lineData.context;
                }
            }
            else
            {
                if (lineData.context)
                {
                    lineData.context.attr("d", lineData.line2(lineData.data2));
                }
                else
                {
                    lineData.context = this._createContextLine(lineData, i);
                    this._addBrush();
                }
            }
        }
    },

    _addBrush: function addBrushFn()
    {
        var that = this;
        var context = this.context;
        var scales = this.scales;
        var focus = this.focus;
        var axes = this.axes;

        var brush = this.brush;
        if (!brush)
        {
            this.brush = brush = d3.svg.brush().x(scales.x2);
        }

        brush.on("brushend", null);
        this.graph.selectAll(".x.brush").remove();

        var brushend = function brushendFn() {
            scales.x.domain(brush.empty() ? scales.x2.domain() : brush.extent());
            var trans = that.disableTransitions ? focus: focus.transition().duration(750);
            trans.select(".x.axis").call(axes.x);
            that._updateDomains();
            that._updateFocusLines();
            that._updateContextLines();
        };

        brush.on("brushend", brushend);

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", this.height2 + 7);
    },

    _createTooltip: function createTooltip()
    {
        var margin = {top: 10, right: 10, bottom: 100, left: 10};
        var width = 150 - margin.left - margin.right;

        var tooltip = this.graph.append("g")
            .attr("class", "tooltip");

        tooltip.append("rect")
            .attr("transform", "translate(" + (-margin.left - width - margin.right) + "," + margin.top + ")")
            .attr("width", width + margin.right)
            .style("opacity", "0.0")
            .style("fill", "#999");

        tooltip.append("g")
            .attr("class", "textbox")
            .attr("transform", "translate(" + (-margin.left - width - margin.right) + "," + margin.top + ")")
            .style("opacity", "0.0")
            .style("fill", "#FFF");
    },

    _tooltipOver: function tooltipOverFn(lineName, index)
    {
        var textLines = this._getToolTipText(index);
        this.graph.selectAll(".tooltip .textbox text").remove();
        var tooltipText = this.graph.select(".tooltip .textbox");
        var height = textLines.length * 10;
        var longestLine = 0;
        var i, length;

        for (i = 0, length = textLines.length; i < length; i += 1)
        {
            tooltipText.append("text")
                .attr("transform", "translate(5," + ((i * 10) + 10) + ")")
                .text(textLines[i]);

            if (textLines[i].length > longestLine)
            {
                longestLine = textLines[i].length;
            }
        }

        var width = this.tooltipWidth = longestLine * 6;

        var textbox = this.graph.select(".tooltip .textbox");
        var rect = this.graph.select(".tooltip rect");
        if (!this.disableTransitions)
        {
            textbox.transition().duration(750);
            rect.transition().duration(500);
        }

        textbox.style("opacity", "1.0")
               .style("visibility", null);


        rect.attr("height", height)
            .attr("width", width)
            .style("opacity", "0.9")
            .style("visibility", null);
    },

    _tooltipMove: function tooltipMoveFn(lineName, event)
    {
        var margin = this.margin;
        var pos = d3.mouse(event);
        var tooltipWidthHalf = Math.floor(0.5 * this.tooltipWidth);
        this.graph.select(".tooltip")
            .attr("transform", function (d, i) {
                return "translate(" + (pos[0] - tooltipWidthHalf) + "," + ((i * 20) + margin.top + pos[1]) + ")";
            });
    },

    _tooltipOut: function tooltipOutFn()
    {
        var textbox = this.graph.select(".tooltip .textbox");
        var rect = this.graph.select(".tooltip rect");
        if (!this.disableTransitions)
        {
            textbox.transition().duration(50);
            rect.transition().duration(50);
        }
        textbox.style("opacity", "0.0")
               .style("visibility", "hidden");

        rect.attr("height", 0)
            .style("opacity", "0.0")
            .style("visibility", "hidden");
    },

    _isHidden: function isSelectedFn(lineName)
    {
        var hiddenLineNames = this.hiddenLineNames;
        return hiddenLineNames[lineName] !== undefined;
    },

    _hideLine: function selectLineFn(lineName)
    {
        var hiddenLineNames = this.hiddenLineNames;

        if (this._removeLine(lineName))
        {
            hiddenLineNames[lineName] = true;
            this._updateDomains();
            this._updateFocusLines();
            this._updateContextLines();
            return true;
        }
        return false;
    },

    _showLine: function selectLineFn(lineName)
    {
        var hiddenLineNames = this.hiddenLineNames;

        if (hiddenLineNames[lineName] && this._addLine(lineName))
        {
            delete hiddenLineNames[lineName];
            this._updateDomains();
            this._updateFocusLines();
            this._updateContextLines();
            return true;
        }
        return false;
    },

    _isSelected: function isSelectedFn(lineName)
    {
        var lineNames = this.lineNames;
        for (var i = 0; i < lineNames.length; i += 1)
        {
            if (lineNames[i] === lineName)
            {
                return this.currentLineIndex === i;
            }
        }
        return false;
    },

    _selectLine: function selectLineFn(lineName)
    {
        var lineNames = this.lineNames;
        this._selectLegend(lineName);
        for (var i = 0; i < lineNames.length; i += 1)
        {
            if (lineNames[i] === lineName)
            {
                this.currentLineIndex = i;
                this._updateDomains();
                this._updateFocusLines();
                this._updateContextLines();
                return i;
            }
        }
        this.currentLineIndex = -1;
        return -1;
    },

    _selectLegend: function selectLegendFn(lineName)
    {
        this.graph.selectAll(".legend text")
            .style("font-weight", function (d) {
                if (d === lineName)
                {
                    return "bold";
                }
                return "normal";
            });
        this.graph.selectAll(".legend rect")
            .style("stroke", function (d) {
                if (d === lineName)
                {
                    return "#000";
                }
            })
            .style("stroke-width", function (d) {
                if (d === lineName)
                {
                    return "2px";
                }
            });
    },

    _updateLegend: function updateLegendFn()
    {
        var that = this;
        var width = this.width;
        var graph = this.graph;
        var lineNames = this.lineNames;
        var color = this.color;
        graph.selectAll(".legend").remove();
        var margin = this.margin;
        var legend = graph.selectAll(".legend")
            .data(lineNames)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) { return "translate(0," + ((i * 20) + margin.top) + ")"; });

        var rect = legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("opacity", function (d) {
                return that.hiddenLineNames[d] ? 0.2: 1.0;
            })
            .style("fill", function (d, i) {
                return color(i);
            })
            .style("cursor", "pointer")
            .on("click", function (d) {
                if (!that._isSelected(d))
                {
                    that._selectLine(d);
                }
                else if (!that._isHidden(d))
                {
                    if (that._hideLine(d))
                    {
                        text.style("opacity", function (d) {
                            return that.hiddenLineNames[d] ? 0.2: 1.0;
                        });
                        rect.style("opacity", function (d) {
                            return that.hiddenLineNames[d] ? 0.2: 1.0;
                        });
                    }
                }
                else
                {
                    if (that._showLine(d))
                    {
                        text.style("opacity", function (d) {
                            return that.hiddenLineNames[d] ? 0.2: 1.0;
                        });
                        rect.style("opacity", function (d) {
                            return that.hiddenLineNames[d] ? 0.2: 1.0;
                        });
                    }
                }
            })
            .on("mouseover", function (d, i) {
                that._tooltipOver(d, i);
            })
            .on("mouseout", function (d) {
                that._tooltipOut(d);
            });

        this.graph
            .on("mousemove", function (d) {
                that._tooltipMove(d, this);
            });

        var text = legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .style("cursor", "pointer")
            .style("opacity", function (d) {
                return that.hiddenLineNames[d] ? 0.2: 1.0;
            })
            .text(function (d) { return d; })
            .on("click", function (d) {
                that._selectLine(d);
            });

        this._selectLegend(this.lineNames[this.currentLineIndex]);
    },

    _addRanges: function addRangesFn(resultData)
    {
        var focus = this.focusBg;
        var baseColor = d3.rgb('#eee');
        var streamMeta = resultData.config.sequences[0].streams[0].meta;
        var testRanges = [];
        if (streamMeta && streamMeta.tests)
        {
            var tests = streamMeta.tests;
            var testMeta;

            var x, y, width, height, offset, totalHeight;
            var index = 0;

            offset = 0;
            totalHeight = this.height;

            var rect;
            var text;
            for (var t in tests)
            {
                if (tests.hasOwnProperty(t))
                {
                    testMeta = tests[t];

                    x = testMeta.startFrame;
                    y = offset;
                    width = (testMeta.endFrame - testMeta.startFrame);
                    height = totalHeight - offset;

                    rect = focus.append("rect")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("width", width)
                        .attr("height", height)
                        .style("opacity", 0.4)
                        .style("fill", baseColor.darker((index % 5) * 0.25));

                    offset += 20;

                    text = focus.append('text').text(t)
                        .attr('x', x + 20)
                        .attr('y', offset - 5)
                        .attr('fill', 'black');

                    testRanges.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        rect: rect,
                        text: text
                    });

                    index += 1;
                }
            }
        }
        this.testRanges = testRanges;
    },

    clear: function clearFn()
    {
        this.brush = null;
        this.currentLineIndex = -1;
        this.maxValueY = 0;
        this.graphElement = null;
        this.width = 0;
        this.height = 0;
        this.height2 = 0;
        this.graph = null;
        this.color = null;
        this.lineNames = [];
        this.hardwareNames = {};
        this.graphData = [];
        this.lines = [];
        this.scales = {};
        this.context = null;
        this.focus = null;
        this.axes = {};
        this.frameCount = 0;
        this.maxFrameMs = 0;
        this.hiddenLineNames = {};
        this.initialized = false;
    }
};




BenchmarkGraph.create = function benchmarkGraphCreateFn(params)
{
    var benchmarkGraph = new BenchmarkGraph();
    benchmarkGraph.clear();
    benchmarkGraph.elementSelector = params.elementSelector;

    // The percentage of the max Y-value the graph should use as a max Y-value.
    // e.g. yScaleMax === 1 the max value is at the top of the graph
    benchmarkGraph.yScaleMax = 1.5;
    benchmarkGraph.filterNoIgnored = true;
    benchmarkGraph.filterSampleCount = 6;
    benchmarkGraph.lineSampleLevel = -1;
    benchmarkGraph.line2SampleLevel = 6;
    benchmarkGraph.enableAverage = true;
    benchmarkGraph.averageWindow = 60;
    benchmarkGraph.disableTransitions = true;
    return benchmarkGraph;
};