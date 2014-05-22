// Copyright (c) 2013-2014 Turbulenz Limited
//
// PlaybackController - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/
/*global UserDataManager: false*/
/*global TurbulenzServices: false*/
/*global Utilities: false*/
/*global debug: false*/

function PlaybackController() {}

PlaybackController.prototype =
{
    init : function playbackcontrollerInitFn(prefixAssetURL, prefixCaptureURL, prefixTemplatesURL, sequenceList)
    {
        var initStatus = this.errorCodes.OK;

        this.prefixAssetURL = prefixAssetURL;
        this.prefixCaptureURL = prefixCaptureURL;
        this.prefixTemplatesURL = prefixTemplatesURL;
        if (!prefixTemplatesURL)
        {
            // If no prefix is specified, then use the default path
            this.prefixTemplatesURL = 'config/templates/' + this.config.mode + '/';
        }

        this.testRanges = {};
        this.testSubTestDict = {};
        this.resultsData = {};

        initStatus = this._processSequenceList(sequenceList);
        return initStatus;
    },

    _processSubTests: function playbackcontrollerProcessSubTestsFn(subTests, tests, testID, testData)
    {
        var length = subTests.length;
        var subTest;
        var testsData = this.testsData;
        var stats, subTestObj;
        var subTestList = [];
        var subTestID;
        testData.subTestIDs = [];
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

                subTestID = testID + '-' + i;
                subTestObj = {
                    name: subTests[i],
                    id: subTestID,
                    stats: stats
                };
                testData.subTestIDs.push(subTestID);
                testsData.push(subTestObj);
                subTestList.push(subTestObj);
            }
        }
        this.testMeta = tests;
        this.testSubTestDict[testID] = {
            testData: testData,
            subTestList: subTestList
        };
    },

    _getWebGLDebugRendererInfo: function playbackControllerGetWebGLDebugRendererInfo()
    {
        var graphicsDevice = this.graphicsDevice;
        var gl = graphicsDevice.gl;
        if (gl)
        {
            var webGLDebugRendererInfoExt = gl.getExtension('WEBGL_debug_renderer_info');
            if (webGLDebugRendererInfoExt)
            {
                var webGLDebugRendererInfo = {};
                var vendorParamID = webGLDebugRendererInfoExt.UNMASKED_VENDOR_WEBGL;
                if (vendorParamID)
                {
                    webGLDebugRendererInfo.vendor = gl.getParameter(vendorParamID);
                }
                var rendererParamID = webGLDebugRendererInfoExt.UNMASKED_RENDERER_WEBGL;
                if (rendererParamID)
                {
                    webGLDebugRendererInfo.renderer = gl.getParameter(rendererParamID);
                }
                return webGLDebugRendererInfo;
            }
        }
        return null;
    },

    _processTemplate: function playbackControllerProcessTemplateFn(templateData)
    {
        var config = templateData.config;
        if (config && config.hardware)
        {
            var hardware = config.hardware;
            var webGLDebugRendererInfo = this._getWebGLDebugRendererInfo();
            if (webGLDebugRendererInfo)
            {
                if (!hardware.rendererVendor)
                {
                    hardware.rendererVendor = webGLDebugRendererInfo.vendor;
                }
                if (!hardware.renderer)
                {
                    hardware.renderer = webGLDebugRendererInfo.renderer;
                }
            }
        }
        return templateData;
    },

    _postFrame: function postFrameFn(frameIndex)
    {
        var testRange;
        var testRanges = this.testRanges;
        var testsActive = this.testsActive;
        var stats, maxFrameMs, minFrameMs, maxDispatchMs, minDispatchMs;
        testsActive.length = 0;

        var playbackGraphicsDevice = this.playbackGraphicsDevice;
        var playWidth = playbackGraphicsDevice.playWidth;
        var playHeight = playbackGraphicsDevice.playHeight;

        var i;

        var msPerFrame = this.msPerFrame;
        var msDispatchPerFrame = this.msDispatchPerFrame;
        var ignoreFrame = this.ignoreFrame;
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
                        stats.startPixels = (playWidth > 0 && playHeight > 0) ? playWidth * playHeight: 0;
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
                            if (ignoreFrame[i] === 0)
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

        if (this.simplefonts.hasLoaded())
        {
            var gd = this.graphicsDevice;
            gd.setScissor(0, 0, gd.width, gd.height);
            gd.setViewport(0, 0, gd.width, gd.height);

            var pd = this.playbackGraphicsDevice;
            var left = Math.max((gd.width - pd.playWidth) / 2, 0);
            var bottom = Math.min(pd.playHeight + ((gd.height - pd.playHeight) / 2), gd.height);

            var fontParams = this.fontParams.heading;
            fontParams.x = left + 20;
            fontParams.y = bottom - 72;
            if (!this.heading)
            {
                this.heading = 'POLYCRAFT.GL';
                if (this.resultsTemplateData && this.resultsTemplateData.config.benchmark.version)
                {
                    this.heading += '\nVersion ' + this.resultsTemplateData.config.benchmark.version;
                }
            }
            this.simplefonts.drawFont(this.heading, fontParams);

            if (testsActive.length)
            {
                var postFix = '';
                if (this.testsData.length)
                {
                    var testList = this.testSubTestDict[this.testsData[0].id].subTestList;
                    var testCount = testList.length;
                    for (i = 0 ; i < testCount; i += 1)
                    {
                        if (testRanges[testList[i].name].name === testsActive[0])
                        {
                            postFix = ' ( ' + (i + 1) + ' of ' + testCount + ' )';
                            break;
                        }
                    }
                }

                fontParams = this.fontParams.text;
                fontParams.x = left + 20;
                fontParams.y = bottom - 55;
                this.simplefonts.drawFont(testsActive[0].toUpperCase() + postFix, fontParams);
            }

            fontParams = this.fontParams.fps;
            fontParams.x = left + 20;
            fontParams.y = bottom - 20;
            this.simplefonts.drawFont("" + Math.floor(this.fps), fontParams);

            fontParams = this.fontParams.text;
            fontParams.x = left + 54;
            fontParams.y = bottom - 24;
            this.simplefonts.drawFont("FPS" + (this.playResolution ? " @ " + this.playResolution: ""), fontParams);

            this.simplefonts.render();
        }
    },

    _processScores: function playbackControllerProcessScores()
    {
        var testsData = this.testsData;
        var testRanges = this.testRanges;
        var testRange, startFrame, endFrame, incompleteTest, framesProcessed, testData;
        var validTest, avgPixelsPerProcessedFrame, startPixels;
        var t, i, length;

        var frameRate = 60;
        var timePerFrame = (1 / frameRate) * 1000;
        var maxScore = 2500;
        var scorePerSecond = maxScore / 12; // 2500pts for every 12 seconds of test

        var scorePerFrame = (scorePerSecond) / frameRate;
        var totalMs, baseScore, targetMs, testScore, totalPixels, stats;
        var scoreObj;

        var msPerFrame = this.msPerFrame;
        var pixelsPerFrame = this.pixelsPerFrame;
        var ignoreFrame = this.ignoreFrame;
        this.testScores = {};
        for (t in testRanges)
        {
            if (testRanges.hasOwnProperty(t))
            {
                totalMs = 0;
                totalPixels = 0;
                testRange = testRanges[t];
                startFrame = testRange.range[0];
                endFrame = testRange.range[1];
                length = endFrame - startFrame;
                incompleteTest = false;
                validTest = true;
                stats = testRange.stats;
                if (testRange.started)
                {
                    startPixels = stats.startPixels;
                }
                else
                {
                    startPixels = 0;
                }

                baseScore = scorePerFrame * length;

                framesProcessed = 0;

                for (i = startFrame; i <= endFrame; i += 1)
                {
                    if (msPerFrame[i] !== undefined)
                    {
                        if (ignoreFrame[i] === 0)
                        {
                            totalMs += msPerFrame[i];
                            totalPixels += pixelsPerFrame[i];
                            framesProcessed += 1;
                        }
                    }
                    else
                    {
                        incompleteTest = true;
                    }
                }

                targetMs = timePerFrame * framesProcessed;

                if (totalMs > 0)
                {
                    avgPixelsPerProcessedFrame = totalPixels / framesProcessed;
                    // The benchmark test has been re-sized during playback
                    validTest = validTest && (startPixels === avgPixelsPerProcessedFrame);

                    testScore = baseScore * (targetMs / totalMs);
                    // Round to the nearest 10 (reducing the impact of random variation on the score)
                    testScore = ((testScore / 1000).toFixed(2) * 1000);
                    if (testScore > maxScore)
                    {
                        testScore = maxScore;
                    }
                }
                else
                {
                    testScore = 0;
                }

                scoreObj = {
                    name: testRange.name,
                    complete: true,
                    totalTimeMs: totalMs,
                    score: testScore,
                    completeRatio: 1.0
                };
                if (incompleteTest)
                {
                    scoreObj.complete = false;
                    scoreObj.completeRatio = framesProcessed / length;
                    validTest = false;
                }
                scoreObj.valid = validTest;

                length = testsData.length;
                for (i = 0; i < length; i += 1)
                {
                    testData = testsData[i];
                    if (testData.name === t)
                    {
                        testData.score = scoreObj;
                    }
                }
            }
        }

        // Process scores from subTests
        var subTestObj, subTestDataObj;
        var testSubTestDict = this.testSubTestDict;
        var totalScore = 0;
        var totalRatio = 0;
        var perTestScores;
        totalMs = 0;
        incompleteTest = false;
        for (t in testSubTestDict)
        {
            if (testSubTestDict.hasOwnProperty(t))
            {
                subTestObj = testSubTestDict[t];
                testData = subTestObj.testData;
                perTestScores = [];
                validTest = true;

                length = subTestObj.subTestList.length;
                for (i = 0; i < length; i += 1)
                {
                    subTestDataObj = subTestObj.subTestList[i];
                    scoreObj = subTestDataObj.score;
                    if (scoreObj)
                    {
                        totalMs += scoreObj.totalTimeMs;
                        totalRatio += scoreObj.completeRatio;
                        totalScore += scoreObj.score;
                        incompleteTest = !scoreObj.complete || incompleteTest;
                        validTest = validTest && scoreObj.valid;
                        perTestScores.push(scoreObj);
                    }
                    else
                    {
                        incompleteTest = true;
                    }
                }

                scoreObj = {
                    name: "Total",
                    complete: !incompleteTest,
                    totalTimeMs: totalMs,
                    score: totalScore,
                    completeRatio: totalRatio / length,
                    valid: validTest && !incompleteTest
                };
                testData.score = scoreObj;
                perTestScores.push(scoreObj);
                this.testScores[testData.name] = perTestScores;
            }
        }
    },

    _processSequenceList: function playbackcontrollerProcessSequenceList(sequenceList)
    {
        var sequence, stream, test, streamMeta, testMeta, stats, testData;
        var numTotalFrames, numFramesPerGroup, numGroups;
        var i, iLen, j, jLen, k, kLen;
        if (!sequenceList)
        {
            return this.errorCodes.SEQUENCE_PARSE_FAIL;
        }
        iLen = sequenceList.length;
        this.testsData = [];

        if (iLen === 0)
        {
            return this.errorCodes.SEQUENCE_PARSE_FAIL;
        }

        for (i = 0; i < iLen; i += 1)
        {
            sequence = sequenceList[i];
            if (!sequence.streams || sequence.streams.length <= 0)
            {
                return this.errorCodes.SEQUENCE_PARSE_FAIL;
            }
            jLen = sequence.streams.length;
            for (j = 0; j < jLen; j += 1)
            {
                stream = sequence.streams[j];
                streamMeta = stream.meta;
                if (!streamMeta || streamMeta.version !== 1)
                {
                    // streamMeta version is not compatible
                    return this.errorCodes.META_VERSION_INCOMPAT;
                }
                numTotalFrames = this.numTotalFrames = streamMeta.totalLength;
                numFramesPerGroup = this.numFramesPerGroup = streamMeta.groupLength;
                // Total groups for all stream data
                numGroups = this.numGroups = Math.ceil(numTotalFrames / numFramesPerGroup);

                if (!stream.tests || stream.tests.length <= 0)
                {
                    return this.errorCodes.SEQUENCE_PARSE_FAIL;
                }
                kLen = stream.tests.length;
                for (k = 0; k < kLen; k += 1)
                {
                    test = stream.tests[k];
                    testMeta = streamMeta.tests[test.name];
                    if (!testMeta)
                    {
                        // Test is no available in the stream
                        return this.errorCodes.STREAM_TEST_MISSING;
                    }

                    stats = {};
                    testData = {
                        id: test.id,
                        name: test.name,
                        stats: stats
                    };
                    this.testsData.push(testData);

                    if (testMeta.subTests)
                    {
                        this._processSubTests(testMeta.subTests, streamMeta.tests, test.id, testData);
                    }
                    else
                    {
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
                    }

                    var testEndFrame = testMeta.endFrame ? testMeta.endFrame: testMeta.lastFrame;
                    numGroups = this.numGroups = Math.ceil(testEndFrame / numFramesPerGroup) + this.additionalGroups;
                }
            }
        }
        this.sequenceList = sequenceList;
        return this.errorCodes.OK;
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
        // Only support version 1
        return (template.version === 1);
    },

    loadAssets : function playbackcontrollerLoadAssetsFn()
    {
        var g;
        for (g = 0; g < this.numGroups; g += 1)
        {
            this._requestData(g);
        }
        this.requestInit = true;
    },

    getLoadingProgress : function playbackcontrollerGetLoadingProgressFn()
    {
        return this.numCaptureDataLoaded / this.numCaptureData;
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
        var ignorePrevFrame = this.ignoreNextFrame;

        if (!this.requestInit)
        {
            this.loadAssets();
        }

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
                    this.ignoreNextFrame = true;
                    return;
                }

                var frameStart = TurbulenzEngine.getTime();
                playbackGraphicsDevice.play(this.relativeFrameIndex);
                var dispatchTime = TurbulenzEngine.getTime() - frameStart;

                var playWidth = playbackGraphicsDevice.playWidth;
                var playHeight = playbackGraphicsDevice.playHeight;
                if (playWidth !== this.lastPlayWidth || playHeight !== this.lastPlayHeight)
                {
                    this.playResolution = playWidth + " x " + playHeight;
                }

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
                // Use this frame unless set otherwise
                this.ignoreNextFrame = false;

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
                        this.fps = 1000 / this.averageFrameTime;
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
                        averageFpsElement.textContent = (this.fps).toFixed(2);
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
                        resolutionElement.textContent = playWidth.toString() + ' x ' +
                            playHeight.toString();
                    }

                    var frameIndexDelta;
                    if (this.fixedFrameRate || graphicsDevice.fps <= 0)
                    {
                        frameIndexDelta = 1;

                        this.msPerFrame[this.msPerFrame.length] = frameTime;
                        this.msDispatchPerFrame[this.msDispatchPerFrame.length] = dispatchTime;
                        this.ignoreFrame[this.ignoreFrame.length] = ignorePrevFrame ? 1: 0;
                        this.pixelsPerFrame[this.pixelsPerFrame.length] = (playWidth > 0 && playHeight > 0) ? playWidth * playHeight: 0;
                        if (ignorePrevFrame)
                        {
                            // Ignore the next frame too
                            // Ensure no impact from the previous frame affects this frame
                            var lastButOneFrame = this.ignoreFrame.length - 2;
                            if (lastButOneFrame >= 0)
                            {
                                this.ignoreNextFrame = (this.ignoreFrame[lastButOneFrame] === 0);
                            }
                        }

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
                            this.ignoreNextFrame = true;
                        }

                        if ((this.currentGroupIndex + 1) < this.numGroups && !this.aborted)
                        {
                            // Flag last group data for release
                            group.data = this.emptyData;

                            this.currentGroupIndex += 1;
                            this.relativeFrameIndex -= this.numFramesPerGroup;
                            this.addingResources = true;
                            this.ignoreNextFrame = true;
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
                            playbackConfig.playWidth = playWidth;
                            playbackConfig.playHeight = playHeight;
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

                // Not frame processing occurred, ignore the following frame's timing calculation
                this.ignoreNextFrame = true;
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

        userDataResult.config.browser = {
            name: 'Unknown Browser',
            version: {
                value: ''
            },
            os: {
                name: 'Unknown OS',
                version: {
                    value: ''
                }
            }
        };
        var WhichBrowser = window.WhichBrowser;
        if (WhichBrowser)
        {
            var browser = userDataResult.config.browser;
            var wb = new WhichBrowser();
            wb.onReady(function (info)
            {
                if (info)
                {
                    var browserData = info.browser;
                    var osData = info.os;
                    if (browserData && browserData.name)
                    {
                        browser.name = browserData.name;
                        if (browserData.version)
                        {
                            browser.version = browserData.version;
                        }
                    }
                    if (osData && osData.name)
                    {
                        browser.os = osData;
                    }
                }
            });
        }

        //TODO: Add online hardware config

        var sequences = userDataResult.config.sequences;
        if (sequences.length === 0)
        {
            userDataResult.config.sequences = this.sequenceList;
            this.sequenceList = [];
        }

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
            averageMsPerDispatch: [],
            ignoreFrame: [],
            pixelsPerFrame: []
        };
        var timingDataCSV = 'msPerFrame,msDispatchPerFrame,averageMsPerFrame,averageMsPerDispatch,ignoreFrame,pixelsPerFrame\n';
        var msPerFrame = this.msPerFrame;
        var ignoreFrame = this.ignoreFrame;
        var pixelsPerFrame = this.pixelsPerFrame;
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
            var averageCounter = 0;
            var i;
            for (i = 0; i < msPerFrameLength; i += 1)
            {
                if (averageCounter % 60 === 0)
                {
                    averageFrameMs = newAverageFrameMs;
                    averageDispatchMs = newAverageDispatchMs;
                    newAverageFrameMs = 0;
                    newAverageDispatchMs = 0;
                }

                // Ignore contribution to averages
                if (ignoreFrame[i] === 0)
                {
                    newAverageFrameMs += msPerFrame[i] / 60.0;
                    newAverageDispatchMs += msDispatchPerFrame[i] / 60.0;
                    averageCounter += 1;

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

                // Still include the data up to this point
                timingDataCSV +=    msPerFrame[i] + ',' +
                                    msDispatchPerFrame[i] + ',' +
                                    averageFrameMs + ',' +
                                    averageDispatchMs + ',' +
                                    ignoreFrame[i] +
                                    pixelsPerFrame[i] +
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
            timingData.ignoreFrame = this.ignoreFrame;
            timingData.pixelsPerFrame = this.pixelsPerFrame;

            resultsData.timing = {
                csv: timingDataCSV,
                obj: timingData
            };

            this.msPerFrame = [];
            this.msDispatchPerFrame = [];
            this.ignoreFrame = [];
            this.pixelsPerFrame = [];

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

    getScores : function playbackControllerGetScoresFn(testId)
    {
        testId = testId || this.testsData[0].name;
        return this.testScores[testId];
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
    var simplefonts = params.simplefonts;
    var elements = params.elements;

    playbackController.errorCodes = params.errorCodes;
    debug.assert(!!playbackController.errorCodes, "Error codes from benchmark app required");
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

    playbackController.previousFrameTime = 0;
    playbackController.atEnd = false;

    playbackController.elements = elements;
    playbackController.fps = 0;
    playbackController.playResolution = "";
    playbackController.lastPlayWidth = 0;
    playbackController.lastPlayHeight = 0;
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
    playbackController.ignoreFrame = [];
    playbackController.pixelsPerFrame = [];
    playbackController.testRanges = {};
    playbackController.testsActive = [];
    playbackController.requestInit = false;

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
    playbackController.sequenceList = [];

    playbackController.simplefonts = simplefonts;

    playbackController.resultsData = {};
    playbackController.dataProcessed = false;

    playbackController.resultsTemplateData = null;
    playbackController.aborted = false;
    playbackController.multisample = -1;
    playbackController.antialias = false;

    playbackController.gameSession = null;
    playbackController.userDataManager = null;

    playbackController.mappingTable = null;
    playbackController.mappingTableCallbackFn = params.mappingTableCallback;

    playbackController.heading = '';
    playbackController.fontParams = {
        text: {
            scale: 1,
            fontStyle: "light",
            valignment: simplefonts.textVerticalAlign.BOTTOM,
            alignment: simplefonts.textHorizontalAlign.LEFT
        },
        fps: {
            scale: 2,
            spacing: 2,
            fontStyle: "light",
            valignment: simplefonts.textVerticalAlign.BOTTOM,
            alignment: simplefonts.textHorizontalAlign.LEFT
        },
        heading: {
            color: mathDevice.v4Build(1, 1, 1, 0.5),
            scale: 1,
            valignment: simplefonts.textVerticalAlign.BOTTOM,
            alignment: simplefonts.textHorizontalAlign.LEFT
        }
    };

    var mappingTableErrorFn = function mappingTableErrorFn()
    {
        window.alert("Mapping table is missing. Cannot save data.");
        playbackController.resultsTemplateData = null;
        playbackController.loadingTemplates = false;

        if (playbackController.mappingTableCallbackFn)
        {
            playbackController.mappingTableCallbackFn(null);
        }
    };

    var mappingTableReceived = function mappingTableReceivedFn(mappingTable) {

        function templateLoaded(responseText, status)
        {
            if (responseText && status === 200)
            {
                try {
                    var templateData = JSON.parse(responseText);
                    if (!templateData)
                    {
                        window.alert("Results template is empty. Cannot save data.");
                        playbackController.resultsTemplateData = null;
                    }
                    else if (!playbackController._isSupportedTemplate(templateData))
                    {
                        window.alert("Results template is incompatible. Cannot save data.");
                        playbackController.resultsTemplateData = null;
                    }
                    playbackController.resultsTemplateData = playbackController._processTemplate(templateData);
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

        if (playbackController.mappingTableCallbackFn)
        {
            playbackController.mappingTableCallbackFn(mappingTable);
        }

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

        var templateRequest = playbackController.prefixTemplatesURL + playbackController.config.resultsTemplate + '.json';
        if (playbackController.config.requestLocalTemplate)
        {
            TurbulenzEngine.request(templateRequest, retryTemplateOnFail);
        }
        else
        {
            TurbulenzEngine.request(mappingTable.getURL(templateRequest), templateLoaded);
        }

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
