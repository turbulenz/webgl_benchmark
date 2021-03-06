/*{# Copyright (c) 2013 Turbulenz Limited #}*/

/*{# Configuration files #}*/
/*{{ javascript("scripts/configurations/baseconfig.js") }}*/
/*{{ javascript("scripts/configurations/onlineconfig.js") }}*/
/*{{ javascript("scripts/configurations/offlineconfig.js") }}*/
/*{{ javascript("scripts/configurations/staticconfig.js") }}*/

/*{# benchmark files #}*/
/*{{ javascript("scripts/benchmarkapp.js") }}*/
/*{{ javascript("scripts/benchmarkgraph.js") }}*/
/*{{ javascript("scripts/loadingscreen.js") }}*/
/*{{ javascript("scripts/resultsscreen.js") }}*/
/*{{ javascript("scripts/playbackcontroller.js") }}*/
/*{{ javascript("scripts/config.js") }}*/
/*{{ javascript("scripts/querystring.js") }}*/
/*{{ javascript("scripts/simplefonts.js") }}*/

/*{# jslib files #}*/
/*{{ javascript("jslib/services/turbulenzservices.js") }}*/
/*{{ javascript("jslib/services/mappingtable.js") }}*/
/*{{ javascript("jslib/services/turbulenzbridge.js") }}*/
/*{{ javascript("jslib/services/userdatamanager.js") }}*/
/*{{ javascript("jslib/services/gamesession.js") }}*/
/*{{ javascript("jslib/shadermanager.js") }}*/
/*{{ javascript("jslib/fontmanager.js") }}*/
/*{{ javascript("jslib/texturemanager.js") }}*/
/*{{ javascript("jslib/requesthandler.js") }}*/

/*{# updated jslib files #}*/
/*{{ javascript("scripts/capturegraphicsdevice.js") }}*/

/*global TurbulenzEngine: false*/
/*global BenchmarkApp: false*/

TurbulenzEngine.onload = function onloadFn() {
    var benchmarkApp = BenchmarkApp.create(null);
    TurbulenzEngine.onunload = function onUnloadFn() {
        benchmarkApp.shutdown();
    };
    benchmarkApp.init();
};
