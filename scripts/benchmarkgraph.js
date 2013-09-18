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

        var margin = {top: 10, right: 10, bottom: 100, left: 40};
        var margin2 = {top: 430, right: 10, bottom: 20, left: 40};
        var width = this.width = 960 - margin.left - margin.right;
        var height = this.height = 500 - margin.top - margin.bottom;
        var height2 = this.height2 = 500 - margin2.top - margin2.bottom;

        var xRange = [0, width];
        var yRange = [height, 0];
        var yRange2 = [height2, 0];

        var hardwareName = resultData.config.hardware.name;
        var stream0 = resultData.data.sequences[0].streams[0];
        var stats = stream0.stats;
        var frames = stream0.frames;
        var frameTime = frames.msPerFrame;
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

        //graph.transition();

        graph.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        var focus = this.focus = graph.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var context = this.context = graph.append("g")
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

        // Add initial data
        this.graphData.push(resultData);
        this._updateDomains(frameTime);
        this._updateNames(hardwareName, resultData);
        this._createLine(lineNames[lineNames.length - 1], frameTime);
        this.currentLineIndex = 0;
        this._updateFocusLines();
        this._updateContextLines();
        this._updateLegend();

        this.initialized = true;
        return true;
    },

    _getFrameData: function getFrameDataFn(resultData, frameDataName)
    {
        var stream0 = resultData.data.sequences[0].streams[0];
        var frames = stream0.frames;
        return frames[frameDataName];
    },

    _getStatData: function getStatDataFn(resultData, frameDataName)
    {
        var stream0 = resultData.data.sequences[0].streams[0];
        var stats = stream0.stats;
        return stats[frameDataName];
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
        var newFrameCount = this._getStatData(resultData, "frameCount");
        var newMaxFrameMs = this._getStatData(resultData, "maxFrameMs");

        var domainUpdate = false;
        if (newMaxFrameMs > this.maxFrameMs)
        {
            domainUpdate = true;
        }

        if (newFrameCount > this.frameCount)
        {
            domainUpdate = true;
        }

        if (domainUpdate)
        {
            this._updateDomains(newFrameTime);
        }
        this._updateNames(hardwareName, resultData);
        this._createLine(lineNames[lineNames.length - 1], newFrameTime);
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
        var yScaleMax = this.yScaleMax;

        scales.x.domain(d3.extent(xData.map(function (d, i) { return i; })));
        var xDomain = scales.x.domain();
        scales.y.domain([0, d3.max(xData.map(function (d, i) {
                if (i < xDomain[0] || i > xDomain[1])
                {
                    return 0;
                }
                return d;
            })) * yScaleMax]);
        scales.x2.domain(scales.x.domain());
        scales.y2.domain(scales.y.domain());

        context.select(".x.axis").call(axes.x2);
        focus.select(".x.axis").call(axes.x);
        context.select(".y.axis").call(axes.y);
        focus.select(".y.axis").call(axes.y);
    },

    _createLine: function createLineFn(lineName, data)
    {
        var scales = this.scales;
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
        this.lines.push(lineData);
        return lineData;
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
        //TODO: Fix color domains
        //color.domain(lineNames);
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
            .style("stroke", color(index)/*lineData.lineName*/)
            .attr("clip-path", "url(#clip)");
    },

    _updateFocusLines: function updateFocusLinesFn()
    {
        var that = this;
        var color = this.color;
        var lines = this.lines;
        var scales = this.scales;
        var axes = this.axes;
        var lineData;
        var trans;

        if (that.currentLineIndex !== -1)
        {
            var xDomain = scales.x.domain();
            var data = that._getFrameData(that.graphData[that.currentLineIndex], "msPerFrame");
            var dataY = data.map(function (d, i) {
                if (i < xDomain[0] || i > xDomain[1])
                {
                    return 0;
                }
                return d;
            });

            var maxY = d3.max(dataY) * that.yScaleMax;
            if (maxY !== that.maxValueY)
            {
                scales.y.domain([0, maxY]);
                scales.y2.domain([0, maxY]);
                this.maxValueY = maxY;
                trans = that.focus.transition().duration(750);
                trans.select(".y.axis").call(axes.y);
            }
        }

        for (var i = 0; i < lines.length; i += 1)
        {
            lineData = lines[i];
            if (lineData.focus)
            {
                trans = lineData.focus.transition().duration(750);
                trans.attr("d", lineData.line(lineData.data));
                //lineData.focus.style("stroke", color(i)/*lineData.lineName*/);
            }
            else
            {
                lineData.focus = this._createFocusLine(lineData, i);
            }
        }
    },

    _createContextLine: function createContextLineFn(lineData, index)
    {
        var context = this.context;
        var color = this.color;
        return context.append("svg:path")
            .attr("d", lineData.line2(lineData.data))
            .attr("class", lineData.className)
            .style("stroke", color(index)/*lineData.lineName*/)
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
        var color = this.color;
        var lineData;
        for (var i = 0; i < lines.length; i += 1)
        {
            lineData = lines[i];
            if (lineData.context)
            {
                lineData.context.attr("d", lineData.line2(lineData.data));
                lineData.context.style("stroke", color(i)/*lineData.lineName*/);
            }
            else
            {
                lineData.context = this._createContextLine(lineData, i);
                this._addBrush();
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
        this.graph.selectAll(".x brush").remove();

        var brushend = function brushendFn() {
            if (that.currentLineIndex === -1)
            {
                return;
            }
            scales.x.domain(brush.empty() ? scales.x2.domain() : brush.extent());
            focus.select(".x.axis").call(axes.x);
            that._updateFocusLines();
            that._updateContextLines();
        };

        var brush = d3.svg.brush()
            .x(scales.x2)
            .on("brushend", brushend);

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", this.height2 + 7);
    },

    _selectLine: function selectLineFn(lineName)
    {
        var lineNames = this.lineNames;
        for (var i = 0; i < lineNames.length; i += 1)
        {
            if (lineNames[i] === lineName)
            {
                this.currentLineIndex = i;
                this._updateFocusLines();
                this._updateContextLines();
                return i;
            }
        }
        this.currentLineIndex = -1;
        return -1;
    },

    _updateLegend: function updateLegendFn()
    {
        var that = this;
        var width = this.width;
        var graph = this.graph;
        var lineNames = this.lineNames;
        var color = this.color;
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
            })
            .on("click", function (d) {
                that._selectLine(d);
            });

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function (d) { return d; })
            .on("click", function (d) {
                that._selectLine(d);
            });
    },

    clear: function clearFn()
    {
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
    return benchmarkGraph;
};