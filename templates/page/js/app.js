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

});

