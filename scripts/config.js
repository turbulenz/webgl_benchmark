//
// Config - class description
//

function Config() {}

Config.prototype =
{
    capturePath: 'capture/',
    numTotalFrames: 3600,
    numFramesPerGroup: 60,
    // only works for 'norendertarget' captures
    multisample: 4,

    fixedFrameRate: false,

    // use getScreenshot to force the rendering to complete
    blockForRendering: false,

    outputMetrics: false
};

Config.create = function configCreateFn()
{
    var config = new Config();

    return config;
};
