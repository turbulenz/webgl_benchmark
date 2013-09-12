// Copyright (c) 2011-2012 Turbulenz Limited
/*global TurbulenzEngine: false*/
/*global TurbulenzBridge*/
/*global TurbulenzServices*/
//
// API
//
var LeaderboardManager = (function () {
    function LeaderboardManager() {
        this.getTypes = {
            top: 'top',
            near: 'near',
            above: 'above',
            below: 'below'
        };
        this.maxGetSize = 32;
    }
    LeaderboardManager.prototype.getOverview = function (spec, callbackFn, errorCallbackFn) {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta) {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var that = this;
        var getOverviewCallback = function getOverviewCallbackFn(jsonResponse, status) {
            if (status === 200) {
                var overview = jsonResponse.data;
                var overviewLength = overview.length;
                for (var i = 0; i < overviewLength; i += 1) {
                    var leaderboard = overview[i];
                    if (leaderboard.hasOwnProperty('score')) {
                        that.meta[leaderboard.key].bestScore = leaderboard.score;
                    }
                }
                callbackFn(overview);
            } else {
                errorCallback("LeaderboardManager.getKeys failed with status " + status + ": " + jsonResponse.msg, status, that.getOverview, [spec, callbackFn]);
            }
        };

        var dataSpec = {};
        if (spec.friendsOnly) {
            dataSpec.friendsonly = spec.friendsOnly && 1;
        }

        this.service.request({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug,
            method: 'GET',
            data: dataSpec,
            callback: getOverviewCallback,
            requestHandler: this.requestHandler
        });
    };

    LeaderboardManager.prototype.getAggregates = function (spec, callbackFn, errorCallbackFn) {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta) {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var that = this;
        var getAggregatesCallback = function getAggregatesCallbackFn(jsonResponse, status) {
            if (status === 200) {
                var aggregates = jsonResponse.data;
                callbackFn(aggregates);
            } else {
                errorCallback("LeaderboardManager.getKeys failed with status " + status + ": " + jsonResponse.msg, status, that.getAggregates, [spec, callbackFn, errorCallbackFn]);
            }
        };

        var dataSpec = {};

        this.service.request({
            url: '/api/v1/leaderboards/aggregates/read/' + that.gameSession.gameSlug,
            method: 'GET',
            data: dataSpec,
            callback: getAggregatesCallback,
            requestHandler: this.requestHandler
        });
    };

    LeaderboardManager.prototype.getRaw = function (key, spec, callbackFn, errorCallbackFn) {
        var that = this;
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        var getCallback = function getCallbackFn(jsonResponse, status) {
            if (status === 200) {
                var data = jsonResponse.data;
                callbackFn(data);
            } else {
                errorCallback("LeaderboardManager.get failed with status " + status + ": " + jsonResponse.msg, status, that.get, [key, spec, callbackFn]);
            }
        };

        this.service.request({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug + '/' + key,
            method: 'GET',
            data: spec,
            callback: getCallback,
            requestHandler: this.requestHandler
        });
        return true;
    };

    LeaderboardManager.prototype.get = function (key, spec, callbackFn, errorCallbackFn) {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta) {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return false;
        }

        var meta = this.meta[key];
        if (!meta) {
            errorCallback("No leaderboard with the name '" + key + "' exists.");
            return false;
        }

        var dataSpec = {};

        if (spec.numNear) {
            dataSpec.type = this.getTypes.near;
            dataSpec.size = spec.numNear * 2 + 1;
        }
        if (spec.numTop) {
            dataSpec.type = this.getTypes.top;
            dataSpec.size = spec.numTop;
        }

        if (spec.size) {
            dataSpec.size = spec.size;
        }
        if (!dataSpec.size) {
            // default value
            dataSpec.size = 9;
        }
        if (dataSpec.size > this.maxGetSize) {
            throw new Error('Leaderboard get request size must be smaller than ' + this.maxGetSize);
        }

        if (spec.friendsOnly) {
            dataSpec.friendsonly = spec.friendsOnly && 1;
        }

        if (spec.type) {
            dataSpec.type = spec.type;
        }
        if (spec.hasOwnProperty('score')) {
            dataSpec.score = spec.score;
        }
        if (spec.hasOwnProperty('time')) {
            dataSpec.time = spec.time;
        }

        var that = this;
        var callbackWrapper = function callbackWrapperFn(data) {
            var lbr = LeaderboardResult.create(that, key, dataSpec, data);
            callbackFn(key, lbr);
        };

        return this.getRaw(key, dataSpec, callbackWrapper, errorCallbackFn);
    };

    LeaderboardManager.prototype.set = function (key, score, callbackFn, errorCallbackFn) {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta) {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var meta = this.meta[key];
        if (!meta) {
            errorCallback("No leaderboard with the name '" + key + "' exists.");
            return;
        }

        if (typeof (score) !== 'number' || isNaN(score)) {
            throw new Error("Score must be a number.");
        }

        if (score < 0) {
            throw new Error("Score cannot be negative.");
        }

        var sortBy = meta.sortBy;
        var bestScore = meta.bestScore;

        if ((bestScore && ((sortBy === 1 && score <= bestScore) || (sortBy === -1 && score >= bestScore)))) {
            TurbulenzEngine.setTimeout(function () {
                callbackFn(key, score, false, bestScore);
            }, 0);
            return;
        }

        var that = this;
        var setCallback = function setCallbackFn(jsonResponse, status) {
            if (status === 200) {
                var data = jsonResponse.data;
                var bestScore = data.bestScore || data.lastScore || null;
                var newBest = data.newBest || false;
                if (newBest) {
                    bestScore = score;

                    // Assemble data for notification system.
                    var scoreData = {
                        key: key,
                        title: meta.title,
                        sortBy: meta.sortBy,
                        score: score,
                        prevBest: data.prevBest,
                        gameSlug: that.gameSession.gameSlug
                    };

                    // Trigger notification (only for new best scores).
                    TurbulenzBridge.updateLeaderBoard(scoreData);
                }
                meta.bestScore = bestScore;
                callbackFn(key, score, newBest, bestScore);
            } else {
                errorCallback("LeaderboardManager.set failed with status " + status + ": " + jsonResponse.msg, status, that.set, [key, score, callbackFn]);
            }
        };

        var dataSpec = {
            score: score,
            gameSessionId: that.gameSessionId,
            key: undefined
        };
        var url = '/api/v1/leaderboards/scores/set/' + key;

        if (TurbulenzServices.bridgeServices) {
            TurbulenzServices.addSignature(dataSpec, url);
            dataSpec.key = key;
            TurbulenzServices.callOnBridge('leaderboard.set', dataSpec, function unpackResponse(response) {
                setCallback(response, response.status);
            });
        } else {
            this.service.request({
                url: url,
                method: 'POST',
                data: dataSpec,
                callback: setCallback,
                requestHandler: this.requestHandler,
                encrypt: true
            });
        }
    };

    // ONLY available on Local and Hub
    LeaderboardManager.prototype.reset = function (callbackFn, errorCallbackFn) {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta) {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var that = this;
        var resetCallback = function resetCallbackFn(jsonResponse, status) {
            if (status === 200) {
                var meta = that.meta;
                var m;
                for (m in meta) {
                    if (meta.hasOwnProperty(m)) {
                        delete meta[m].bestScore;
                    }
                }
                if (callbackFn) {
                    callbackFn();
                }
            } else {
                errorCallback("LeaderboardManager.reset failed with status " + status + ": " + jsonResponse.msg, status, that.reset, [callbackFn]);
            }
        };

        // for testing only (this is not available on the Gamesite)
        this.service.request({
            url: '/api/v1/leaderboards/scores/remove-all/' + this.gameSession.gameSlug,
            method: 'POST',
            callback: resetCallback,
            requestHandler: this.requestHandler
        });
    };

    LeaderboardManager.create = function (requestHandler, gameSession, leaderboardMetaReceived, errorCallbackFn) {
        if (!TurbulenzServices.available()) {
            // Call error callback on a timeout to get the same behaviour as the ajax call
            TurbulenzEngine.setTimeout(function () {
                if (errorCallbackFn) {
                    errorCallbackFn('TurbulenzServices.createLeaderboardManager could not load leaderboards meta data');
                }
            }, 0);
            return null;
        }

        var leaderboardManager = new LeaderboardManager();

        leaderboardManager.gameSession = gameSession;
        leaderboardManager.gameSessionId = gameSession.gameSessionId;
        leaderboardManager.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
        leaderboardManager.service = TurbulenzServices.getService('leaderboards');
        leaderboardManager.requestHandler = requestHandler;
        leaderboardManager.ready = false;

        leaderboardManager.service.request({
            url: '/api/v1/leaderboards/read/' + gameSession.gameSlug,
            method: 'GET',
            callback: function createLeaderboardManagerAjaxErrorCheck(jsonResponse, status) {
                if (status === 200) {
                    var metaArray = jsonResponse.data;
                    if (metaArray) {
                        leaderboardManager.meta = {};
                        var metaLength = metaArray.length;
                        var i;
                        for (i = 0; i < metaLength; i += 1) {
                            var board = metaArray[i];
                            leaderboardManager.meta[board.key] = board;
                        }
                    }
                    leaderboardManager.ready = true;
                    if (leaderboardMetaReceived) {
                        leaderboardMetaReceived(leaderboardManager);
                    }
                } else {
                    leaderboardManager.errorCallbackFn("TurbulenzServices.createLeaderboardManager error with HTTP status " + status + ": " + jsonResponse.msg, status);
                }
            },
            requestHandler: requestHandler,
            neverDiscard: true
        });

        return leaderboardManager;
    };
    LeaderboardManager.version = 1;
    return LeaderboardManager;
})();

