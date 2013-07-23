//
// PlaybackController - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/

function PlaybackController() {}

PlaybackController.prototype =
{

    init : function playbackcontrollerInitFn()
    {
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
        //var numResourcesAdded = 92; //playbackGraphicsDevice.numResourcesAdded;
        //var numLoadedResources = playbackGraphicsDevice.numResourcesAdded - playbackGraphicsDevice.numPendingResources;
        return (this.numCaptureDataLoaded) / (this.numCaptureData);
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
                var timeNow = TurbulenzEngine.getTime();
                var frameTime = (timeNow - this.previousFrameTime);
                this.previousFrameTime = timeNow;

                if (this.frameTimeElement)
                {
                    this.frameTimeElement.textContent = frameTime.toFixed(1) + ' ms';
                }

                this.msPerFrame[this.msPerFrame.length] = frameTime;

                playbackGraphicsDevice.play(this.relativeFrameIndex);

                var metrics = graphicsDevice.metrics;
                if (metrics)
                {
                    var metricsCopy = this.metricsPerFrame[this.metricsPerFrame.length] = {};
                    var p;
                    for (p in this.metricsFields)
                    {
                        if (this.metricsFields.hasOwnProperty(p))
                        {
                            metricsCopy[p] = metrics[p];
                        }
                    }
                }

                //graphicsDevice.finish();

                if (!this.paused || this.step)
                {
                    this.step = false;

                    var frameIndexDelta;
                    if (this.fixedFrameRate || graphicsDevice.fps <= 0)
                    {
                        frameIndexDelta = 1;
                    }
                    else
                    {
                        frameIndexDelta = Math.max(1.0, Math.floor(0.5 + (60 / graphicsDevice.fps)));
                    }

                    this.relativeFrameIndex += frameIndexDelta;

                    if (this.relativeFrameIndex >= this.numFramesPerGroup)
                    {
                        if ((this.currentGroupIndex + 1) < this.numGroups)
                        {
                            // Flag last group data for release
                            group.data = this.emptyData;

                            this.currentGroupIndex += 1;
                            this.relativeFrameIndex = 0;
                            this.addingResources = true;
                        }
                        else
                        {
                            this.relativeFrameIndex -= frameIndexDelta;
                            if (!this.sentData)
                            {
                                this.outputData();
                                this.sentData = true;
                            }
                        }
                    }

                    if (this.frameNumberElement)
                    {
                        this.frameNumberElement.textContent =
                            ((this.currentGroupIndex * this.numFramesPerGroup) + this.relativeFrameIndex).toString();
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

    outputData : function playbackcontrollerOutputDataFn()
    {
        var browserTest = window.prompt('Save recording data as:', '');
        var filename = browserTest + '-' + (new Date()).toISOString();
        var msPerFrame = this.msPerFrame;
        var msPerFrameLength = msPerFrame.length;
        var i;
        for (i = 0; i < msPerFrameLength; i += 1)
        {
            msPerFrame[i] = 1000 / msPerFrame[i]; // convert to FPS
        }
        this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '.csv',
            this.msPerFrame.join('\n'));

        var metricsPerFrame = this.metricsPerFrame;
        if (metricsPerFrame.length > 0)
        {
            var metricsFields = this.metricsFields;
            var metricsData = '';
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
            this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '-metrics.csv', metricsData);
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

PlaybackController.create = function playbackControllerCreateFn(graphicsDevice)
{
    var playbackController = new PlaybackController();
    playbackController.graphicsDevice = graphicsDevice;
    playbackController.playbackGraphicsDevice = PlaybackGraphicsDevice.create(graphicsDevice);

    playbackController.playbackGraphicsDevice.onerror = function (msg)
    {
        window.alert(msg);
    };

    playbackController.prefixAssetURL = 'capture/';
    playbackController.prefixCaptureURL = 'capture/';

    var numTotalFrames = playbackController.numTotalFrames = 3600;
    var numFramesPerGroup = playbackController.numFramesPerGroup = 60;
    playbackController.numGroups = Math.floor(numTotalFrames / numFramesPerGroup);
    playbackController.groups = [];
    playbackController.currentGroupIndex = 0;
    playbackController.relativeFrameIndex = 0;
    playbackController.addingResources = true;
    playbackController.loadingResources = false;
    playbackController.emptyData = [-1, -1, -1, -1];

    playbackController.numCaptureData = 0;
    playbackController.numCaptureDataLoaded = 0;

    playbackController.previousFrameTime = 0;
    playbackController.frameTimeElement = document.getElementById("frameTime");
    playbackController.frameNumberElement = document.getElementById("frameNumber");
    playbackController.paused = false;
    playbackController.step = false;
    playbackController.fixedFrameRate = true;

    playbackController.xhrPool = [];
    playbackController.msPerFrame = [];
    playbackController.metricsPerFrame = [];
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
