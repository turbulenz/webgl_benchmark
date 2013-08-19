// Copyright (c) 2013 Turbulenz Limited
/* global BaseConfig: false*/

//
// LocalConfig - The configuration for playing the benchmark offline, with no internet connection.
//

function LocalConfig() {}
LocalConfig.prototype = {};

LocalConfig.create = function localCreateFn()
{
    var config = new BaseConfig();
    config.prefixAssetURL = '';

    var captureLookUp = config.captureLookUp;
    captureLookUp['noshadows_norendertarget']          = 'capture/noshadows_norendertarget/';
    captureLookUp['noshadows_rendertarget']            = 'capture/noshadows_rendertarget/';
    captureLookUp['shadows_norendertarget']            = 'capture/shadows_norendertarget/';
    captureLookUp['shadows_rendertarget']              = 'capture/shadows_rendertarget/';
    captureLookUp['waves3_noshadows_norendertarget']   = 'capture/waves3_noshadows_norendertarget/';
    captureLookUp['waves3_shadows_norendertarget']     = 'capture/waves3_shadows_norendertarget/';
    captureLookUp['zoom_shadows_norendertarget']       = 'capture/zoom_shadows_norendertarget/';
    captureLookUp['zoom_noshadows_norendertarget']     = 'capture/zoom_noshadows_norendertarget/';

    return config;
};
