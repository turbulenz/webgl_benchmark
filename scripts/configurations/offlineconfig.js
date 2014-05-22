// Copyright (c) 2013 Turbulenz Limited
/* global BaseConfig: false*/

//
// OfflineConfig - The configuration for playing the benchmark offline, with no internet connection.
//

function OfflineConfig() {}
OfflineConfig.prototype = {};

OfflineConfig.create = function offlineCreateFn()
{
    var config = BaseConfig.create();

    config.mode = "offline";
    config.captureLookUp.story_high_particles = 'capture/story_high_particles/537d6615/';
    config.prefixTemplatesURL = 'assets/config/templates/' + config.mode + '/';
    config.prefixAssetURL = "capture/";

    return config;
};
