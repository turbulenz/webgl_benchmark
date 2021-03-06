/* Generated by benchmarkrunner.py */
/*globals OfflineConfig: false*/
/*globals updateDictFromQueryString: false*/

//
// Name: story_high_particles
//
// Config - The offline configuration, to run without an internet connection or local server
//

function Config() {}
Config.prototype = {};

Config.create = function configCreateFn()
{
    var config = OfflineConfig.create();
    config.defaultCapture = "story_high_particles";
    config.resultsTemplate = "results_template-default";
    
    config.defaultSequenceName = "Story";
    config.defaultTestName = "story_flythrough_full";
    config.streamIDs = {"story_high_particles": "537d6615"};
    updateDictFromQueryString(config);
    return config;
};