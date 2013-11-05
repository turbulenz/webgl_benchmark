// Copyright (c) 2011-2013 Turbulenz Limited
/*global VMath*/
/*global WebGLGraphicsDevice*/
/*global WebGLInputDevice*/
/*global WebGLSoundDevice*/
/*global WebGLPhysicsDevice*/
/*global WebGLNetworkDevice*/
/*global Float32Array*/
/*global console*/
/*global window*/
"use strict";
;

;

;

;

//
// WebGLTurbulenzEngine
//
var WebGLTurbulenzEngine = (function () {
    function WebGLTurbulenzEngine() {
        this.version = '0.27.0.0';
    }
    WebGLTurbulenzEngine.prototype.setInterval = function (f, t) {
        var that = this;
        return window.setInterval(function () {
            that.updateTime();
            f();
        }, t);
    };

    WebGLTurbulenzEngine.prototype.clearInterval = function (i) {
        window.clearInterval(i);
    };

    WebGLTurbulenzEngine.prototype.createGraphicsDevice = function (params) {
        if (this.graphicsDevice) {
            this.callOnError('GraphicsDevice already created');
            return null;
        } else {
            var graphicsDevice = WebGLGraphicsDevice.create(this.canvas, params);
            this.graphicsDevice = graphicsDevice;
            return graphicsDevice;
        }
    };

    WebGLTurbulenzEngine.prototype.createPhysicsDevice = function (params) {
        if (this.physicsDevice) {
            this.callOnError('PhysicsDevice already created');
            return null;
        } else {
            var physicsDevice;
            var plugin = this.getPluginObject();
            if (plugin) {
                physicsDevice = plugin.createPhysicsDevice(params);
            } else {
                physicsDevice = WebGLPhysicsDevice.create();
            }
            this.physicsDevice = physicsDevice;
            return physicsDevice;
        }
    };

    WebGLTurbulenzEngine.prototype.createSoundDevice = function (params) {
        if (this.soundDevice) {
            this.callOnError('SoundDevice already created');
            return null;
        } else {
            var soundDevice;
            var plugin = this.getPluginObject();
            if (plugin) {
                soundDevice = plugin.createSoundDevice(params);
            } else {
                soundDevice = WebGLSoundDevice.create(params);
            }
            this.soundDevice = soundDevice;
            return soundDevice;
        }
    };

    WebGLTurbulenzEngine.prototype.createInputDevice = function (params) {
        if (this.inputDevice) {
            this.callOnError('InputDevice already created');
            return null;
        } else {
            var inputDevice = WebGLInputDevice.create(this.canvas);
            this.inputDevice = inputDevice;
            return inputDevice;
        }
    };

    WebGLTurbulenzEngine.prototype.createNetworkDevice = function (params) {
        if (this.networkDevice) {
            throw 'NetworkDevice already created';
        } else {
            var networkDevice = WebGLNetworkDevice.create(params);
            this.networkDevice = networkDevice;
            return networkDevice;
        }
    };

    WebGLTurbulenzEngine.prototype.createMathDevice = function (params) {
        try  {
            var testVector = new Float32Array([1, 2, 3]);

            VMath.v3Build.apply(VMath, testVector);

            // Clamp FLOAT_MAX
            testVector[0] = VMath.FLOAT_MAX;
            VMath.FLOAT_MAX = testVector[0];
        } catch (e) {
        }

        return WebGLMathDevice;
    };

    WebGLTurbulenzEngine.prototype.createNativeMathDevice = function (params) {
        return WebGLMathDevice;
    };

    WebGLTurbulenzEngine.prototype.getGraphicsDevice = function () {
        var graphicsDevice = this.graphicsDevice;
        if (graphicsDevice === null) {
            this.callOnError("GraphicsDevice not created yet.");
        }
        return graphicsDevice;
    };

    WebGLTurbulenzEngine.prototype.getPhysicsDevice = function () {
        return this.physicsDevice;
    };

    WebGLTurbulenzEngine.prototype.getSoundDevice = function () {
        return this.soundDevice;
    };

    WebGLTurbulenzEngine.prototype.getInputDevice = function () {
        return this.inputDevice;
    };

    WebGLTurbulenzEngine.prototype.getNetworkDevice = function () {
        return this.networkDevice;
    };

    WebGLTurbulenzEngine.prototype.getMathDevice = function () {
        return WebGLMathDevice;
    };

    WebGLTurbulenzEngine.prototype.getNativeMathDevice = function () {
        return WebGLMathDevice;
    };

    WebGLTurbulenzEngine.prototype.getObjectStats = function () {
        return null;
    };

    WebGLTurbulenzEngine.prototype.flush = function () {
    };

    WebGLTurbulenzEngine.prototype.run = function () {
    };

    WebGLTurbulenzEngine.prototype.encrypt = function (msg) {
        return msg;
    };

    WebGLTurbulenzEngine.prototype.decrypt = function (msg) {
        return msg;
    };

    WebGLTurbulenzEngine.prototype.generateSignature = function (msg) {
        return null;
    };

    WebGLTurbulenzEngine.prototype.verifySignature = function (msg, sig) {
        return true;
    };

    WebGLTurbulenzEngine.prototype.onerror = function (msg) {
        console.error(msg);
    };

    WebGLTurbulenzEngine.prototype.onwarning = function (msg) {
        console.warn(msg);
    };

    WebGLTurbulenzEngine.prototype.onperformancewarning = function (msg) {
    };

    WebGLTurbulenzEngine.prototype.getSystemInfo = function () {
        return this.systemInfo;
    };

    WebGLTurbulenzEngine.prototype.request = function (url, callback) {
        var that = this;

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new window.XMLHttpRequest();
        } else if (window.ActiveXObject) {
            xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
        } else {
            that.callOnError("No XMLHTTPRequest object could be created");
            return;
        }

        var httpRequestCallback = function httpRequestCallbackFn() {
            if (xhr.readyState === 4) {
                if (!that.isUnloading()) {
                    var xhrResponseText = xhr.responseText;
                    var xhrStatus = xhr.status;

                    if ("" === xhrResponseText) {
                        xhrResponseText = null;
                    }

                    if (xhrStatus === 0 && xhrResponseText && window.location.protocol === "file:") {
                        xhrStatus = 200;
                    } else if (null === xhr.getResponseHeader("Content-Type") && "" === xhr.getAllResponseHeaders()) {
                        // Sometimes the browser sets status to 200 OK
                        // when the connection is closed before the
                        // message is sent (weird!).  In order to address
                        // this we fail any completely empty responses.
                        // Hopefully, nobody will get a valid response
                        // with no headers and no body!
                        // Except that for cross domain requests getAllResponseHeaders ALWAYS returns an empty string
                        // even for valid responses...
                        callback(null, 0);
                        return;
                    }

                    if (xhrStatus !== 0) {
                        if (404 === xhrStatus) {
                            xhrResponseText = null;
                        }

                        callback(xhrResponseText, xhrStatus);
                    } else {
                        // Checking xhr.statusText when xhr.status is
                        // 0 causes a silent error
                        callback(xhrResponseText, 0);
                    }
                }

                // break circular reference
                xhr.onreadystatechange = null;
                xhr = null;
                callback = null;
            }
        };

        xhr.open('GET', url, true);
        if (callback) {
            xhr.onreadystatechange = httpRequestCallback;
        }
        xhr.send();
    };

    // Internals
    WebGLTurbulenzEngine.prototype.destroy = function () {
        if (this.networkDevice) {
            delete this.networkDevice;
        }
        if (this.inputDevice) {
            this.inputDevice.destroy();
            delete this.inputDevice;
        }
        if (this.physicsDevice) {
            delete this.physicsDevice;
        }
        if (this.soundDevice) {
            if (this.soundDevice.destroy) {
                this.soundDevice.destroy();
            }
            delete this.soundDevice;
        }
        if (this.graphicsDevice) {
            this.graphicsDevice.destroy();
            delete this.graphicsDevice;
        }
        if (this.canvas) {
            delete this.canvas;
        }
        if (this.resizeCanvas) {
            window.removeEventListener('resize', this.resizeCanvas, false);
        }
    };

    WebGLTurbulenzEngine.prototype.getPluginObject = function () {
        if (!this.plugin && this.pluginId) {
            this.plugin = document.getElementById(this.pluginId);
        }
        return this.plugin;
    };

    WebGLTurbulenzEngine.prototype.unload = function () {
        if (!this.unloading) {
            this.unloading = true;
            if (this.onunload) {
                this.onunload();
            }
            if (this.destroy) {
                this.destroy();
            }
        }
    };

    WebGLTurbulenzEngine.prototype.isUnloading = function () {
        return this.unloading;
    };

    WebGLTurbulenzEngine.prototype.enableProfiling = function () {
    };

    WebGLTurbulenzEngine.prototype.startProfiling = function () {
        if (console && console.profile && console.profileEnd) {
            console.profile("turbulenz");
        }
    };

    WebGLTurbulenzEngine.prototype.stopProfiling = function () {
        // Chrome and Safari return an object. IE and Firefox print to the console/profile tab.
        var result;
        if (console && console.profile && console.profileEnd) {
            console.profileEnd();
            if (console.profiles) {
                result = console.profiles[console.profiles.length - 1];
            }
        }

        return result;
    };

    WebGLTurbulenzEngine.prototype.callOnError = function (msg) {
        var onerror = this.onerror;
        if (onerror) {
            onerror(msg);
        }
    };

    WebGLTurbulenzEngine.create = function (params) {
        var tz = new WebGLTurbulenzEngine();

        var canvas = params.canvas;
        var fillParent = params.fillParent;

        // To expose unload (the whole interaction needs a re-design)
        window.TurbulenzEngineCanvas = tz;

        tz.pluginId = params.pluginId;
        tz.plugin = null;

        // time property
        var getTime = Date.now;
        var performance = window.performance;
        if (performance) {
            if (performance.now) {
                getTime = function getTimeFn() {
                    return performance.now();
                };
            } else if ((performance).webkitNow) {
                getTime = function getTimeFn() {
                    return (performance).webkitNow();
                };
            }
        }

        // To be used by the GraphicsDevice for accurate fps calculations
        tz.getTime = getTime;

        var baseTime = getTime();

        // Safari 6.0 has broken object property defines.
        var canUseDefineProperty = true;
        var navStr = navigator.userAgent;
        var navVersionIdx = navStr.indexOf("Version/6.0");
        if (-1 !== navVersionIdx) {
            if (-1 !== navStr.substring(navVersionIdx).indexOf("Safari/")) {
                canUseDefineProperty = false;
            }
        }

        if (canUseDefineProperty && Object.defineProperty) {
            Object.defineProperty(tz, "time", {
                get: function () {
                    return ((getTime() - baseTime) * 0.001);
                },
                set: function (newValue) {
                    if (typeof newValue === 'number') {
                        // baseTime is in milliseconds, newValue is in seconds
                        baseTime = (getTime() - (newValue * 1000));
                    } else {
                        tz.callOnError("Must set 'time' attribute to a number");
                    }
                },
                enumerable: false,
                configurable: false
            });

            tz.updateTime = function () {
            };
        } else {
            tz.updateTime = function () {
                this.time = ((getTime() - baseTime) * 0.001);
            };
        }

        if (window.postMessage) {
            var zeroTimeoutMessageName = "0-timeout-message";
            var timeouts = [];
            var timeId = 0;

            var setZeroTimeout = function setZeroTimeoutFn(fn) {
                timeId += 1;
                var timeout = {
                    id: timeId,
                    fn: fn
                };
                timeouts.push(timeout);
                window.postMessage(zeroTimeoutMessageName, "*");
                return timeout;
            };

            var clearZeroTimeout = function clearZeroTimeoutFn(timeout) {
                var id = timeout;
                var numTimeouts = timeouts.length;
                for (var n = 0; n < numTimeouts; n += 1) {
                    if (timeouts[n].id === id) {
                        timeouts.splice(n, 1);
                        return;
                    }
                }
            };

            var handleZeroTimeoutMessages = function handleZeroTimeoutMessagesFn(event) {
                if (event.source === window && event.data === zeroTimeoutMessageName) {
                    event.stopPropagation();

                    if (timeouts.length && !tz.isUnloading()) {
                        var timeout = timeouts.shift();
                        var fn = timeout.fn;
                        fn();
                    }
                }
            };
            window.addEventListener("message", handleZeroTimeoutMessages, true);

            tz.setTimeout = function (f, t) {
                if (t < 1) {
                    return (setZeroTimeout(f));
                } else {
                    var that = this;
                    return window.setTimeout(function () {
                        that.updateTime();
                        if (!that.isUnloading()) {
                            f();
                        }
                    }, t);
                }
            };

            tz.clearTimeout = function (i) {
                if (typeof i === 'object') {
                    return clearZeroTimeout(i);
                } else {
                    return window.clearTimeout(i);
                }
            };
        } else {
            tz.setTimeout = function (f, t) {
                var that = this;
                return window.setTimeout(function () {
                    that.updateTime();
                    if (!that.isUnloading()) {
                        f();
                    }
                }, t);
            };

            tz.clearTimeout = function (i) {
                return window.clearTimeout(i);
            };
        }

        var requestAnimationFrame = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame);
        if (requestAnimationFrame) {
            tz.setInterval = function (f, t) {
                var that = this;
                if (Math.abs(t - (1000 / 60)) <= 1) {
                    var interval = {
                        enabled: true
                    };
                    var nextFrameTime = (getTime() + 16.6);
                    var wrap1 = function wrap1() {
                        if (interval.enabled) {
                            var currentTime = getTime();
                            var diff = (currentTime - nextFrameTime);
                            if (0 <= diff) {
                                if (diff > 50) {
                                    nextFrameTime = (currentTime + 16.6);
                                } else {
                                    nextFrameTime += 16.6;
                                }
                                that.updateTime();
                                if (!that.isUnloading()) {
                                    f();
                                }
                            }
                            requestAnimationFrame(wrap1, that.canvas);
                        }
                    };
                    requestAnimationFrame(wrap1, that.canvas);
                    return interval;
                } else {
                    var wrap2 = function wrap2() {
                        that.updateTime();
                        if (!that.isUnloading()) {
                            f();
                        }
                    };
                    return window.setInterval(wrap2, t);
                }
            };

            tz.clearInterval = function (i) {
                if (typeof i === 'object') {
                    i.enabled = false;
                } else {
                    window.clearInterval(i);
                }
            };
        }

        tz.canvas = canvas;
        tz.networkDevice = null;
        tz.inputDevice = null;
        tz.physicsDevice = null;
        tz.soundDevice = null;
        tz.graphicsDevice = null;

        if (fillParent) {
            // Resize canvas to fill parent
            tz.resizeCanvas = function () {
                if (document.fullscreenElement === canvas || document.mozFullScreenElement === canvas || document.webkitFullscreenElement === canvas) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                } else {
                    var parentNode = canvas.parentNode;
                    canvas.width = parentNode.clientWidth;
                    canvas.height = parentNode.clientHeight;
                }
            };

            tz.resizeCanvas();

            window.addEventListener('resize', tz.resizeCanvas, false);
        }

        try  {
            var previousOnBeforeUnload = window.onbeforeunload;
            window.onbeforeunload = function () {
                tz.unload();

                if (previousOnBeforeUnload) {
                    previousOnBeforeUnload.call(this);
                }
            };
        } catch (e) {
            // If the game is running as a CWS packaged app then onbeforeunload is not available
        }
        ;

        tz.time = 0;

        // System info
        var systemInfo = {
            architecture: '',
            cpuDescription: '',
            cpuVendor: '',
            numPhysicalCores: 1,
            numLogicalCores: 1,
            ramInMegabytes: 0,
            frequencyInMegaHZ: 0,
            osVersionMajor: 0,
            osVersionMinor: 0,
            osVersionBuild: 0,
            osName: navigator.platform,
            platformProfile: "desktop",
            userLocale: (navigator.language || navigator.userLanguage).replace('-', '_')
        };

        var looksLikeNetbook = function looksLikeNetbookFn() {
            var minScreenDim = Math.min(window.screen.height, window.screen.width);
            return minScreenDim < 900;
        };

        var userAgent = navigator.userAgent;
        var osIndex = userAgent.indexOf('Windows');
        if (osIndex !== -1) {
            systemInfo.osName = 'Windows';
            if (navigator.platform === 'Win64') {
                systemInfo.architecture = 'x86_64';
            } else if (navigator.platform === 'Win32') {
                systemInfo.architecture = 'x86';
            }
            osIndex += 7;
            if (userAgent.slice(osIndex, (osIndex + 4)) === ' NT ') {
                osIndex += 4;
                systemInfo.osVersionMajor = parseInt(userAgent.slice(osIndex, (osIndex + 1)), 10);
                systemInfo.osVersionMinor = parseInt(userAgent.slice((osIndex + 2), (osIndex + 4)), 10);
            }
            if (looksLikeNetbook()) {
                systemInfo.platformProfile = "tablet";
                if (debug) {
                    debug.log("Setting platformProfile to 'tablet'");
                }
            }
        } else {
            osIndex = userAgent.indexOf('Mac OS X');
            if (osIndex !== -1) {
                systemInfo.osName = 'Darwin';
                if (navigator.platform.indexOf('Intel') !== -1) {
                    systemInfo.architecture = 'x86';
                }
                osIndex += 9;
                systemInfo.osVersionMajor = parseInt(userAgent.slice(osIndex, (osIndex + 2)), 10);
                systemInfo.osVersionMinor = parseInt(userAgent.slice((osIndex + 3), (osIndex + 4)), 10);
                systemInfo.osVersionBuild = (parseInt(userAgent.slice((osIndex + 5), (osIndex + 6)), 10) || 0);
            } else {
                osIndex = userAgent.indexOf('Linux');
                if (osIndex !== -1) {
                    systemInfo.osName = 'Linux';
                    if (navigator.platform.indexOf('64') !== -1) {
                        systemInfo.architecture = 'x86_64';
                    } else if (navigator.platform.indexOf('x86') !== -1) {
                        systemInfo.architecture = 'x86';
                    }
                    if (looksLikeNetbook()) {
                        systemInfo.platformProfile = "tablet";
                        if (debug) {
                            debug.log("Setting platformProfile to 'tablet'");
                        }
                    }
                } else {
                    osIndex = userAgent.indexOf('Android');
                    if (-1 !== osIndex) {
                        systemInfo.osName = 'Android';
                        if (navigator.platform.indexOf('arm')) {
                            systemInfo.architecture = 'arm';
                        } else if (navigator.platform.indexOf('x86')) {
                            systemInfo.architecture = 'x86';
                        }
                        if (-1 !== userAgent.indexOf('Mobile')) {
                            systemInfo.platformProfile = "smartphone";
                        } else {
                            systemInfo.platformProfile = "tablet";
                        }
                    } else {
                        if (-1 !== userAgent.indexOf("iPhone") || -1 !== userAgent.indexOf("iPod")) {
                            systemInfo.osName = 'iOS';
                            systemInfo.architecture = 'arm';
                            systemInfo.platformProfile = 'smartphone';
                        } else if (-1 !== userAgent.indexOf("iPad")) {
                            systemInfo.osName = 'iOS';
                            systemInfo.architecture = 'arm';
                            systemInfo.platformProfile = 'tablet';
                        }
                    }
                }
            }
        }
        tz.systemInfo = systemInfo;

        var b64ConversionTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split('');

        tz.base64Encode = function base64EncodeFn(bytes) {
            var output = "";
            var numBytes = bytes.length;
            var valueToChar = b64ConversionTable;
            var n, chr1, chr2, chr3, enc1, enc2, enc3, enc4;

            /*jshint bitwise: false*/
            n = 0;
            while (n < numBytes) {
                chr1 = bytes[n];
                n += 1;

                enc1 = (chr1 >> 2);

                if (n < numBytes) {
                    chr2 = bytes[n];
                    n += 1;

                    if (n < numBytes) {
                        chr3 = bytes[n];
                        n += 1;

                        enc2 = (((chr1 & 3) << 4) | (chr2 >> 4));
                        enc3 = (((chr2 & 15) << 2) | (chr3 >> 6));
                        enc4 = (chr3 & 63);
                    } else {
                        enc2 = (((chr1 & 3) << 4) | (chr2 >> 4));
                        enc3 = ((chr2 & 15) << 2);
                        enc4 = 64;
                    }
                } else {
                    enc2 = ((chr1 & 3) << 4);
                    enc3 = 64;
                    enc4 = 64;
                }

                output += valueToChar[enc1];
                output += valueToChar[enc2];
                output += valueToChar[enc3];
                output += valueToChar[enc4];
            }

            /*jshint bitwise: true*/
            return output;
        };

        return tz;
    };
    return WebGLTurbulenzEngine;
})();

window.WebGLTurbulenzEngine = WebGLTurbulenzEngine;
