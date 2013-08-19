/*{# Copyright (c) 2013 Turbulenz Limited #}*/

/*{# Configuration files #}*/
/*{{ javascript("scripts/configurations/baseconfig.js") }}*/
/*{{ javascript("scripts/configurations/onlineconfig.js") }}*/
/*{{ javascript("scripts/configurations/offlineconfig.js") }}*/
/*{{ javascript("scripts/configurations/localconfig.js") }}*/

/*{{ javascript("scripts/benchmarkapp.js") }}*/
/*{{ javascript("scripts/loadingscreen.js") }}*/
/*{{ javascript("scripts/playbackcontroller.js") }}*/
/*{{ javascript("scripts/config.js") }}*/
/*{{ javascript("scripts/querystring.js") }}*/

// jslib files
/*{{ javascript("jslib/capturegraphicsdevice.js") }}*/

/*global TurbulenzEngine: false*/
/*global BenchmarkApp: false*/

TurbulenzEngine.onload = function onloadFn() {
    var benchmarkApp = BenchmarkApp.create(null);
    TurbulenzEngine.onunload = function onUnloadFn() {
        benchmarkApp.shutdown();
    };
    benchmarkApp.init();
};
