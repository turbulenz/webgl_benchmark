// Copyright (c) 2013-2014 Turbulenz Limited
/* global BaseConfig: false*/

//
// OnlineConfig - The configuration for playing the benchmark offline, with no internet connection.
//

function OnlineConfig() {}
OnlineConfig.prototype = {};

OnlineConfig.create = function onlineCreateFn()
{
    var config = BaseConfig.create();

    config.mode = 'online';
    config.captureLookUp.story_high_particles = '//tzawsuser-benchmark.s3.amazonaws.com/537d6615/';
    config.prefixAssetURL = '//tzawsuser-benchmark.s3.amazonaws.com/';
    config.useSaveAPI = false;

    return config;
};
