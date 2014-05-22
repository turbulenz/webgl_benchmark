// Copyright (c) 2014 Turbulenz Limited
/* global BaseConfig: false*/

//
// StaticConfig - The configuration for playing the benchmark hosted on a static site
//

function StaticConfig() {}
StaticConfig.prototype = {};

StaticConfig.create = function staticCreateFn()
{
    var config = BaseConfig.create();

    config.mode = "online";
    config.captureLookUp.story_high_particles = 'capture/story_high_particles/537d6615/';
    config.prefixAssetURL = "capture/";
    config.useSaveAPI = false;

    return config;
};
