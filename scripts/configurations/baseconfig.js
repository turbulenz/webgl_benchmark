// Copyright (c) 2013 Turbulenz Limited

//
// BaseConfig - The basic configuration of the app. The standard configuration to be run by all benchmarks. The configuration can be overridden.
//

function BaseConfig() {}
BaseConfig.prototype =
{
    // The default stream to run on start
    defaultCapture: 'noshadows_norendertarget',

    // The prefix URL to be added to any requests for capture data files
    prefixAssetURL: '',

    // The location of capture streams by path
    captureLookUp: {
        'noshadows_norendertarget': 'capture/noshadows_norendertarget/',
        'noshadows_rendertarget': 'capture/noshadows_rendertarget/',
        'shadows_norendertarget': 'capture/shadows_norendertarget/',
        'shadows_rendertarget': 'capture/shadows_rendertarget/',
        'waves3_noshadows_norendertarget': 'capture/waves3_noshadows_norendertarget/',
        'waves3_shadows_norendertarget': 'capture/waves3_shadows_norendertarget/',
        'zoom_shadows_norendertarget': 'capture/zoom_shadows_norendertarget/',
        'zoom_noshadows_norendertarget': 'capture/zoom_noshadows_norendertarget/'
    },

    // The total number of frames to playback
    numTotalFrames: 3600,

    // The block grouping of frames to render
    numFramesPerGroup: 60,

    // Enable multi-sampling (where available). Note: only works for 'norendertarget' captures
    multisample: 4,

    // Ensure that all frames are played of the recording
    fixedFrameRate: true,

    // Use the getScreenshot command to force the rendering to block before completion
    blockForRendering: false,

    // Record metrics per frame to process later
    outputMetrics: false
};

BaseConfig.create = function baseConfigCreateFn()
{
    var config = new BaseConfig();
    return config;
};
