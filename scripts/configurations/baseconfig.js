// Copyright (c) 2013 Turbulenz Limited

//
// BaseConfig - The basic configuration of the app. The standard configuration to be run by all benchmarks. The configuration can be overridden.
//

function BaseConfig() {}
BaseConfig.prototype =
{
    // The mode the benchmark will run
    mode: 'default',

    // The default stream to run on start
    defaultCapture: 'story_high_particles',

    // The prefix URL to be added to any requests for capture data files
    prefixAssetURL: '',

    // The prefix URL to be added to any requests for template data files
    prefixTemplatesURL: '',

    // The location of capture streams by path
    captureLookUp: {
        'story_high_particles': 'capture/story_high_particles'
    },

    // The total number of frames to playback
    numTotalFrames: 3600,

    // The block grouping of frames to render
    numFramesPerGroup: 60,

    // Enable anti-aliasing (where available). Note: The benchmark will warn if this is not possible.
    antialias: false,

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
