//
// PlaybackController - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/

function PlaybackController() {}

PlaybackController.prototype =
{

    init : function playbackcontrollerInitFn(prefixAssetURL, prefixCaptureURL)
    {
        this.prefixAssetURL = prefixAssetURL;
        this.prefixCaptureURL = prefixCaptureURL;
        this.loadAssets();
    },

    _requestData : function playbackcontroller_requestDataFn(groupIndex)
    {
        var that = this;
        var playbackGraphicsDevice = this.playbackGraphicsDevice;
        var group = {
            resources: null,
            data: null,
            frames: null,
            ready: false
        };
        this.groups[groupIndex] = group;

        var xhr0 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));
        var xhr1 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));
        var xhr2 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));

        var resourcesLoaded = function resourcesLoadedFn()
        {
            if (xhr0.readyState === 4)
            {
                group.resources = JSON.parse(xhr0.responseText);
                that.numCaptureDataLoaded += 1;

                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                }

                if (groupIndex === this.currentGroupIndex &&
                    this.addingResources)
                {
                    playbackGraphicsDevice.addResources(group.resources, that.prefixAssetURL);
                    that.addingResources = false;
                    that.loadingResources = true;
                }

                xhr0.onreadystatechange = null;
                xhr0.responseText = null;
                xhr0 = null;
            }
        };

        var dataLoaded = function dataLoadedFn()
        {
            if (xhr1.readyState === 4)
            {
                group.data = xhr1.response;
                that.numCaptureDataLoaded += 1;

                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                    if (groupIndex === that.currentGroupIndex &&
                        that.loadingResources &&
                        playbackGraphicsDevice.numPendingResources === 0)
                    {
                        playbackGraphicsDevice.addData(group.data);
                        playbackGraphicsDevice.addFrames(group.frames, true);
                        that.loadingResources = false;
                    }
                }

                xhr1.onreadystatechange = null;
                xhr1.responseText = null;
                xhr1 = null;
            }
        };

        var framesLoaded = function framesLoadedFn()
        {
            if (xhr2.readyState === 4)
            {
                group.frames = JSON.parse(xhr2.responseText);
                that.numCaptureDataLoaded += 1;

                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                    if (groupIndex === that.currentGroupIndex &&
                        that.loadingResources &&
                        playbackGraphicsDevice.numPendingResources === 0)
                    {
                        playbackGraphicsDevice.addData(group.data);
                        playbackGraphicsDevice.addFrames(group.frames, true);
                        that.loadingResources = false;
                    }
                }

                xhr2.onreadystatechange = null;
                xhr2.responseText = null;
                xhr2 = null;
            }
        };

        var rangeString = '-' + (groupIndex * this.numFramesPerGroup) +
                          '-' + (((groupIndex + 1) * this.numFramesPerGroup) - 1);

        xhr0.open('GET', this.prefixCaptureURL + 'resources' + rangeString + '.json', true);
        xhr0.onreadystatechange = resourcesLoaded;
        xhr0.send();

        xhr1.open('GET', this.prefixCaptureURL + 'data' + rangeString + '.bin', true);
        xhr1.responseType = "arraybuffer";
        xhr1.onreadystatechange = dataLoaded;
        xhr1.send();

        xhr2.open('GET', this.prefixCaptureURL + 'frames' + rangeString + '.json', true);
        xhr2.onreadystatechange = framesLoaded;
        xhr2.send();

        this.numCaptureData += 3;
    },

    loadAssets : function playbackcontrollerLoadAssetsFn()
    {
        var that = this;
        var playbackGraphicsDevice = this.playbackGraphicsDevice;

        var g;
        for (g = 0; g < this.numGroups; g += 1)
        {
            this._requestData(g);
        }
    },

    getLoadingProgress : function playbackcontrollerGetLoadingProgressFn()
    {
        var playbackGraphicsDevice = this.playbackGraphicsDevice;
        return (this.numCaptureDataLoaded) / (this.numCaptureData);
    },

    pause : function playbackcontrollerPauseFn()
    {
        this.pauseStart = TurbulenzEngine.getTime();
        this.paused = true;
    },

    play : function playbackcontrollerPlayFn()
    {
        if (this.pauseStart)
        {
            this.playbackStart += TurbulenzEngine.getTime() - this.pauseStart;
        }
        this.paused = false;
    },

    update : function playbackcontrollerUpdateFn()
    {
        var framesReady = false;
        var graphicsDevice = this.graphicsDevice;
        var playbackGraphicsDevice = this.playbackGraphicsDevice;

        var group = this.groups[this.currentGroupIndex];
        if (group.ready)
        {
            if (this.addingResources)
            {
                playbackGraphicsDevice.addResources(group.resources, this.prefixAssetURL);
                this.addingResources = false;
                this.loadingResources = true;
            }

            if (this.loadingResources &&
                playbackGraphicsDevice.numPendingResources === 0)
            {
                playbackGraphicsDevice.addData(group.data);
                playbackGraphicsDevice.addFrames(group.frames, true);
                this.loadingResources = false;
            }

            if (!this.addingResources && !this.loadingResources)
            {
                framesReady = true;
            }
        }

        if (graphicsDevice.beginFrame())
        {
            if (framesReady)
            {
                if (!this.playbackStart)
                {
                    playbackGraphicsDevice.play(0);
                    this.framesRendered = 1;
                    this.relativeFrameIndex = 1;
                    this.playbackStart = TurbulenzEngine.getTime();
                    return;
                }

                var frameStart = TurbulenzEngine.getTime();
                playbackGraphicsDevice.play(this.relativeFrameIndex);
                var dispachTime = TurbulenzEngine.getTime() - frameStart;

                var frameTime;
                if (this.config.blockForRendering)
                {
                    // block by reading from the backbuffer
                    this.graphicsDevice.getScreenshot(false, 0, 0, 1, 1);
                    frameTime = TurbulenzEngine.getTime() - frameStart;
                }
                else
                {
                    var timeNow = TurbulenzEngine.getTime();
                    frameTime = (timeNow - this.previousFrameTime);
                    this.previousFrameTime = timeNow;
                }

                if (this.frameTimeElement)
                {
                    this.frameTimeElement.textContent = frameTime.toFixed(1) + ' ms';
                }

                if ((!this.paused || this.step) && !this.atEnd)
                {
                    this.step = false;
                    this.framesRendered += 1;

                    if (this.framesRendered % 60 === 0)
                    {
                        this.averageFrameTime = this.newAverageFrameTime;
                        this.newAverageFrameTime = 0;
                    }
                    this.newAverageFrameTime += frameTime / 60.0;

                    var recordingTime = (TurbulenzEngine.getTime() - this.playbackStart) / 1000;
                    if (this.averageFrameTimeElement)
                    {
                        this.averageFrameTimeElement.textContent = this.averageFrameTime.toFixed(1) + ' ms';
                    }

                    if (this.timeElement)
                    {
                        this.timeElement.textContent = recordingTime.toFixed(2) + ' s';
                    }

                    if (this.framesRenderedElement)
                    {
                        this.framesRenderedElement.textContent = this.framesRendered.toString();
                    }

                    if (this.averageFpsElement)
                    {
                        this.averageFpsElement.textContent = (this.framesRendered / recordingTime).toFixed(2);
                    }

                    if (this.frameNumberElement)
                    {
                        this.frameNumberElement.textContent =
                            ((this.currentGroupIndex * this.numFramesPerGroup) + this.relativeFrameIndex).toString();
                    }

                    if (this.resolutionElement)
                    {
                        this.resolutionElement.textContent = this.playbackGraphicsDevice.playWidth.toString() + ' x ' +
                            this.playbackGraphicsDevice.playHeight.toString();
                    }

                    var frameIndexDelta;
                    if (this.fixedFrameRate || graphicsDevice.fps <= 0)
                    {
                        frameIndexDelta = 1;

                        this.msPerFrame[this.msPerFrame.length] = frameTime;
                        this.msDispachPerFrame[this.msDispachPerFrame.length] = dispachTime;

                        if (this.metricsPerFrame)
                        {
                            var graphicsDeviceMetrics = graphicsDevice.metrics;
                            if (graphicsDeviceMetrics)
                            {
                                var metrics = this.metricsPerFrame[this.metricsPerFrame.length] = {};
                                var p;
                                for (p in this.metricsFields)
                                {
                                    if (this.metricsFields.hasOwnProperty(p))
                                    {
                                        metrics[p] = graphicsDeviceMetrics[p];
                                    }
                                }
                            }
                        }

                    }
                    else
                    {
                        var expectedFrame = (TurbulenzEngine.getTime() - this.playbackStart) * (60 / 1000);
                        var currentFrame = (this.currentGroupIndex * this.numFramesPerGroup) + this.relativeFrameIndex;
                        frameIndexDelta = Math.floor(expectedFrame - currentFrame);
                    }

                    this.relativeFrameIndex += frameIndexDelta;

                    if (this.relativeFrameIndex >= this.numFramesPerGroup)
                    {
                        if (frameIndexDelta > 0)
                        {
                            // skip the remaining playback in this group
                            playbackGraphicsDevice.skip(this.numFramesPerGroup);
                        }

                        if ((this.currentGroupIndex + 1) < this.numGroups)
                        {
                            // Flag last group data for release
                            group.data = this.emptyData;

                            this.currentGroupIndex += 1;
                            this.relativeFrameIndex -= this.numFramesPerGroup;
                            this.addingResources = true;
                        }
                        else
                        {
                            this.relativeFrameIndex -= frameIndexDelta;
                            this.testDetails = {
                                recordingTime: recordingTime,
                                framesRendered: this.framesRendered,
                                averageFps: this.framesRendered / recordingTime,
                                playWidth: this.playbackGraphicsDevice.playWidth,
                                playHeight: this.playbackGraphicsDevice.playHeight,
                                multisample: this.config.multisample,
                                fixedFrameRate: this.fixedFrameRate
                            };
                            this.atEnd = true;
                        }
                    }
                }
            }
            else
            {
                graphicsDevice.clear(this.loadingColor);
            }

            graphicsDevice.endFrame();
        }
    },

    outputData : function playbackcontrollerOutputDataFn(testName)
    {
        var browserTestPath = window.prompt('Save recording data in:', '');
        if (!browserTestPath)
        {
            return;
        }

        var filename = browserTestPath + '/' + testName + '-' + (new Date()).toISOString();
        this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '-details.json', JSON.stringify(this.testDetails));

        var metricsData = 'msPerFrame,msDispachPerFrame,averageMsPerFrame,averageMsPerDispach\n';
        var msPerFrame = this.msPerFrame;
        if (msPerFrame.length > 0)
        {
            var msDispachPerFrame = this.msDispachPerFrame;
            var msPerFrameLength = msPerFrame.length;
            var averageFrameMs = 0;
            var newAverageFrameMs = 0;
            var averageDispachMs = 0;
            var newAverageDispachMs = 0;
            var i;
            for (i = 0; i < msPerFrameLength; i += 1)
            {
                if (i % 60 === 0)
                {
                    averageFrameMs = newAverageFrameMs;
                    averageDispachMs = newAverageDispachMs;
                    newAverageFrameMs = 0;
                    newAverageDispachMs = 0;
                }
                newAverageFrameMs += msPerFrame[i] / 60.0;
                newAverageDispachMs += msDispachPerFrame[i] / 60.0;

                metricsData += msPerFrame[i] + ',' + msDispachPerFrame[i] + ',' + averageFrameMs + ',' + averageDispachMs + '\n';
            }
            this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '.csv', metricsData);

            this.msPerFrame = [];
            this.msDispachPerFrame = [];

            var metricsPerFrame = this.metricsPerFrame;
            if (metricsPerFrame)
            {
                var metricsFields = this.metricsFields;
                metricsData = '';
                var p;
                for (p in metricsFields)
                {
                    if (metricsFields.hasOwnProperty(p))
                    {
                        metricsData += p + ',';
                    }
                }
                metricsData += '\n';
                var metricsPerFrameLength = metricsPerFrame.length;
                for (i = 0; i < metricsPerFrameLength; i += 1)
                {
                    var frameMetrics = metricsPerFrame[i];
                    for (p in metricsFields)
                    {
                        if (metricsFields.hasOwnProperty(p))
                        {
                            metricsData += frameMetrics[p] + ',';
                        }
                    }
                    metricsData += '\n';
                }
                this.postData('/local/v1/save/webgl-benchmark/data/' + testName + '-metrics.csv', metricsData);

                this.metricsPerFrame = [];
            }
        }
    },

    postData : function playbackRecorderPostData(url, dataString)
    {
        var that = this;
        var xhr;
        if (this.xhrPool.length === 0)
        {
            xhr = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));
        }
        else
        {
            xhr = this.xhrPool.pop();
        }
        xhr.open('POST', url, true);
        xhr.onreadystatechange = function ()
        {
            if (xhr.readyState === 4)
            {
                xhr.onreadystatechange = null;
                that.xhrPool.push(xhr);
            }
        };
        xhr.send(dataString);
    },

    destroy : function playbackcontrollerDestroyFn()
    {
        this.playbackGraphicsDevice.destroy();
    }
};