var LeaderboardResult = (function () {
    function LeaderboardResult() {
    }
    LeaderboardResult.prototype.computeOverlap = function () {
        // calculates the number of scores that the leaderboard results have overlapped
        // this only happens at the end of the leaderboards
        var results = this.results;
        var overlap = 0;
        if (results.top || results.bottom) {
            var ranking = results.ranking;
            var rankingLength = ranking.length;
            var sortBy = this.leaderboardManager.meta[this.key].sortBy;
            var aboveType = this.leaderboardManager.getTypes.above;
            var specScore = results.spec.score;
            var specTime = results.spec.time;

            var i;
            for (i = 0; i < rankingLength; i += 1) {
                var rank = ranking[i];

                if (rank.score * sortBy < specScore * sortBy || (rank.score === specScore && rank.time >= specTime)) {
                    if (results.spec.type === aboveType) {
                        overlap = rankingLength - i;
                    } else {
                        overlap = i + 1;
                    }
                    break;
                }
            }
        }
        results.overlap = overlap;
    };

    LeaderboardResult.prototype.getPageOffset = function (type, offsetIndex, callbackFn, errorCallbackFn) {
        var offsetScore = this.results.ranking[offsetIndex];
        if (!offsetScore) {
            TurbulenzEngine.setTimeout(callbackFn, 0);
            return false;
        }

        var newSpec = {
            type: type,
            score: offsetScore.score,
            time: offsetScore.time,
            size: this.requestSize,
            // remeber to map to backend lowercase format!
            friendsonly: this.originalSpec.friendsOnly && 1 || 0
        };

        // store the spec for refresh calls
        this.spec = newSpec;

        var that = this;
        function parseResults(data) {
            that.parseResults(that.key, newSpec, data);
            that.computeOverlap();
            callbackFn();
        }

        this.leaderboardManager.getRaw(this.key, newSpec, parseResults, errorCallbackFn);
        return true;
    };

    LeaderboardResult.prototype.viewOperationBegin = function () {
        if (this.viewLock) {
            return false;
        }
        this.viewLock = true;
        return true;
    };

    LeaderboardResult.prototype.viewOperationEnd = function (callbackFn) {
        // unlock the view object so other page/scroll calls can be made
        this.viewLock = false;

        var that = this;
        function callbackWrapperFn() {
            callbackFn(that.key, that);
        }

        if (callbackFn) {
            TurbulenzEngine.setTimeout(callbackWrapperFn, 0);
        }
    };

    LeaderboardResult.prototype.wrapViewOperationError = function (errorCallbackFn) {
        var that = this;
        return function errorWrapper(errorMsg, httpStatus, calledByFn, calledByParams) {
            // unlock the view object so other page/scroll calls can be made
            that.viewLock = false;
            errorCallbackFn(errorMsg, httpStatus, calledByFn, calledByParams);
        };
    };

    LeaderboardResult.prototype.refresh = function (callbackFn, errorCallbackFn) {
        if (!this.viewOperationBegin()) {
            return false;
        }
        var that = this;
        function parseResults(data) {
            that.parseResults(that.key, that.spec, data);
            that.computeOverlap();
            that.invalidView = true;

            if (that.onSlidingWindowUpdate) {
                that.onSlidingWindowUpdate();
            }
            that.viewOperationEnd(callbackFn);
        }

        this.leaderboardManager.getRaw(this.key, this.spec, parseResults, this.wrapViewOperationError(errorCallbackFn));

        return true;
    };

    LeaderboardResult.prototype.moveUp = function (offset, callbackFn, errorCallbackFn) {
        if (!this.viewOperationBegin()) {
            return false;
        }

        var that = this;
        function newResult() {
            var results = that.results;
            that.viewTop = Math.max(0, results.ranking.length - that.viewSize - results.overlap);
            that.invalidView = true;

            if (that.onSlidingWindowUpdate) {
                that.onSlidingWindowUpdate();
            }
            that.viewOperationEnd(callbackFn);
        }

        if (this.viewTop - offset < 0) {
            if (this.results.top) {
                this.viewTop = 0;
                this.viewOperationEnd(callbackFn);
            } else {
                this.getPageOffset(this.leaderboardManager.getTypes.above, this.viewTop + this.viewSize - offset, newResult, this.wrapViewOperationError(errorCallbackFn));
            }
            return true;
        }

        this.viewTop -= offset;
        this.invalidView = true;
        this.viewOperationEnd(callbackFn);
        return true;
    };

    LeaderboardResult.prototype.moveDown = function (offset, callbackFn, errorCallbackFn) {
        if (!this.viewOperationBegin()) {
            return false;
        }

        var that = this;
        function newResult() {
            var results = that.results;
            that.viewTop = Math.min(results.overlap, Math.max(results.ranking.length - that.viewSize, 0));
            that.invalidView = true;

            if (that.onSlidingWindowUpdate) {
                that.onSlidingWindowUpdate();
            }
            that.viewOperationEnd(callbackFn);
        }

        var results = this.results;
        if (this.viewTop + this.viewSize + offset > results.ranking.length) {
            if (results.bottom) {
                var orginalViewTop = this.viewTop;
                this.viewTop = Math.max(results.ranking.length - this.viewSize, 0);
                this.invalidView = this.invalidView || (this.viewTop !== orginalViewTop);
                this.viewOperationEnd(callbackFn);
            } else {
                this.getPageOffset(this.leaderboardManager.getTypes.below, this.viewTop + offset - 1, newResult, this.wrapViewOperationError(errorCallbackFn));
            }
            return true;
        }

        this.viewTop += offset;
        this.invalidView = true;
        this.viewOperationEnd(callbackFn);
        return true;
    };

    LeaderboardResult.prototype.pageUp = function (callbackFn, errorCallbackFn) {
        return this.moveUp(this.viewSize, callbackFn, errorCallbackFn);
    };

    LeaderboardResult.prototype.pageDown = function (callbackFn, errorCallbackFn) {
        return this.moveDown(this.viewSize, callbackFn, errorCallbackFn);
    };

    LeaderboardResult.prototype.scrollUp = function (callbackFn, errorCallbackFn) {
        return this.moveUp(1, callbackFn, errorCallbackFn);
    };

    LeaderboardResult.prototype.scrollDown = function (callbackFn, errorCallbackFn) {
        return this.moveDown(1, callbackFn, errorCallbackFn);
    };

    LeaderboardResult.prototype.getView = function () {
        if (this.invalidView) {
            var viewTop = this.viewTop;
            var viewSize = this.viewSize;
            var results = this.results;
            var ranking = results.ranking;
            var rankingLength = ranking.length;

            var playerIndex = null;
            if (results.playerIndex !== undefined) {
                playerIndex = results.playerIndex - viewTop;
                if (playerIndex < 0 || playerIndex >= viewSize) {
                    playerIndex = null;
                }
            }

            this.view = {
                ranking: ranking.slice(viewTop, Math.min(viewTop + viewSize, rankingLength)),
                top: results.top && (viewTop === 0),
                bottom: results.bottom && (viewTop >= rankingLength - viewSize),
                player: results.player,
                playerIndex: playerIndex
            };
        }
        return this.view;
    };

    LeaderboardResult.prototype.getSlidingWindow = function () {
        return this.results;
    };

    LeaderboardResult.prototype.parseResults = function (key, spec, data) {
        var results = {
            spec: spec,
            overlap: null
        };

        var player = results.player = data.player;
        var ranking = results.ranking = data.ranking;

        var entities = data.entities;
        var playerUsername;

        if (player) {
            this.leaderboardManager.meta[key].bestScore = player.score;
            if (entities) {
                player.user = entities[player.user];
            }
            playerUsername = player.user.username;
        }

        var rankingLength = ranking.length;
        var i;
        for (i = 0; i < rankingLength; i += 1) {
            var rank = ranking[i];
            if (entities) {
                rank.user = entities[rank.user];
            }

            if (rank.user.username === playerUsername) {
                results.playerIndex = i;
            }
        }

        results.top = data.top;
        results.bottom = data.bottom;

        this.results = results;
        return results;
    };

    LeaderboardResult.create = function (leaderboardManager, key, spec, data) {
        var leaderboardResult = new LeaderboardResult();

        leaderboardResult.leaderboardManager = leaderboardManager;

        leaderboardResult.key = key;

        // patch up friendsOnly for frontend
        spec.friendsOnly = (0 != spec.friendsonly);
        delete spec.friendsonly;

        // store the original spec used to create the results
        leaderboardResult.originalSpec = spec;

        // the spec used to generate the current results
        leaderboardResult.spec = spec;

        var results = leaderboardResult.results = leaderboardResult.parseResults(key, spec, data);

        leaderboardResult.viewTop = 0;
        leaderboardResult.viewSize = spec.size;

        // lock to stop multiple synchronous view operations
        // as that will have unknown consequences
        leaderboardResult.viewLock = false;

        // for lazy evaluation
        leaderboardResult.view = {
            player: results.player,
            ranking: results.ranking,
            playerIndex: results.playerIndex,
            top: results.top,
            bottom: results.bottom
        };
        leaderboardResult.invalidView = false;

        // callback called when the results is requested
        leaderboardResult.onSlidingWindowUpdate = null;

        return leaderboardResult;
    };
    return LeaderboardResult;
})();

LeaderboardResult.prototype.version = 1;
LeaderboardResult.prototype.requestSize = 64;
