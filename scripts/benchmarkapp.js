//
// BenchmarkApp - class description
//

/*global TurbulenzEngine: false*/
/*global LoadingScreen: false*/
/*global PlaybackController: false*/
/*global Config: false*/

function BenchmarkApp() {}

BenchmarkApp.prototype =
{
    init : function benchmarkappInitFn()
    {
        this.playbackController.init();

        // Controls
        var pauseElement = document.getElementById("buttonPause");
        var stepElement = document.getElementById("buttonStep");
        var fixedElement = document.getElementById("checkboxFixed");

        var playbackController = this.playbackController;

        if (pauseElement)
        {
            pauseElement.onclick = function ()
            {
                playbackController.paused = !playbackController.paused;
                if (playbackController.paused)
                {
                    pauseElement.value = "Play";
                }
                else
                {
                    pauseElement.value = "Pause";
                }
                if (stepElement)
                {
                    stepElement.disabled = !playbackController.paused;
                }
            };
        }

        if (stepElement)
        {
            stepElement.disabled = true;
            stepElement.onclick = function ()
            {
                playbackController.step = true;
            };
        }

        if (fixedElement)
        {
            fixedElement.onclick = function ()
            {
                playbackController.fixedFrameRate = fixedElement.checked;
            };
        }

        var that = this;
        var requestAnimationFrame = (window.requestAnimationFrame ||
                                     window.webkitRequestAnimationFrame ||
                                     window.oRequestAnimationFrame ||
                                     window.msRequestAnimationFrame ||
                                     window.mozRequestAnimationFrame);
        function update()
        {
            if(!TurbulenzEngine.isUnloading()) {
                that.playbackController.update();
                requestAnimationFrame(update);
            }
        }

        function loadingUpdate()
        {
            var graphicsDevice = that.graphicsDevice;
            var playbackController = that.playbackController;

            if (playbackController.addingResources || playbackController.loadingResources)
            {
                playbackController.update();
                var progress = playbackController.getLoadingProgress();
                that.loadingScreen.setProgress(progress);
            }
            else
            {
                TurbulenzEngine.clearInterval(that.intervalID);
                requestAnimationFrame(update);
            }

            if (graphicsDevice.beginFrame())
            {
                graphicsDevice.clear(this.loadingColor);
                that.loadingScreen.render(1, 1);
            }
        }

        this.intervalID = TurbulenzEngine.setInterval(loadingUpdate, 1000 / 60);
    },

    shutdown : function benchmarkappShutdownFn()
    {
        if (this.intervalID)
        {
            TurbulenzEngine.clearInterval(this.intervalID);
            this.intervalID = null;
        }
        if (this.playbackController)
        {
            this.playbackController.destroy();
            this.playbackController = null;
        }
    }
};

BenchmarkApp.create = function benchmarkAppCreateFn()
{
    var benchmarkApp = new BenchmarkApp();

    var graphicsDevice = benchmarkApp.graphicsDevice = TurbulenzEngine.createGraphicsDevice({});
    var mathDevice = benchmarkApp.mathDevice = TurbulenzEngine.createMathDevice({});

    var config = benchmarkApp.config = Config.create();

    benchmarkApp.playbackController = PlaybackController.create(config, graphicsDevice);

    benchmarkApp.loadingScreen = LoadingScreen.create(graphicsDevice, mathDevice, {progress: 0});

    benchmarkApp.intervalID = null;

    return benchmarkApp;
};
