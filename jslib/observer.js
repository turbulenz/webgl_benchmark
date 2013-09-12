// Copyright (c) 2010-2011 Turbulenz Limited
//
// Observer
//
var Observer = (function () {
    function Observer() {
    }
    Observer.prototype.subscribe = function (subscriber) {
        //Check for duplicates
        var subscribers = this.subscribers;
        var length = subscribers.length;
        for (var index = 0; index < length; index += 1) {
            if (subscribers[index] === subscriber) {
                return;
            }
        }

        subscribers.push(subscriber);
    };

    Observer.prototype.unsubscribe = function (subscriber) {
        var subscribers = this.subscribers;
        var length = subscribers.length;
        for (var index = 0; index < length; index += 1) {
            if (subscribers[index] === subscriber) {
                subscribers.splice(index, 1);
                break;
            }
        }
    };

    Observer.prototype.unsubscribeAll = function (/* subscriber */ ) {
        this.subscribers.length = 0;
    };

    // this function can take any number of arguments
    // they are passed on to the subscribers
    // NOTE: if we write (... args: any[]), TSC inserts code to copy
    // the args into an array.
    Observer.prototype.notify = function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
        // Note that the callbacks might unsubscribe
        var subscribers = this.subscribers;
        var length = this.subscribers.length;
        var index = 0;

        while (index < length) {
            subscribers[index].apply(null, arguments);
            if (subscribers.length === length) {
                index += 1;
            } else {
                length = subscribers.length;
            }
        }
    };

    Observer.create = function () {
        var observer = new Observer();
        observer.subscribers = [];
        return observer;
    };
    return Observer;
})();
