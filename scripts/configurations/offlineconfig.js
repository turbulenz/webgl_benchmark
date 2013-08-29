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

    var captureLookUp = config.captureLookUp;
    captureLookUp['noshadows_norendertarget']          = 'capture/noshadows_norendertarget/';
    captureLookUp['noshadows_rendertarget']            = 'capture/noshadows_rendertarget/';
    captureLookUp['shadows_norendertarget']            = 'capture/shadows_norendertarget/';
    captureLookUp['shadows_rendertarget']              = 'capture/shadows_rendertarget/';
    captureLookUp['waves3_noshadows_norendertarget']   = 'capture/waves3_noshadows_norendertarget/';
    captureLookUp['waves3_shadows_norendertarget']     = 'capture/waves3_shadows_norendertarget/';
    captureLookUp['zoom_shadows_norendertarget']       = 'capture/zoom_shadows_norendertarget/';
    captureLookUp['zoom2_shadows_tiltshift']           = 'capture/zoom2_shadows_tiltshift/';

    config.prefixAssetURL = "capture/";
    config.prefixTemplatesURL = "config/templates/offline/";

    return config;
};