PlaybackController.create = function playbackControllerCreateFn(config, graphicsDevice)
{
    var playbackController = new PlaybackController();
    playbackController.graphicsDevice = graphicsDevice;
    playbackController.config = config;

    playbackController.playbackGraphicsDevice = PlaybackGraphicsDevice.create(graphicsDevice);

    playbackController.playbackGraphicsDevice.onerror = function (msg)
    {
        window.alert(msg);
    };

    playbackController.prefixAssetURL = null;
    playbackController.prefixCaptureURL = null;

    var numTotalFrames = playbackController.numTotalFrames = config.numTotalFrames;
    var numFramesPerGroup = playbackController.numFramesPerGroup = config.numFramesPerGroup;
    playbackController.numGroups = Math.floor(numTotalFrames / numFramesPerGroup);
    playbackController.groups = [];
    playbackController.currentGroupIndex = 0;
    playbackController.relativeFrameIndex = 0;
    playbackController.framesRendered = 0;
    playbackController.averageFrameTime = 0;
    playbackController.newAverageFrameTime = 0;
    playbackController.addingResources = true;
    playbackController.loadingResources = false;
    playbackController.emptyData = [-1, -1, -1, -1];

    playbackController.step = false;

    playbackController.numCaptureData = 0;
    playbackController.numCaptureDataLoaded = 0;

    playbackController.previousFrameTime = 0;
    playbackController.atEnd = false;

    playbackController.framesRenderedElement = document.getElementById("framesRendered");
    playbackController.timeElement = document.getElementById("time");
    playbackController.frameTimeElement = document.getElementById("frameTime");
    playbackController.averageFrameTimeElement = document.getElementById("averageFrameTime");
    playbackController.frameNumberElement = document.getElementById("frameNumber");
    playbackController.resolutionElement = document.getElementById("resolution");
    playbackController.averageFpsElement = document.getElementById("averageFps");

    playbackController.paused = false;
    playbackController.pauseStart = null;
    playbackController.fixedFrameRate = config.fixedFrameRate;

    playbackController.xhrPool = [];
    playbackController.msPerFrame = [];
    playbackController.msDispachPerFrame = [];
    playbackController.testDetails = null;

    if (config.outputMetrics)
    {
        playbackController.metricsPerFrame = [];
    }
    else
    {
        playbackController.metricsPerFrame = null;
    }
    playbackController.sentData = false;

    playbackController.metricsFields = {
        'renderTargetChanges': 1,
        'textureChanges': 1,
        'renderStateChanges': 1,
        'vertexBufferChanges': 1,
        'indexBufferChanges': 1,
        'techniqueChanges': 1,
        'drawCalls': 1,
        'primitives': 1
    };

    return playbackController;
};
