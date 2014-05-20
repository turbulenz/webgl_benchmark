/*global $*/
'use strict';

$(function () {

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
            return false;
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
                .css('background-image', 'url("/img/screenshot-' + index + '-small.png")');
            $screenshotModal[0].showModal();
        });
    });



    // attach specific modal functions to info-modal
    $('#read-more-link').click(function () {
        $('#info-modal')[0].showModal();
    });


    var _gaq = window._gaq;

    // add tracking functions for the page's links
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

    $('#start-test').click(function () {
        _gaq.push([ '_trackEvent', 'testStarted' ]);
    });

    $('#play-game').click(function () {
        _gaq.push([ '_trackEvent', 'linkedToGame' ]);
    });


    // set up google analytics
    _gaq.push([ '_setAccount', 'UA-51179324-1' ]);
    _gaq.push([ '_setDomainName', window.location.origin ]);
    _gaq.push([ '_trackPageview' ]);
    _gaq.push([ '_trackEvent', 'referrer', document.referrer ]);

});

