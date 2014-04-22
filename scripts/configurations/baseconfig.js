// Copyright (c) 2013 Turbulenz Limited

//
// BaseConfig - The basic configuration of the app. The standard configuration to be run by all benchmarks. The configuration can be overridden.
//

function BaseConfig() {}
BaseConfig.prototype =
{
    // The default stream to run on start
    defaultCapture: 'story_shadows_rendertarget',

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
        'story_shadows_rendertarget': 'capture/story_shadows_rendertarget/',
        'story_high': 'capture/story_high/',
        'story_high_fxaa': 'capture/story_high_fxaa/',
        'story_high_nofxaa': 'capture/story_high_nofxaa/',
        'story_high_norendertarget': 'capture/story_high_norendertarget/',
        'story_high_particles': 'capture/story_high_particles'
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
    resultsTemplate: "results_template",

    // The name of the default sequence to run on start
    defaultSequenceName: "",

    // The version of the default sequence
    defaultSequenceVersion: "",

    // The name of the default test to run on start
    defaultTestName: "",

    // A dictionary containing the mapping of a stream ID to the configuration information for that stream
    streamsConfig: {},

    // A mapping of capture names to stream IDs
    streamIDs: {},

    // Save the results using the server based save API
    useSaveAPI: true,

    // Launch the graph on start
    graphOnStart: false,

    // Launch the graph at the end
    graphOnEnd: false,

    // Prompt for hardware name (if not specified)
    promptHardwareName: true,

    // Enable save button
    enableSave: true,

    // Enable the ability to download as a CSV
    enableDownloadCSV: true
};

BaseConfig.create = function baseConfigCreateFn()
{
    var config = new BaseConfig();
    return config;
};
