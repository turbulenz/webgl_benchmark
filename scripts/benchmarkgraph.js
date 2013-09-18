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
        this._createLine(lineNames[lineNames.length - 1], frameTime);
        this.currentLineIndex = 0;
        this._updateDomains(frameTime);
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

        this._updateNames(hardwareName, resultData);
        this._createLine(lineNames[lineNames.length - 1], newFrameTime);

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
        var focusTrans = focus.transition().duration(750);
        var contextTrans = context.transition().duration(750);

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

        var xDomain;
        function inXDomain(d, i) {
            if (i < xDomain[0] || i > xDomain[1])
            {
                return 0;
            }
            return d;
        }

        if (this.currentLineIndex !== -1)
        {
            lineData = lines[this.currentLineIndex].data;

            xDomain = scales.x.domain();
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
        else
        {
            scales.y.domain([0, this.maxValueY]);
            scales.y2.domain(scales.y.domain());
            focusTrans.select(".y.axis").call(axes.y);
            contextTrans.select(".y.axis").call(axes.y);
        }
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
            if (lineData.focus)
            {
                focusTrans = lineData.focus.transition().duration(750);
                focusTrans.attr("d", lineData.line(lineData.data));
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
            if (lineData.context)
            {
                lineData.context.attr("d", lineData.line2(lineData.data));
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
            scales.x.domain(brush.empty() ? scales.x2.domain() : brush.extent());
            var trans = focus.transition().duration(750);
            trans.select(".x.axis").call(axes.x);
            that._updateDomains();
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

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function (d, i) {
                return color(i);
            })
            .style("cursor", "pointer")
            .on("click", function (d) {
                that._selectLine(d);
            });

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .style("cursor", "pointer")
            .text(function (d) { return d; })
            .on("click", function (d) {
                that._selectLine(d);
            });

        this._selectLegend(this.lineNames[this.currentLineIndex]);
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