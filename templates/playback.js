/*{# Copyright (c) 2013 Turbulenz Limited #}*/

// jslib files
/*{{ javascript("jslib/capturegraphicsdevice.js") }}*/

/* For jslint */
/*global TurbulenzEngine: false*/
/*global PlaybackGraphicsDevice: false*/

// Main app entry point
TurbulenzEngine.onload = function onloadFn()
{
    var gd = TurbulenzEngine.createGraphicsDevice({});

    var playBack = PlaybackGraphicsDevice.create(gd);
    playBack.onerror = function (msg)
    {
        window.alert(msg);
    };

    var prefixAssetURL = 'capture/';
    var prefixCaptureURL = 'capture/';

    var numTotalFrames = 3600;
    var numFramesPerGroup = 60;
    var numGroups = Math.floor(numTotalFrames / numFramesPerGroup);
    var groups = [];
    var currentGroupIndex = 0;
    var relativeFrameIndex = 0;
    var addingResources = true;
    var loadingResources = false;
    var emptyData = [-1, -1, -1, -1];

    var frameTimeElement = document.getElementById("frameTime");
    var frameNumberElement = document.getElementById("frameNumber");
    var paused = false;
    var step = false;
    var fixedFrameRate = true;

    var loadingColor = [0, 0, 0, 1];
    var intervalID;

    var requestData = function requestDataFn(groupIndex)
    {
        var group = {
            resources: null,
            data: null,
            frames: null,
            ready: false
        };
        groups[groupIndex] = group;

        var xhr0 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));
        var xhr1 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));
        var xhr2 = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP"));

        var resourcesLoaded = function resourcesLoadedFn()
        {
            if (xhr0.readyState === 4)
            {
                group.resources = JSON.parse(xhr0.responseText);
                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                }

                if (groupIndex === currentGroupIndex &&
                    addingResources)
                {
                    playBack.addResources(group.resources, prefixAssetURL);
                    addingResources = false;
                    loadingResources = true;
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
                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                    if (groupIndex === currentGroupIndex &&
                        loadingResources &&
                        playBack.numPendingResources === 0)
                    {
                        playBack.addData(group.data);
                        playBack.addFrames(group.frames, true);
                        loadingResources = false;
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
                if (group.resources && group.data && group.frames)
                {
                    group.ready = true;
                    if (groupIndex === currentGroupIndex &&
                        loadingResources &&
                        playBack.numPendingResources === 0)
                    {
                        playBack.addData(group.data);
                        playBack.addFrames(group.frames, true);
                        loadingResources = false;
                    }
                }

                xhr2.onreadystatechange = null;
                xhr2.responseText = null;
                xhr2 = null;
            }
        };

        var rangeString = '-' + (groupIndex * numFramesPerGroup) +
                          '-' + (((groupIndex + 1) * numFramesPerGroup) - 1);

        xhr0.open('GET', prefixCaptureURL + 'resources' + rangeString + '.json', true);
        xhr0.onreadystatechange = resourcesLoaded;
        xhr0.send();

        xhr1.open('GET', prefixCaptureURL + 'data' + rangeString + '.bin', true);
        xhr1.responseType = "arraybuffer";
        xhr1.onreadystatechange = dataLoaded;
        xhr1.send();

        xhr2.open('GET', prefixCaptureURL + 'frames' + rangeString + '.json', true);
        xhr2.onreadystatechange = framesLoaded;
        xhr2.send();
    };

    function renderLoop()
    {
        var framesReady = false;

        var group = groups[currentGroupIndex];
        if (group.ready)
        {
            if (addingResources)
            {
                playBack.addResources(group.resources, prefixAssetURL);
                addingResources = false;
                loadingResources = true;
            }

            if (loadingResources &&
                playBack.numPendingResources === 0)
            {
                playBack.addData(group.data);
                playBack.addFrames(group.frames, true);
                loadingResources = false;
            }

            if (!addingResources && !loadingResources)
            {
                framesReady = true;
            }
        }

        if (gd.beginFrame())
        {
            if (framesReady)
            {
                var frameTime = TurbulenzEngine.getTime();

                playBack.play(relativeFrameIndex);

                gd.finish();

                frameTime = (TurbulenzEngine.getTime() - frameTime);

                if (frameTimeElement)
                {
                    frameTimeElement.textContent = frameTime.toFixed(1) + ' ms';
                }

                if (!paused || step)
                {
                    step = false;

                    var frameIndexDelta;
                    if (step || fixedFrameRate || gd.fps <= 0)
                    {
                        frameIndexDelta = 1;
                    }
                    else
                    {
                        frameIndexDelta = Math.max(1.0, Math.floor(0.5 + (60 / gd.fps)));
                    }

                    relativeFrameIndex += frameIndexDelta;

                    if (relativeFrameIndex >= numFramesPerGroup)
                    {
                        if ((currentGroupIndex + 1) < numGroups)
                        {
                            // Flag last group data for release
                            group.data = emptyData;

                            currentGroupIndex += 1;
                            relativeFrameIndex = 0;
                            addingResources = true;
                        }
                        else
                        {
                            relativeFrameIndex -= frameIndexDelta;
                        }
                    }

                    if (frameNumberElement)
                    {
                        frameNumberElement.textContent =
                            ((currentGroupIndex * numFramesPerGroup) + relativeFrameIndex).toString();
                    }
                }
            }
            else
            {
                gd.clear(loadingColor);
            }

            gd.endFrame();
        }
    }

    intervalID = TurbulenzEngine.setInterval(renderLoop, 1000 / 60);

    var g;
    for (g = 0; g < numGroups; g += 1)
    {
        requestData(g);
    }

    // Controls
    var pauseElement = document.getElementById("buttonPause");
    var stepElement = document.getElementById("buttonStep");
    var fixedElement = document.getElementById("checkboxFixed");

    if (pauseElement)
    {
        pauseElement.onclick = function ()
        {
            paused = !paused;
            if (paused)
            {
                pauseElement.value = "Play";
            }
            else
            {
                pauseElement.value = "Pause";
            }
            if (stepElement)
            {
                stepElement.disabled = !paused;
            }
        };
    }

    if (stepElement)
    {
        stepElement.disabled = true;
        stepElement.onclick = function ()
        {
            step = true;
        };
    }

    if (fixedElement)
    {
        fixedElement.onclick = function ()
        {
            fixedFrameRate = fixedElement.checked;
        };
    }

    // Unload
    TurbulenzEngine.onunload = function onbeforeunloadFn()
    {
        if (intervalID)
        {
            TurbulenzEngine.clearInterval(intervalID);
            intervalID = null;
        }
        if (playBack)
        {
            playBack.destroy();
            playBack = null;
        }
    };
};
