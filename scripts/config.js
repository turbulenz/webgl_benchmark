//
// Config - class description
//

function Config() {}

Config.prototype =
{
    capturePath: 'capture/',
    numTotalFrames: 3600,
    numFramesPerGroup: 60,

    // render as fast as possible
    renderInterval: 0,
    // render at recorded speed
    //renderInterval: 1000 / 60,

    // use getScreenShot to force the rendering to complete
    blockForRendering: false
};

Config.create = function configCreateFn()
{
    var config = new Config();

    return config;
};
