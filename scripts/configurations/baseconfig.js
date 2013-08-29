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

    // The prefix URL to be added to any requests for template data files
    prefixTemplatesURL: '',

    // The location of capture streams by path
    captureLookUp: {
        'noshadows_norendertarget': 'capture/noshadows_norendertarget/',
        'noshadows_rendertarget': 'capture/noshadows_rendertarget/',
        'shadows_norendertarget': 'capture/shadows_norendertarget/',
        'shadows_rendertarget': 'capture/shadows_rendertarget/',
        'waves3_noshadows_norendertarget': 'capture/waves3_noshadows_norendertarget/',
        'waves3_shadows_norendertarget': 'capture/waves3_shadows_norendertarget/',
        'zoom_shadows_norendertarget': 'capture/zoom_shadows_norendertarget/',
        'zoom2_shadows_tiltshift': 'capture/zoom2_shadows_tiltshift/',
        'zoom_noshadows_norendertarget': 'capture/zoom_noshadows_norendertarget/',
        'story_shadows_rendertarget': 'capture/story_shadows_rendertarget/'
    },

    // The total number of frames to playback
    numTotalFrames: 3600,

    // The block grouping of frames to render
    numFramesPerGroup: 60,

    // Enable anti-aliasing (where available). Note: The benchmark will warn if this is not possible.
    antialias: true,

    // Multi-sampling amount (where configurable). Note: This will be specified, but may not be set. The actual samples used will be recorded.
    multisample: 4,

    // Ensure that all frames are played of the recording
    fixedFrameRate: true,

    // Use the getScreenshot command to force the rendering to block before completion
    blockForRendering: false,

    // Record metrics per frame to process later
    outputMetrics: false,

    // The JSON template to use to save results
    resultsTemplate: "results_template"
};

BaseConfig.create = function baseConfigCreateFn()
{
    var config = new BaseConfig();
    return config;
};
