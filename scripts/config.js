//
// Config - class description
//

function Config() {}

Config.prototype =
{
    defaultCapture: 'shadows_norendertarget',
    prefixAssetURL: '//tzawsuser-benchmark.s3.amazonaws.com/',
    captureLookUp: {
        //'noshadows_norendertarget': 'capture/noshadows_norendertarget/',
        //'noshadows_rendertarget': 'capture/noshadows_rendertarget/',
        //'shadows_norendertarget': 'capture/shadows_norendertarget/',
        //'shadows_rendertarget': 'capture/shadows_rendertarget/'

        'noshadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94db3/',
        'noshadows_rendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94bd6/',
        'shadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94867/',
        'shadows_rendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f92bf7/'
    },
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
