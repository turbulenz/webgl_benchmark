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
    captureLookUp['shadows_norendertarget2']           = 'capture/shadows_norendertarget2/';
    captureLookUp['shadows_rendertarget2']             = 'capture/shadows_rendertarget2/';
    captureLookUp['noshadows_rendertarget2']           = 'capture/noshadows_rendertarget2/';
    captureLookUp['noshadows_norendertarget2']         = 'capture/noshadows_norendertarget2/';
    captureLookUp['zoom2_shadows_norendertarget']      = 'capture/zoom2_shadows_norendertarget/';
    captureLookUp['seige_shadows_norendertarget']      = 'capture/seige_shadows_norendertarget/';
    captureLookUp['story_shadows_rendertarget']        = 'capture/story_shadows_rendertarget/';
    captureLookUp['story_high']                        = 'capture/story_high/';

    config.prefixAssetURL = "capture/";
    config.prefixTemplatesURL = "assets/config/templates/offline/";

    return config;
};
