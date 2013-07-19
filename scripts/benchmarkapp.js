//
// BenchmarkApp - class description
//

/*global TurbulenzEngine: false*/
/*global PlaybackController: false*/

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
        function update()
        {
            that.playbackController.update();
        }

        this.intervalID = TurbulenzEngine.setInterval(update, 1000 / 60);
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
    benchmarkApp.playbackController = PlaybackController.create(graphicsDevice);

    benchmarkApp.intervalID = null;

    return benchmarkApp;
};
