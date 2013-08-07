//
// Config - class description
//

function Config() {}

Config.prototype =
{
    defaultCapture: 'zoom_shadows_norendertarget',
    prefixAssetURL: '//tzawsuser-benchmark.s3.amazonaws.com/',
    captureLookUp: {
        //'noshadows_norendertarget': 'capture/noshadows_norendertarget/',
        //'noshadows_rendertarget': 'capture/noshadows_rendertarget/',
        //'shadows_norendertarget': 'capture/shadows_norendertarget/',
        //'shadows_rendertarget': 'capture/shadows_rendertarget/',
        //'waves3_noshadows_norendertarget': 'capture/waves3_noshadows_norendertarget/',
        'waves3_shadows_norendertarget': 'capture/waves3_shadows_norendertarget/',
        //'zoom_shadows_norendertarget': 'capture/zoom_shadows_norendertarget/',
        'zoom_noshadows_norendertarget': 'capture/zoom_noshadows_norendertarget/',

        'zoom_shadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/5200c983/',
        'waves3_noshadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/520106fe/',
        'waves3_shadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/520109eb/',

        'noshadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94db3/',
        'noshadows_rendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94bd6/',
        'shadows_norendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f94867/',
        'shadows_rendertarget': '//tzawsuser-benchmark.s3.amazonaws.com/51f92bf7/',
        'noshadows_norendertarget_waves': '//tzawsuser-benchmark.s3.amazonaws.com/51fbc94c/'
    },
    numTotalFrames: 3600,
    numFramesPerGroup: 60,
    // only works for 'norendertarget' captures
    multisample: 4,

    fixedFrameRate: true,
    // use getScreenshot to force the rendering to complete
    blockForRendering: false,

    outputMetrics: false
};

Config.create = function configCreateFn()
{
    var config = new Config();

    return config;
};
