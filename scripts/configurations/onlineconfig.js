// Copyright (c) 2013 Turbulenz Limited
/* global BaseConfig: false*/

//
// OnlineConfig - The configuration for playing the benchmark offline, with no internet connection.
//

function OnlineConfig() {}
OnlineConfig.prototype = {};

OnlineConfig.create = function onlineCreateFn()
{
    var config = BaseConfig();
    config.prefixAssetURL = '//tzawsuser-benchmark.s3.amazonaws.com/';

    var captureLookUp = config.captureLookUp;
    captureLookUp['noshadows_norendertarget']          = '//tzawsuser-benchmark.s3.amazonaws.com/51f94db3/';
    captureLookUp['noshadows_rendertarget']            = '//tzawsuser-benchmark.s3.amazonaws.com/51f94bd6/';
    captureLookUp['shadows_norendertarget']            = '//tzawsuser-benchmark.s3.amazonaws.com/51f94867/';
    captureLookUp['shadows_rendertarget']              = '//tzawsuser-benchmark.s3.amazonaws.com/51f92bf7/';
    captureLookUp['waves3_noshadows_norendertarget']   = '//tzawsuser-benchmark.s3.amazonaws.com/520106fe/';
    captureLookUp['waves3_shadows_norendertarget']     = '//tzawsuser-benchmark.s3.amazonaws.com/520109eb/';
    captureLookUp['zoom_shadows_norendertarget']       = '//tzawsuser-benchmark.s3.amazonaws.com/5200c983/';
    captureLookUp['zoom_noshadows_norendertarget']     = '//tzawsuser-benchmark.s3.amazonaws.com/5200c983/';

    return config;
};
