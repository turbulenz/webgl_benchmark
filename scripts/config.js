/* Generated by benchmarkrunner.py */
/*globals StaticConfig: false*/

//
// Name: story_high_particles
//
// Config - The static configuration, to run hosted on a static site
//

function Config() {}
Config.prototype = {};

Config.create = function configCreateFn()
{
    var config = StaticConfig.create();
    config.defaultCapture = "story_high_particles";
    config.resultsTemplate = "results_template-default";
    
    config.defaultSequenceName = "Story";
    config.defaultTestName = "story_flythrough_full";
    config.streamIDs = {"story_high_particles": "537d6615"};
    
    return config;
};