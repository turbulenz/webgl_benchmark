//
// PlaybackController - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/
/*global RequestHandler: false*/
/*global UserDataManager: false*/
/*global TurbulenzServices: false*/

function PlaybackController() {}

PlaybackController.prototype =
{

    init : function playbackcontrollerInitFn(prefixAssetURL, prefixCaptureURL, prefixTemplatesURL)
    {
        this.prefixAssetURL = prefixAssetURL;
        this.prefixCaptureURL = prefixCaptureURL;
        this.prefixTemplatesURL = prefixTemplatesURL;
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

    _isSupportedTemplate : function _isSupportedTemplateFn(template)
    {
        // Only support version 0
        return (template.version === 0);
    },

    loadAssets : function playbackcontrollerLoadAssetsFn()
    {
        var g;
        for (g = 0; g < this.numGroups; g += 1)
        {
            this._requestData(g);
        }
    },

    getLoadingProgress : function playbackcontrollerGetLoadingProgressFn()
    {
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

    abort : function playbackControllerAbortFn()
    {
        this.aborted = true;
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

            if (!this.addingResources && !this.loadingResources && !this.loadingTemplates)
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
                    this.previousFrameTime = TurbulenzEngine.getTime();
                    this.playbackStart = TurbulenzEngine.getTime();
                    this.streamStats = {};
                    this.resultsData = {};
                    this.playbackConfig = {};
                    this.streamStats.startTime = (new Date().getTime());
                    return;
                }

                var frameStart = TurbulenzEngine.getTime();
                playbackGraphicsDevice.play(this.relativeFrameIndex);
                var dispatchTime = TurbulenzEngine.getTime() - frameStart;

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
                        this.msDispatchPerFrame[this.msDispatchPerFrame.length] = dispatchTime;

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

                        if ((this.currentGroupIndex + 1) < this.numGroups && !this.aborted)
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

                            var streamStats = this.streamStats;
                            streamStats.playDuration = recordingTime;
                            streamStats.frameCount = this.framesRendered;
                            streamStats.averageFps = this.framesRendered / recordingTime;
                            streamStats.endTime = (new Date().getTime());

                            var playbackConfig = this.playbackConfig;
                            playbackConfig.canvasWidth = graphicsDevice.width;
                            playbackConfig.canvasHeight = graphicsDevice.height;
                            playbackConfig.playWidth = this.playbackGraphicsDevice.playWidth;
                            playbackConfig.playHeight = this.playbackGraphicsDevice.playHeight;
                            playbackConfig.multisample = this.multisample;
                            playbackConfig.antialias = this.antialias;
                            playbackConfig.fixedFrameRate = this.fixedFrameRate;

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

    generateUserData : function generateUserDataFn(resultsData)
    {
        // Parse when new template is required
        var userDataResult = this.resultsTemplateData;
        if (!userDataResult)
        {
            return null;
        }

        if (!userDataResult.config.hardware.name)
        {
            var hardwareName = "";
            while (!hardwareName)
            {
                hardwareName = window.prompt("Please specify a name for this hardware (e.g. Frank's Laptop, Quad-core Desktop)");
            }
            userDataResult.config.hardware.name = hardwareName;
        }

        // Add config
        userDataResult.config.playback = this.playbackConfig;
        this.playbackConfig = {};

        //TODO: Add browser config

        //TODO: Add online hardware config

        // Add data
        var framesData = {};

        var timingData = resultsData.timing.obj;
        var metricsData = null;
        if (resultsData.metrics && resultsData.metrics.obj)
        {
            metricsData = resultsData.metrics.obj;
        }

        for (var t in timingData)
        {
            if (timingData.hasOwnProperty(t))
            {
                framesData[t] = timingData[t];
            }
        }
        if (metricsData)
        {
            for (var m in metricsData)
            {
                if (timingData.hasOwnProperty(m))
                {
                    framesData[t] = timingData[m];
                }
            }
        }

        framesData.indices = resultsData.frameIndices;

        var testsData = [];
        var testStats = resultsData.testStats;
        var testStatCount = testStats.length;
        for (var i = 0; i < testStatCount; i += 1)
        {
            testsData.push({
                stats: testStats[i]
            });
        }

        //TODO: Multiple streams and tests
        userDataResult.data.sequences = [{
            streams: [{
                frames: framesData,
                stats: resultsData.streamStats,
                tests: testsData
            }]
        }];

        return userDataResult;
    },

    processData : function playbackControllerProcessDataFn()
    {
        if (this.dataProcessed)
        {
            return this.resultsData;
        }

        var resultsData = this.resultsData;

        var frameCount = 0;
        var frameIndices = [];
        var timingData = {
            msPerFrame: [],
            msDispatchPerFrame: [],
            averageMsPerFrame: [],
            averageMsPerDispatch: []
        };
        var timingDataCSV = 'msPerFrame,msDispatchPerFrame,averageMsPerFrame,averageMsPerDispatch\n';
        var msPerFrame = this.msPerFrame;
        if (msPerFrame.length > 0)
        {
            var msDispatchPerFrame = this.msDispatchPerFrame;
            var msPerFrameLength = msPerFrame.length;
            var averageFrameMs = 0;
            var newAverageFrameMs = 0;
            var averageDispatchMs = 0;
            var newAverageDispatchMs = 0;
            var maxFrameMs = -1;
            var minFrameMs = -1;
            var maxDispatchMs = -1;
            var minDispatchMs = -1;
            var i;
            for (i = 0; i < msPerFrameLength; i += 1)
            {
                if (i % 60 === 0)
                {
                    averageFrameMs = newAverageFrameMs;
                    averageDispatchMs = newAverageDispatchMs;
                    newAverageFrameMs = 0;
                    newAverageDispatchMs = 0;
                }
                newAverageFrameMs += msPerFrame[i] / 60.0;
                newAverageDispatchMs += msDispatchPerFrame[i] / 60.0;

                if (maxFrameMs === -1)
                {
                    maxFrameMs = msPerFrame[i];
                }
                else if (msPerFrame[i] > maxFrameMs)
                {
                    maxFrameMs = msPerFrame[i];
                }

                if (minFrameMs === -1)
                {
                    minFrameMs = msPerFrame[i];
                }
                else if (msPerFrame[i] < minFrameMs)
                {
                    minFrameMs = msPerFrame[i];
                }

                if (maxDispatchMs === -1)
                {
                    maxDispatchMs = msDispatchPerFrame[i];
                }
                else if (msDispatchPerFrame[i] > maxDispatchMs)
                {
                    maxDispatchMs = msDispatchPerFrame[i];
                }

                if (minDispatchMs === -1)
                {
                    minDispatchMs = msDispatchPerFrame[i];
                }
                else if (msDispatchPerFrame[i] < minDispatchMs)
                {
                    minDispatchMs = msDispatchPerFrame[i];
                }

                timingDataCSV +=    msPerFrame[i] + ',' +
                                    msDispatchPerFrame[i] + ',' +
                                    averageFrameMs + ',' +
                                    averageDispatchMs +
                                    '\n';
                timingData.averageMsPerFrame.push(averageFrameMs);
                timingData.averageMsPerDispatch.push(averageDispatchMs);

                //TODO: Calculate frameIndices for skipped/repeated frames
                frameIndices.push(frameCount);
                frameCount += 1;
            }

            var streamStats = this.streamStats;
            streamStats.maxFrameMs = maxFrameMs;
            streamStats.minFrameMs = minFrameMs;
            streamStats.maxDispatchMs = maxDispatchMs;
            streamStats.minDispatchMs = minDispatchMs;

            timingData.msPerFrame = this.msPerFrame;
            timingData.msDispatchPerFrame = this.msDispatchPerFrame;

            resultsData.timing = {
                csv: timingDataCSV,
                obj: timingData
            };

            this.msPerFrame = [];
            this.msDispatchPerFrame = [];

            var metricsData = {};
            var metricsPerFrame = this.metricsPerFrame;
            if (metricsPerFrame)
            {
                var metricsDataCSV = '';
                var metricsFields = this.metricsFields;
                var p;
                for (p in metricsFields)
                {
                    if (metricsFields.hasOwnProperty(p))
                    {
                        metricsDataCSV += p + ',';
                        metricsData[p] = [];
                    }
                }
                metricsDataCSV += '\n';
                var metricsPerFrameLength = metricsPerFrame.length;
                for (i = 0; i < metricsPerFrameLength; i += 1)
                {
                    var frameMetrics = metricsPerFrame[i];
                    for (p in metricsFields)
                    {
                        if (metricsFields.hasOwnProperty(p))
                        {
                            metricsDataCSV += frameMetrics[p] + ',';
                            metricsData[p].push(frameMetrics[p]);
                        }
                    }
                    metricsDataCSV += '\n';
                }

                resultsData.metrics = {
                    csv: metricsDataCSV,
                    obj: metricsData
                };

                this.metricsPerFrame = [];
            }
        }

        resultsData.frameIndices = frameIndices;
        resultsData.streamStats = this.streamStats;
        this.streamStats = {};

        // Same as sequence results
        //TODO: Seperate tests out as seperate data
        resultsData.testStats = [resultsData.streamStats];

        this.resultsData = resultsData;
        this.resultsData.userData = this.generateUserData(resultsData);
        this.dataProcessed = true;

        return this.resultsData;
    },

    loadResults : function playbackControllerloadResultsFn(resultLoadedCallback)
    {
        //TODO: Can only read from userdata
        var that = this;
        var resultLoadedCallbackFn = resultLoadedCallback;
        function getKeysErrorFn()
        {
            window.alert('Could not read existing data');
            that.loadingResults = false;
        }
        function generateGetResultsErrorFn(keyName)
        {
            var key = keyName;
            return function getResultsErrorFn()
            {
                delete that.resultsToLoad[key];
                if (that.loadingResults)
                {
                    window.alert('Could not read data for: ' + key);
                }
            };
        }
        that.savedResults = [];
        that.resultsToLoad = {};

        function getResultsCallbackFn(key, value)
        {
            var resultsToLoad = that.resultsToLoad;
            delete resultsToLoad[key];

            if (!that.loadingResults)
            {
                return;
            }

            var resultsData;
            try {
                resultsData = JSON.parse(value);
            }
            catch (e)
            {
                window.alert('Could not parse data for: ' + key);
                return;
            }
            that.savedResults.push(resultsData);

            var remainingResults = 0;
            for (var r in resultsToLoad)
            {
                if (resultsToLoad.hasOwnProperty(r))
                {
                    remainingResults += 1;
                }
            }
            that.loadingResults = remainingResults > 0;
            resultLoadedCallbackFn(resultsData);
        }

        function getKeysCallbackFn(keyArray)
        {
            if (!that.loadingResults)
            {
                return;
            }

            var keyArrayLength = keyArray.length;
            for (var i = 0; i < keyArrayLength; i += 1)
            {
                var key = keyArray[i];
                that.userDataManager.get(key, getResultsCallbackFn, generateGetResultsErrorFn(key));
                that.resultsToLoad[key] = true;
            }
        }

        var userDataManager = this.userDataManager;
        if (userDataManager)
        {
            userDataManager.getKeys(getKeysCallbackFn, getKeysErrorFn);
            this.loadingResults = true;
        }
        return this.loadingResults;
    },

    cancelLoadResults : function cancelLoadResultsFn()
    {
        this.loadingResults = false;
    },

    outputData : function playbackcontrollerOutputDataFn(testName)
    {
        var browserTestPath = window.prompt('Save recording data in:', '');
        if (!browserTestPath)
        {
            return;
        }

        var timestamp = (new Date()).getTime();
        var filename = browserTestPath + '/' + timestamp;

        var resultsData = this.processData();
        if (resultsData.timing && resultsData.timing.csv)
        {
            this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '-timing.csv', resultsData.timing.csv);
        }

        if (resultsData.metrics && resultsData.metrics.csv)
        {
            this.postData('/local/v1/save/webgl-benchmark/data/' + testName + '-metrics.csv', resultsData.metrics.csv);
        }

        if (resultsData.userData)
        {
            this.postData('/local/v1/save/webgl-benchmark/data/' + filename + '-results.json', JSON.stringify(resultsData.userData));
        }

        var that = this;
        function getKeysErrorFn()
        {
            window.alert('Could not read existing data');
        }

        function setResultsErrorFn()
        {
            window.alert('Could not save data');
        }

        function setResultsCallbackFn(/*key*/)
        {
            //TODO: Confirm save for user
        }

        function generateGetKeysCallbackFn(timestamp, resultsData)
        {
            var data = resultsData;
            return function getKeysCallbackFn(keyArray)
            {
                var overwrite = false;
                var resultExists = false;
                var resultsKey = timestamp + '-results';
                var keyArrayLength = keyArray.length;
                for (var i = 0; i < keyArrayLength; i += 1)
                {
                    var key = keyArray[i];
                    if (key === resultsKey)
                    {
                        resultExists = true;
                        var result = window.confirm("Data already exists with this name. Would you like to overwrite?");
                        if (result)
                        {
                            overwrite = true;
                        }
                    }
                }

                if (!resultExists || (resultExists && overwrite))
                {
                    that.userDataManager.set(resultsKey, JSON.stringify(data.userData), setResultsCallbackFn, setResultsErrorFn);
                }
            };
        }

        var userDataManager = this.userDataManager;
        if (userDataManager)
        {
            if (resultsData.userData)
            {
                userDataManager.getKeys(generateGetKeysCallbackFn(timestamp, resultsData), getKeysErrorFn);
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

        var gameSession = this.gameSession;
        if (gameSession)
        {
            gameSession.destroy();
            this.gameSession = null;
        }
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
    playbackController.prefixTemplatesURL = null;

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
    playbackController.loadingTemplates = true;
    playbackController.loadingResults = false;
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
    playbackController.msDispatchPerFrame = [];

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

    playbackController.playbackConfig = {};

    playbackController.resultsData = null;
    playbackController.dataProcessed = false;

    playbackController.resultsTemplateData = null;
    playbackController.aborted = false;
    playbackController.multisample = -1;
    playbackController.antialias = false;

    var requestHandlerParameters = {};
    var requestHandler = RequestHandler.create(requestHandlerParameters);

    playbackController.gameSession = null;
    playbackController.userDataManager = null;

    playbackController.mappingTable = null;

    var mappingTableErrorFn = function mappingTableErrorFn()
    {
        window.alert("Mapping table is missing. Cannot save data.");
        playbackController.resultsTemplateData = null;
        playbackController.loadingTemplates = false;
    };

    var mappingTableReceived = function mappingTableReceivedFn(mappingTable) {

        function templateLoaded(responseText, status)
        {
            if (responseText && status === 200)
            {
                try {
                    playbackController.resultsTemplateData = JSON.parse(responseText);
                    if (!playbackController.resultsTemplateData)
                    {
                        window.alert("Results template is empty. Cannot save data.");
                        playbackController.resultsTemplateData = null;
                    }
                    else if (!playbackController._isSupportedTemplate(playbackController.resultsTemplateData))
                    {
                        window.alert("Results template is incompatible. Cannot save data.");
                        playbackController.resultsTemplateData = null;
                    }
                    playbackController.loadingTemplates = false;
                }
                catch (e)
                {
                    window.alert("Failed to parse results template: " + templateRequest + " with message: " + e);
                }
            }
            else
            {
                window.alert("Results template is missing: " + templateRequest + ". Cannot save data.");
                playbackController.resultsTemplateData = null;
                playbackController.loadingTemplates = false;
                return;
            }
        }

        var templateRequest = playbackController.prefixTemplatesURL + playbackController.config.resultsTemplate + '.json';
        TurbulenzEngine.request(mappingTable.getURL(templateRequest), templateLoaded);
    };

    var gameSessionCreated = function gameSessionCreatedFn(gameSession)
    {
        playbackController.mappingTable = TurbulenzServices.createMappingTable(requestHandler, gameSession, mappingTableReceived, null, mappingTableErrorFn);
        playbackController.userDataManager = UserDataManager.create(requestHandler, gameSession);
    };

    var gameSessionError = function gameSessionErrorFn()
    {
        var gameSession = playbackController.gameSession;
        if (gameSession)
        {
            gameSession.destroy();
            playbackController.gameSession = null;
        }
        playbackController.userDataManager = null;
    };

    playbackController.gameSession = TurbulenzServices.createGameSession(requestHandler, gameSessionCreated, gameSessionError);

    return playbackController;
};
