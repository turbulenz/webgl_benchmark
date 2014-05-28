/*
 Copyright (c) 2014 Turbulenz Limited
*/
/*global $*/
'use strict';

$(function () {

    var webGLEnabled = true;

    // test for WebGL
    (function (window) {

        window.showError = function (params) {
            var $warning = $('#warning');
            $warning.find('#warning-title').html(params.title || '');
            $warning.find('#warning-text').html(params.text || '');
            $warning.find('#warning-custom').html(params.custom || '');

            var $link = $warning.find('#warning-link');
            $link.html(params.linkText || '');
            $link.attr('href', params.linkHREF || '#');
            $link.unbind('click');
            if (params.linkFunction)
            {
                $link.bind('click', params.linkFunction);
            }

            $warning.show();
        };

        window.hideError = function () {
            var $warning = $('#warning');
            $warning.hide();

            $warning.find('#warning-title').html('');
            $warning.find('#warning-text').html('');
            $warning.find('#warning-custom').html('');

            var $link = $warning.find('#warning-link');
            $link.html('');
            $link.attr('href', '#');
            $link.unbind('click');
        };

    }(window));


    var showWebGLDisabledError = function () {
        window.showError({
            title: "Your current web browser is a bit<br/>behind the times. Let's get it up to date!",
            text: "We need fancy new feature called WebGL to run our site in your browser. Don't worry though," +
                  "almost all the modern browsers support it. Here's some links.",
            custom: '<a class="cantplay-get-link cantplay-get-chrome" href="http://www.google.com/chrome" target="_blank">Get Google Chrome</a>' +
                    '<a class="cantplay-get-link cantplay-get-firefox" href="http://www.mozilla.org/firefox" target="_blank">Get Mozilla Firefox</a>',
            linkText: "Continue browsing anyway...",
            linkFunction: window.hideError
        });
    };

    // test for WebGL
    (function (window) {
        var modernizr = window.Modernizr;

        var realWebGLTest = function () {
            try {
                return window.WebGLRenderingContext &&
                        (window.document.createElement('canvas').getContext('webgl') ||
                         window.document.createElement('canvas').getContext('experimental-webgl'));
            } catch (e) {
                return false;
            }
        };
        modernizr.webgl = realWebGLTest();
        modernizr.fullscreen = modernizr.fullscreen || !!window.document.msExitFullscreen;

        if (!(modernizr.canvas && modernizr.webgl && (modernizr.audio || modernizr.webaudio)))
        {
            webGLEnabled = false;
        }

    }(window));



    // Attach show/hide-functions to modals
    $('.modal-container').each(function (index, element) {

        var $element = $(element);
        var $modalContent = $element.find('.modal-content');

        element.showModal = function () {
            $element.addClass('active');
        };

        element.hideModal = function () {
            $element.removeClass('active');

            if ($modalContent[0].onHideModal)
            {
                $modalContent[0].onHideModal();
            }
        };

        $element.click(element.hideModal);

        $modalContent.click(function (event) {
            event.stopPropagation();
        });

        $element.find('.modal-close-button').click(element.hideModal);

    });

    $(window).keyup(function (event) {
        if (event.keyCode === 27)
        {
            $('.modal-container').each(function (index, element) {
                element.hideModal();
            });
        }
    });



    // attach specific modal functions to screenshot-modals
    var $screenshotModal = $('#screenshot-modal');
    $('.screenshot').each(function (index, element) {

        var $element = $(element);
        index += 1;

        $element.css('background-image', 'url("/img/screenshot-' + index + '-small.png")');
        $(element).click(function () {
            $screenshotModal
                .find('.modal-content')
                .css('background-image', 'url("/img/screenshot-' + index + '-large.jpg")');
            $screenshotModal[0].showModal();
        });
    });



    // attach specific modal functions to info-modal
    $('#read-more-link').click(function () {
        $('#info-modal')[0].showModal();
    });



    var checkWebGLAndStartTest = function () {
        if (webGLEnabled)
        {
            window.location.hash = 'run';
            window.startTest();
        }
        else
        {
            showWebGLDisabledError();
        }
    };



    // add tracking functions for the page's links
    var _gaq = window._gaq;

    $('.footer-links a').click(function (event) {
        _gaq.push([ '_trackEvent', 'footerLinkClicked', $(event.currentTarget).attr('href') ]);
    });

    $('.screenshots a').click(function (event) {
        var $target = $(event.currentTarget);
        _gaq.push([ '_trackEvent', 'screenshotClicked', $target.css('background-image') ]);
    });

    $('#home-icon').click(function () {
        _gaq.push([ '_trackEvent', 'homeIconClicked' ]);
    });

    $('#read-more-link').click(function () {
        _gaq.push([ '_trackEvent', 'readMoreLinkClicked' ]);
    });

    $('#start-test').click(function (event) {
        _gaq.push([ '_trackEvent', 'testStarted' ]);
        event.preventDefault();
        event.stopPropagation();

        checkWebGLAndStartTest();
    });

    $('#play-game').click(function () {
        _gaq.push([ '_trackEvent', 'linkedToGame' ]);
    });


    // set up google analytics
    _gaq.push([ '_setAccount', 'UA-51179324-1' ]);
    _gaq.push([ '_setDomainName', window.location.origin ]);
    _gaq.push([ '_trackPageview' ]);
    _gaq.push([ '_trackEvent', 'referrer', document.referrer ]);



    // set up "navigation"
    (function (window) {

        window.onhashchange = function () {

            if (window.location.hash !== '#run' && window.onbeforeunload)
            {
                window.onbeforeunload.call(window);
            }

        };

        if (window.location.hash === '#run' && webGLEnabled)
        {
            checkWebGLAndStartTest();
        }

    }(window));

});

