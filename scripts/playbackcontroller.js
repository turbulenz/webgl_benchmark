//
// PlaybackController - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/
/*global UserDataManager: false*/
/*global TurbulenzServices: false*/
/*global Utilities: false*/
/*global FontManager: false*/
/*global ShaderManager: false*/

function PlaybackController() {}

PlaybackController.prototype =
{

    init : function playbackcontrollerInitFn(prefixAssetURL, prefixCaptureURL, prefixTemplatesURL, sequenceList)
    {
        this.prefixAssetURL = prefixAssetURL;
        this.prefixCaptureURL = prefixCaptureURL;
        this.prefixTemplatesURL = prefixTemplatesURL;
        this.testRanges = {};
        if (!sequenceList)
        {
            Utilities.log("Sequence information is required to playback");
            return false;
        }
        if (!this._processSequenceList(sequenceList))
        {
            Utilities.log("Sequence information could not be processed");
            return false;
        }
        this.loadAssets();
        this.resultsData = {};
        return true;
    },

    _processSubTests: function playbackcontrollerProcessSubTestsFn(subTests, tests, testID)
    {
        var length = subTests.length;
        var subTest;
        var testsData = this.testsData;
        var stats;
        for (var i = 0; i < length; i += 1)
        {
            stats = {};
            subTest = tests[subTests[i]];
            if (subTest)
            {
                this.testRanges[subTests[i]] = {
                    name: subTest.name,
                    range: [
                        subTest.startFrame,
                        subTest.endFrame ? subTest.endFrame: subTest.lastFrame
                    ],
                    stats: stats,
                    started: false,
                    ended: false
                };
            }

            testsData.push({
                name: subTests[i],
                id: testID + '-' + i,
                stats: stats
            });
        }
        this.testMeta = tests;
    },

    _postFrame: function postFrameFn(frameIndex)
    {
        var testRange;
        var testRanges = this.testRanges;
        var testsActive = this.testsActive;
        var testScore, scoreText, stats, maxFrameMs, minFrameMs, maxDispatchMs, minDispatchMs;
        testsActive.length = 0;

        var i, length;

        var msPerFrame = this.msPerFrame;
        var msDispatchPerFrame = this.msDispatchPerFrame;
        for (var t in testRanges)
        {
            if (testRanges.hasOwnProperty(t))
            {
                testRange = this.testRanges[t];
                stats = testRange.stats;
                if (frameIndex >= testRange.range[0] && frameIndex <= testRange.range[1])
                {
                    testsActive[testsActive.length] = testRange.name;
                    if (!testRange.started)
                    {
                        stats.startTime = (new Date().getTime());
                        stats.frameCount = 1;
                        testRange.testStart = TurbulenzEngine.getTime();
                        testRange.started = true;
                    }
                    else
                    {
                        stats.frameCount += 1;
                    }
                }
                else
                {
                    if (testRange.started && !testRange.ended)
                    {
                        stats.endTime = (new Date().getTime());
                        stats.playDuration = (TurbulenzEngine.getTime() - testRange.testStart) / 1000;
                        stats.averageFps = stats.frameCount / stats.playDuration;

                        maxFrameMs = -1;
                        minFrameMs = -1;
                        maxDispatchMs = -1;
                        minDispatchMs = -1;

                        for (i = testRange.range[0]; i <= testRange.range[1]; i += 1)
                        {
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
                        }

                        stats.maxFrameMs = maxFrameMs;
                        stats.minFrameMs = minFrameMs;
                        stats.maxDispatchMs = maxDispatchMs;
                        stats.minDispatchMs = minDispatchMs;
                        testRange.ended = true;
                    }
                }
            }
        }

        var textParameters = this.textParameters;
        var font = this.font;
        var rect = textParameters.rect;
        if (!font)
        {
            font = this.font = this.fontManager.get(this.fontName);
        }
        textParameters.scale = 1.0;

        var textTechniqueParameters = this.textTechniqueParameters;
        var graphicsDevice = this.graphicsDevice;
        graphicsDevice.setScissor(0, 0, graphicsDevice.width, graphicsDevice.height);
        graphicsDevice.setViewport(0, 0, graphicsDevice.width, graphicsDevice.height);
        graphicsDevice.setTechnique(this.textTechnique);
        this.mathDevice.v4Build(2 / graphicsDevice.width, -2 / graphicsDevice.height,
                                -1, 1,
                                textTechniqueParameters.clipSpace);
        graphicsDevice.setTechniqueParameters(textTechniqueParameters);

        length = testsActive.length;
        var text, textDimensions;
        for (i = 0; i < length; i += 1)
        {
            text = testsActive[i];
            textDimensions = this.textDimensions = font.calculateTextDimensions(text, 1, 0, 0, this.textDimensions);
            rect[0] = 10;
            rect[1] = graphicsDevice.height - ((i + 1) * textDimensions.height) - 10;
            rect[2] = textDimensions.width;
            rect[3] = textDimensions.height;
            font.drawTextRect(text, textParameters);
        }

        if (this.atEnd)
        {
            i = 0;
            var testScores = this.testScores;
            var totalScore = 0;
            var testTotalIgnores = this.testTotalIgnores || [];
            var textTop = 10;
            var testScoreInt;
            for (t in testScores)
            {
                if (testScores.hasOwnProperty(t))
                {
                    testScore = testScores[t];
                    testScoreInt = Math.floor(testScore.score);
                    if (testTotalIgnores.indexOf(t) === -1)
                    {
                        totalScore += testScoreInt;
                    }

                    scoreText = testScoreInt + (!testScore.complete ? " (Incomplete, Accuracy: " + Math.floor(testScore.completeRatio * 100) + "%)": "");
                    if (testScore.completeRatio === 0.0)
                    {
                        scoreText = "Not started";
                    }
                    text = testScore.name + ": " + scoreText;
                    textDimensions = this.textDimensions = font.calculateTextDimensions(text, 1, 0, 0, this.textDimensions);
                    rect[0] = (graphicsDevice.width / 2) - (textDimensions.width / 2);
                    rect[1] = textTop;
                    rect[2] = textDimensions.width;
                    rect[3] = textDimensions.height;
                    font.drawTextRect(text, textParameters);
                    textTop += textDimensions.height;
                    i += 1;
                }
            }

            textParameters.scale = 2.0;
            text = "Total: " + totalScore;
            textDimensions = this.textDimensions = font.calculateTextDimensions(text, textParameters.scale, 0, 0, this.textDimensions);
            rect[0] = (graphicsDevice.width / 2) - (textDimensions.width / 2);
            rect[1] = textTop + textDimensions.height;
            rect[2] = textDimensions.width;
            rect[3] = textDimensions.height;
            font.drawTextRect(text, textParameters);
        }
    },

    _processScores: function playbackControllerProcessScores()
    {
        var testsData = this.testsData;
        var testRanges = this.testRanges;
        var testRange, startFrame, endFrame, incompleteTest, framesProcessed, testData;
        var t, i, length;

        var frameRate = 60;
        var timePerFrame = (1 / frameRate) * 1000;
        var scorePerSecond = 1000 / 30; // 1000pts for every 30 seconds of test
        var scorePerFrame = (scorePerSecond) / frameRate;
        var totalMs, baseScore, targetMs, testScore;

        var msPerFrame = this.msPerFrame;
        var testScores = {};
        for (t in testRanges)
        {
            if (testRanges.hasOwnProperty(t))
            {
                totalMs = 0;
                testRange = testRanges[t];
                startFrame = testRange.range[0];
                endFrame = testRange.range[1];
                length = endFrame - startFrame + 1;
                incompleteTest = false;

                baseScore = scorePerFrame * length;

                framesProcessed = 0;

                for (i = startFrame; i <= endFrame; i += 1)
                {
                    if (msPerFrame[i] !== undefined)
                    {
                        totalMs += msPerFrame[i];
                        framesProcessed += 1;
                    }
                    else
                    {
                        incompleteTest = true;
                    }
                }

                targetMs = timePerFrame * framesProcessed;

                if (totalMs > 0)
                {
                    testScore = baseScore * (targetMs / totalMs);
                }
                else
                {
                    testScore = 0;
                }

                testScores[t] = {
                    name: testRange.name,
                    complete: true,
                    totalTimeMs: totalMs,
                    score: testScore,
                    completeRatio: 1.0
                };
                if (incompleteTest)
                {
                    testScores[t].complete = false;
                    testScores[t].completeRatio = framesProcessed / length;
                }

                length = testsData.length;
                for (i = 0; i < length; i += 1)
                {
                    testData = testsData[i];
                    if (testData.name === t)
                    {
                        testData.score = testScores[t];
                    }
                }
            }
        }
        this.testScores = testScores;
    },

    _processSequenceList: function playbackcontrollerProcessSequenceList(sequenceList)
    {
        var sequence, stream, test, streamMeta, testMeta, stats;
        var numTotalFrames, numFramesPerGroup, numGroups;
        var i, iLen, j, jLen, k, kLen;
        iLen = sequenceList.length;

        for (i = 0; i < iLen; i += 1)
        {
            sequence = sequenceList[i];
            jLen = sequence.streams.length;
            for (j = 0; j < jLen; j += 1)
            {
                stream = sequence.streams[j];
                streamMeta = stream.meta;
                if (stream.meta && stream.id)
                {
                    this.streamMeta[stream.id] = stream.meta;
                }

                if (streamMeta)
                {
                    numTotalFrames = this.numTotalFrames = streamMeta.totalLength;
                    numFramesPerGroup = this.numFramesPerGroup = streamMeta.groupLength;
                    // Total groups for all stream data
                    numGroups = this.numGroups = Math.ceil(numTotalFrames / numFramesPerGroup);
                }

                kLen = stream.tests.length;
                for (k = 0; k < kLen; k += 1)
                {
                    test = stream.tests[k];

                    if (streamMeta && streamMeta.tests)
                    {
                        testMeta = streamMeta.tests[test.name];

                        stats = {};
                        this.testsData = [{
                            id: test.id,
                            name: test.name,
                            stats: stats
                        }];

                        this.testRanges[test.name] = {
                            name: testMeta.name,
                            range: [
                                testMeta.startFrame,
                                testMeta.endFrame ? testMeta.endFrame: testMeta.lastFrame
                            ],
                            stats: stats,
                            started: false,
                            ended: false
                        };
                        this.testTotalIgnores = [test.name];

                        if (testMeta.subTests)
                        {
                            this._processSubTests(testMeta.subTests, streamMeta.tests, test.id);
                        }
                    }

                    if (testMeta)
                    {
                        var testEndFrame = testMeta.endFrame ? testMeta.endFrame: testMeta.lastFrame;
                        numGroups = this.numGroups = Math.ceil(testEndFrame / numFramesPerGroup) + this.additionalGroups;
                    }
                }
            }
        }
        this.sequenceList = sequenceList;
        return true;
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

        var resourcesLoaded = function resourcesLoadedFn(responseText, status)
        {
            if (status === 200)
            {
                group.resources = JSON.parse(responseText);
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
            }
        };

        var dataLoaded = function dataLoadedFn(responseAsset, status)
        {
            if (status === 200)
            {
                group.data = responseAsset;
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
            }
        };

        var framesLoaded = function framesLoadedFn(responseText, status)
        {
            if (status === 200)
            {
                group.frames = JSON.parse(responseText);
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
            }
        };

        var rangeString = '-' + (groupIndex * this.numFramesPerGroup) +
                          '-' + (((groupIndex + 1) * this.numFramesPerGroup) - 1);

        this.requestHandler.request({
            src: this.prefixCaptureURL + 'resources' + rangeString + '.json',
            onload: resourcesLoaded
        });

        this.requestHandler.request({
            src: this.prefixCaptureURL + 'data' + rangeString + '.bin',
            requestFn: function requestFn(src, onResponse) {
                var xhr = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));

                function xhrResponse()
                {
                    if (xhr.readyState === 4)
                    {
                        var responseAsset = xhr.response;
                        var status = xhr.status;
                        if (!TurbulenzServices.available() && responseAsset)
                        {
                            status = 200;
                        }
                        xhr.onreadystatechange = null;
                        xhr.responseText = null;
                        xhr = null;

                        onResponse(responseAsset, status);
                    }
                }

                xhr.open('GET', src, true);
                xhr.responseType = 'arraybuffer';
                xhr.onreadystatechange = xhrResponse;
                xhr.send();
            },
            onload: dataLoaded
        });

        this.requestHandler.request({
            src: this.prefixCaptureURL + 'frames' + rangeString + '.json',
            onload: framesLoaded
        });

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
        return (this.numCaptureDataLoaded + this.numAppResourcesLoaded) / (this.numCaptureData + this.numAppResources);
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
        if (group && group.ready)
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

                this._postFrame(((this.currentGroupIndex * this.numFramesPerGroup) + this.relativeFrameIndex));

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

                var frameTimeElement = this.frameTimeElement;
                if (frameTimeElement)
                {
                    frameTimeElement.textContent = frameTime.toFixed(1) + ' ms';
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
                    var elements = this.elements;

                    var averageFrameTimeElement = elements.averageFrameTime;
                    if (averageFrameTimeElement)
                    {
                        averageFrameTimeElement.textContent = this.averageFrameTime.toFixed(1) + ' ms';
                    }

                    var timeElement = elements.time;
                    if (timeElement)
                    {
                        timeElement.textContent = recordingTime.toFixed(2) + ' s';
                    }

                    var framesRenderedElement = elements.framesRendered;
                    if (framesRenderedElement)
                    {
                        framesRenderedElement.textContent = this.framesRendered.toString();
                    }

                    var averageFpsElement = elements.averageFps;
                    if (averageFpsElement)
                    {
                        averageFpsElement.textContent = (this.framesRendered / recordingTime).toFixed(2);
                    }

                    var frameNumberElement = elements.frameNumber;
                    if (frameNumberElement)
                    {
                        frameNumberElement.textContent =
                            ((this.currentGroupIndex * this.numFramesPerGroup) + this.relativeFrameIndex).toString();
                    }

                    var resolutionElement = elements.resolution;
                    if (resolutionElement)
                    {
                        resolutionElement.textContent = this.playbackGraphicsDevice.playWidth.toString() + ' x ' +
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

                            this._processScores();

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
            userDataResult.config.hardware.name = this.defaultHardwareName;
        }

        // Add config
        userDataResult.config.playback = this.playbackConfig;
        this.playbackConfig = {};

        //TODO: Add browser config

        //TODO: Add online hardware config

        var sequences = userDataResult.config.sequences;
        if (sequences.length === 0)
        {
            userDataResult.config.sequences = this.sequenceList;
            this.sequenceList = [];
        }

        userDataResult.config.streams = this.streamMeta;
        this.streamMeta = {};

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

        var testsData = resultsData.testsData;

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

        resultsData.testsData = this.testsData;

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

    outputData : function playbackcontrollerOutputDataFn(testName, downloadFormat)
    {
        var resultsData = this.processData();
        if (!resultsData.userData)
        {
            window.alert("No results to save");
            return;
        }

        var hardwareName = resultsData.userData.config.hardware.name;
        if (this.config.promptHardwareName && (hardwareName === this.defaultHardwareName))
        {
            hardwareName = window.prompt("Please specify a name for this hardware (e.g. Frank's Laptop, Quad-core Desktop)");
            if (!hardwareName)
            {
                return;
            }
            resultsData.userData.config.hardware.name = hardwareName;
        }
        else if (!hardwareName)
        {
            resultsData.userData.config.hardware.name = hardwareName = this.defaultHardwareName;
        }

        var filePath = hardwareName.replace(/[^a-zA-Z0-9 ]/g, '-').toLowerCase().replace(/ /g, '_');

        var timestamp = (new Date()).getTime();
        var filename = filePath + '/' + timestamp;

        var domain = '';
        if (!TurbulenzServices.available())
        {
            // try to make requests to a local server if it is running
            domain = 'http://127.0.0.1:8070';
        }

        function postSuccessFn()
        {
            window.alert('Saved results');
        }

        function postFailedFn(request)
        {
            window.alert('Saving result failed: ' + request);
        }

        function generatePostCallbackFn(postRequest, requests)
        {
            var requestList = requests;
            var request = postRequest;
            return function postCallbackFn(success)
            {
                if (!success)
                {
                    postFailedFn(request);
                }
                else
                {
                    delete requestList[request];
                }

                var remainingRequests = 0;
                for (var r in requestList)
                {
                    if (requestList.hasOwnProperty(r))
                    {
                        remainingRequests += 1;
                    }
                }

                if (remainingRequests === 0)
                {
                    postSuccessFn();
                }
            };
        }

        var postRequest;
        var requests = {};
        if (!downloadFormat && this.config.useSaveAPI)
        {
            if (resultsData.timing && resultsData.timing.csv)
            {
                postRequest = domain + '/local/v1/save/webgl-benchmark/data/' + filename + '-timing.csv';
                requests[postRequest] = resultsData.timing.csv;
            }

            if (resultsData.metrics && resultsData.metrics.csv)
            {
                postRequest = domain + '/local/v1/save/webgl-benchmark/data/' + testName + '-metrics.csv';
                requests[postRequest] = resultsData.metrics.csv;
            }

            if (resultsData.userData)
            {
                postRequest = domain + '/local/v1/save/webgl-benchmark/data/' + filename + '-results.json';
                requests[postRequest] = JSON.stringify(resultsData.userData);
            }

            for (var r in requests)
            {
                if (requests.hasOwnProperty(r))
                {
                    this.postData(r, requests[r], generatePostCallbackFn(r, requests));
                }
            }
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
            window.alert('Saved results');
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
            if (resultsData.userData && !downloadFormat)
            {
                userDataManager.getKeys(generateGetKeysCallbackFn(timestamp, resultsData), getKeysErrorFn);
            }
        }

        if (downloadFormat === "CSV")
        {
            if (resultsData.timing && resultsData.timing.csv)
            {
                this.downloadData(filePath + '-' + timestamp + '-timing.csv', resultsData.timing.csv);
            }
            else
            {
                window.alert("No timing data to download");
            }
        }
        else if (downloadFormat !== undefined)
        {
            window.alert("Download format not recognized");
        }
    },

    downloadData : function playbackRecorderDownloadData(filename, data)
    {
        window.URL = window.URL || window.webkitURL;

        if (window.URL.createObjectURL)
        {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': 'application\/octet-stream'});
            a.href = window.URL.createObjectURL(blob);
            a.download = filename;
            a.click();
        }
        else
        {
            // Fallback to generate the data with no filename
            document.location = 'data:Application/octet-stream,' +
                         encodeURIComponent(data);
        }

    },

    postData : function playbackRecorderPostData(url, dataString, callbackFn)
    {
        var onLoad = function onLoadFn(response, status /*, callContext*/)
        {
            callbackFn(status === 200);
        };

        var params =
        {
            url: url,
            requestHandler: this.requestHandler,
            method:  'POST',
            callback: onLoad,
            data: { content : dataString }
        };

        Utilities.ajax(params);
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

PlaybackController.create = function playbackControllerCreateFn(config, params)
{
    var playbackController = new PlaybackController();
    var mathDevice = playbackController.mathDevice = params.mathDevice;
    var graphicsDevice = playbackController.graphicsDevice = params.graphicsDevice;
    var requestHandler = playbackController.requestHandler = params.requestHandler;
    var shaderManager = playbackController.shaderManager = params.shaderManager || ShaderManager.create(graphicsDevice, requestHandler);
    var fontManager = playbackController.fontManager = params.fontManager || FontManager.create(graphicsDevice, requestHandler);
    var elements = params.elements;
    playbackController.config = config;

    playbackController.playbackGraphicsDevice = PlaybackGraphicsDevice.create(graphicsDevice);

    playbackController.playbackGraphicsDevice.onerror = function (msg)
    {
        window.alert(msg);
    };

    playbackController.prefixAssetURL = params.prefixAssetURL || null;
    playbackController.prefixCaptureURL = params.prefixCaptureURL || null;
    playbackController.prefixTemplatesURL = params.prefixTemplatesURL || null;

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
    playbackController.defaultHardwareName = "Unspecified";
    playbackController.additionalGroups = 1; // The number of additional groups to add post the end of the tests to act as padding

    playbackController.step = false;

    playbackController.numCaptureData = 0;
    playbackController.numCaptureDataLoaded = 0;

    playbackController.numAppResources = 0;
    playbackController.numAppResourcesLoaded = 0;
    playbackController.loadingAppResources = true;

    playbackController.previousFrameTime = 0;
    playbackController.atEnd = false;

    playbackController.elements = elements;
    playbackController.framesRenderedElement = elements.framesRendered;
    playbackController.timeElement = elements.time;
    playbackController.frameTimeElement = elements.frameTime;
    playbackController.averageFrameTimeElement = elements.averageFrameTime;
    playbackController.frameNumberElement = elements.frameNumber;
    playbackController.resolutionElement = elements.resolution;
    playbackController.averageFpsElement = elements.averageFps;

    playbackController.paused = false;
    playbackController.pauseStart = null;
    playbackController.fixedFrameRate = config.fixedFrameRate;

    playbackController.xhrPool = [];
    playbackController.msPerFrame = [];
    playbackController.msDispatchPerFrame = [];
    playbackController.testRanges = {};
    playbackController.testsActive = [];

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
    playbackController.streamMeta = {};
    playbackController.sequenceList = [];
    playbackController.fontName = "fonts/opensans-32.fnt";
    playbackController.fontShaderName = "shaders/font.cgfx";
    playbackController.textTechnique = null;
    playbackController.textTechniqueParameters = null;
    playbackController.textTechniqueName = "font";
    playbackController.textTechniqueParameters = graphicsDevice.createTechniqueParameters({
        clipSpace : mathDevice.v4BuildZero(),
        alphaRef : 0.01,
        color : mathDevice.v4BuildOne()
    });
    playbackController.textParameters = {
        rect: [0, 0, 10, 10]
    };

    playbackController.resultsData = {};
    playbackController.dataProcessed = false;

    playbackController.resultsTemplateData = null;
    playbackController.aborted = false;
    playbackController.multisample = -1;
    playbackController.antialias = false;

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

        fontManager.setPathRemapping(mappingTable.urlMapping, mappingTable.assetPrefix);
        fontManager.load(playbackController.fontName, function onloadFn(/*font*/) {
            playbackController.numAppResourcesLoaded += 1;

            if (playbackController.numAppResourcesLoaded - playbackController.numAppResources === 0)
            {
                playbackController.loadingAppResources = false;
            }
        });
        playbackController.numAppResources += fontManager.getNumPendingFonts();

        shaderManager.setPathRemapping(mappingTable.urlMapping, mappingTable.assetPrefix);
        shaderManager.load(playbackController.fontShaderName, function onLoadFn(shader) {
            playbackController.numAppResourcesLoaded += 1;

            if (shader)
            {
                playbackController.textTechnique = shader.getTechnique(playbackController.textTechniqueName);
            }

            if (playbackController.numAppResourcesLoaded - playbackController.numAppResources === 0)
            {
                playbackController.loadingAppResources = false;
            }
        });
        playbackController.numAppResources += 1;

        var templateRequest = playbackController.prefixTemplatesURL + playbackController.config.resultsTemplate + '.json';

        function retryTemplateOnFail(responseText, status)
        {
            if (responseText && status === 200)
            {
                templateLoaded(responseText, status);
            }
            else
            {
                TurbulenzEngine.request(mappingTable.getURL(templateRequest), templateLoaded);
            }
        }

        TurbulenzEngine.request(templateRequest, retryTemplateOnFail);
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
