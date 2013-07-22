/*{# Copyright (c) 2013 Turbulenz Limited #}*/

/*{{ javascript("scripts/benchmarkapp.js") }}*/
/*{{ javascript("scripts/loadingscreen.js") }}*/
/*{{ javascript("scripts/playbackcontroller.js") }}*/

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
