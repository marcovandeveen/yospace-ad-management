/**
 * Yospace Ad Management SDK
 * Version: 1.7.10
 *
 * Server-Side Ad Insertion (SSAI) client SDK for video ad management.
 * Handles session management, VAST/VMAP parsing, tracking, and timeline management.
 */

// Module exports setup
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    var exports = module.exports;
} else if (typeof exports !== "undefined") {
    Object.defineProperty(exports, "__esModule", { value: true });
}

// =============================================================================
// ClassHelper - Custom OOP Implementation
// =============================================================================

var ClassHelper = (function() {

    // Empty constructor for prototype chain
    function EmptyConstructor() {}

    /**
     * Creates a new class with optional parent and mixins
     * @param {Function} parent - Optional parent class
     * @returns {Function} New class constructor
     */
    function createPrototype(parent) {
        function Constructor() {
            this.initialize.apply(this, arguments);
        }

        if (parent) {
            EmptyConstructor.prototype = parent.prototype;
            Constructor.prototype = new EmptyConstructor();
            EmptyConstructor.prototype = {};
        }

        Constructor.prototype.constructor = Constructor;
        Constructor._isConstructor = true;

        return Constructor;
    }

    // Default empty initialize
    function emptyInitialize() {}

    /**
     * Call parent method
     * @param {Function} method - The method being called from
     * @returns {*} Result of parent method
     */
    function callSuper(method) {
        var superMethod, args, result;

        superMethod = typeof method === "function" ? method.$super : method.callee.$super;

        if (superMethod) {
            if (arguments.length === 1) {
                result = superMethod.call(this);
            } else {
                var argCount = arguments.length - 1;
                args = new Array(argCount);
                for (var i = 0; i < argCount; i++) {
                    args[i] = arguments[i + 1];
                }
                result = superMethod.apply(this, args);
            }
        }

        return result;
    }

    /**
     * Get enumerable property names (handles IE bug)
     */
    function getPropertyNames(obj) {
        var names = [];
        var index = 0;

        for (var name in obj) {
            names[index++] = name;
        }

        // IE doesn't enumerate toString/valueOf
        if (hasToStringBug && obj.toString !== undefined) {
            names[index++] = "toString";
        }
        if (hasValueOfBug && obj.valueOf !== undefined) {
            names[index++] = "valueOf";
        }

        return names;
    }

    // Check for IE enumeration bugs
    var hasToStringBug, hasValueOfBug;
    (function() {
        hasToStringBug = hasValueOfBug = true;
        for (var key in { toString: true, valueOf: true }) {
            if (key === "toString") hasToStringBug = false;
            if (key === "valueOf") hasValueOfBug = false;
        }
    })();

    return {
        /**
         * Create a new class
         * @param {Function} [parent] - Parent class to inherit from
         * @param {...Object} mixins - Objects with methods to add
         * @returns {Function} New class constructor
         */
        makeClass: function() {
            var parent, klass, argIndex = 0;

            // Check if first argument is a parent class
            if (typeof arguments[argIndex] === "function" && arguments[argIndex]._isConstructor) {
                parent = arguments[argIndex++];
            }

            klass = createPrototype(parent);

            // Apply mixins
            while (argIndex < arguments.length) {
                var mixin = arguments[argIndex++];

                // If mixin is a function, call it to get the object
                if (typeof mixin === "function") {
                    mixin = mixin();
                }

                var names = getPropertyNames(mixin);

                for (var i = names.length - 1; i >= 0; --i) {
                    var name = names[i];
                    var method = mixin[name];

                    // Set up super method reference
                    if (parent && typeof method === "function" && !method._isMixinFunction) {
                        var parentMethod = parent.prototype[name];
                        if (typeof parentMethod === "function") {
                            method.$super = parentMethod;
                        }
                    }

                    klass.prototype[name] = method;
                }
            }

            // Ensure initialize exists
            if (!("initialize" in klass.prototype)) {
                klass.prototype.initialize = emptyInitialize;
            }

            klass.prototype.callSuper = callSuper;

            return klass;
        },

        /**
         * Create a mixin object
         * @param {...Object} sources - Objects to merge
         * @returns {Object} Combined mixin
         */
        makeMixin: function() {
            var result = {};

            for (var i = 0; i < arguments.length; i++) {
                var source = arguments[i];

                if (typeof source === "function") {
                    source = source();
                }

                var names = getPropertyNames(source);

                for (var j = names.length - 1; j >= 0; --j) {
                    var name = names[j];
                    var value = source[name];

                    if (typeof value === "function") {
                        value._isMixinFunction = true;
                    }

                    result[name] = value;
                }
            }

            return result;
        }
    };
})();

// =============================================================================
// YSURL - URL Parser
// =============================================================================

var YSURL = ClassHelper.makeClass({

    /**
     * Parse and manipulate URLs
     * @param {string} source - URL string to parse
     */
    initialize: function(source) {
        this._source = source;
        this._scheme = "";
        this._host = "";
        this._username = "";
        this._password = "";
        this._port = -1;
        this._path = "";
        this._query = "";
        this._fragment = "";
        this._parse();
    },

    /**
     * Get authority section (userinfo@host:port)
     */
    auth: function() {
        var result = "";

        if (this.userinfo() !== "") {
            result += this.userinfo() + "@";
        }

        result += this.host();

        if (this.host() !== "" && this.port() > -1) {
            result += ":" + this.port();
        }

        return result;
    },

    fragment: function() { return this._fragment; },
    host: function() { return this._host; },
    path: function() { return this._path; },
    port: function() { return this._port; },
    scheme: function() { return this._scheme; },
    source: function() { return this._source; },

    /**
     * Get user info (username:password)
     */
    userinfo: function() {
        if (!this._username) return "";
        return this._username + ":" + this._password;
    },

    query: function() { return this._query; },

    /**
     * Get query parameter by name
     * @param {string} name - Parameter name
     * @returns {string|null} Parameter value or null
     */
    queryByName: function(name) {
        if (this._query.length > 0) {
            var pairs = this._query.split("&");
            for (var i = 0; i < pairs.length; i++) {
                var parts = pairs[i].split("=");
                if (parts.length > 0 && parts[0] === name) {
                    return parts.length > 1 ? parts[1] : "";
                }
            }
        }
        return null;
    },

    /**
     * Reconstruct URL string
     */
    toString: function() {
        var result = "";

        if (this.scheme()) {
            result += this.scheme() + ":";
        }

        if (this.auth()) {
            result += "//" + this.auth();
        }

        if (this.auth() === "" && this.scheme() === "file") {
            result += "//";
        }

        result += this.path();

        if (this.query() !== "") {
            result += "?" + this.query();
        }

        if (this.fragment() !== "") {
            result += "#" + this.fragment();
        }

        return result;
    },

    /**
     * Parse URL into components
     * @private
     */
    _parse: function() {
        var url = this._source;

        if (url.length === 0) {
            throw new Error("Invalid URL supplied to YSURL");
        }

        // RFC 3986 regex
        var regex = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)([?]([^#]*))?(#(.*))?");
        var match = regex.exec(url);

        // Scheme
        if (match[1] && match[2]) {
            this._scheme = match[2];
        }

        // Authority
        if (match[3]) {
            var authority = match[4];
            var hostPart = "";

            // Check for userinfo
            if (authority.indexOf("@") > -1) {
                var userinfo = authority.split("@")[0];
                hostPart = authority.split("@")[1];

                if (userinfo.indexOf(":") !== -1) {
                    this._username = userinfo.split(":")[0];
                    this._password = userinfo.split(":")[1];
                } else {
                    this._username = userinfo;
                }
            } else {
                hostPart = authority;
            }

            // Check for port
            if (hostPart.indexOf(":") > -1) {
                var portStr = hostPart.split(":")[1];
                var isNumeric = true;

                for (var i = 0; i < portStr.length; i++) {
                    var char = portStr.charAt(i);
                    if (char < "0" || char > "9") {
                        isNumeric = false;
                        break;
                    }
                }

                if (isNumeric) {
                    hostPart = hostPart.split(":")[0];
                    if (portStr && portStr.length > 0) {
                        this._port = parseInt(portStr, 10);
                    }
                }
            }

            this._host = hostPart;
        }

        // Path
        if (match[5]) {
            this._path = match[5];
        }

        // Query
        if (match[6]) {
            this._query = match[7];
        }

        // Fragment
        if (match[8]) {
            this._fragment = match[9];
        }
    }
});

/**
 * Base64 encode a string
 * @param {string} input - String to encode
 * @returns {string} Base64 encoded string
 */
YSURL.Base64Encode = function(input) {
    if (/([^\u0000-\u00ff])/.test(input)) {
        return input;
    }

    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = [];
    var padding = "";

    var remainder = input.length % 3;
    if (remainder > 0) {
        while (remainder++ < 3) {
            padding += "=";
            input += "\0";
        }
    }

    for (var i = 0; i < input.length; i += 3) {
        var triplet = (input.charCodeAt(i) << 16) |
                      (input.charCodeAt(i + 1) << 8) |
                      input.charCodeAt(i + 2);

        var a = (triplet >> 18) & 63;
        var b = (triplet >> 12) & 63;
        var c = (triplet >> 6) & 63;
        var d = triplet & 63;

        output[i / 3] = chars.charAt(a) + chars.charAt(b) + chars.charAt(c) + chars.charAt(d);
    }

    var result = output.join("");
    return result.slice(0, result.length - padding.length) + padding;
};

YSURL._r = /\\/g;

// =============================================================================
// ProtoAjax - HTTP Request Utilities
// =============================================================================

var ProtoAjax = {

    /**
     * Browser detection
     */
    Browser: (function() {
        if (typeof navigator === "undefined" || typeof window === "undefined") {
            return { IE: false, Opera: false, WebKit: false, Gecko: false, MobileSafari: false };
        }

        var ua = navigator.userAgent;
        var isOpera = Object.prototype.toString.call(window.opera) === "[object Opera]";

        return {
            IE: ua && !!window.attachEvent && !isOpera,
            Opera: isOpera,
            WebKit: ua && ua.indexOf("AppleWebKit/") > -1,
            Gecko: ua && ua.indexOf("Gecko") > -1 && ua.indexOf("KHTML") === -1,
            MobileSafari: ua && /Apple.*Mobile/.test(ua)
        };
    })(),

    /**
     * Get XMLHttpRequest transport
     */
    getTransport: function() {
        if (typeof XMLHttpRequest !== "undefined") {
            return new XMLHttpRequest();
        }

        // IE fallback
        var progIds = [
            "MSXML2.XmlHttp.6.0",
            "MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"
        ];

        var transport;
        for (var i = 0; i < progIds.length; i++) {
            try {
                transport = new ActiveXObject(progIds[i]);
                break;
            } catch (e) {}
        }

        return transport;
    },

    activeRequestCount: 0,

    /**
     * Custom delegate for request handling (platform overrides)
     */
    DELEGATE: null
};

/**
 * Base request class
 */
ProtoAjax.Base = ClassHelper.makeClass({

    initialize: function(options) {
        this.options = {
            method: "post",
            asynchronous: true,
            contentType: "application/x-www-form-urlencoded",
            encoding: "UTF-8",
            parameters: ""
        };

        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                this.options[key] = options[key];
            }
        }

        this.options.method = this.options.method.toLowerCase();
    }
});

/**
 * HTTP Request
 */
ProtoAjax.Request = ClassHelper.makeClass(ProtoAjax.Base, {

    _complete: false,

    initialize: function(url, options) {
        this.callSuper(this.initialize, options);
        this.transport = ProtoAjax.getTransport();
        this.request(url);
    },

    request: function(url) {
        this.url = url;
        this.method = this.options.method;

        var params = this.options.parameters;

        // Handle method override
        if (this.method !== "get" && this.method !== "post") {
            params += (params ? "&" : "") + "_method=" + this.method;
            this.method = "post";
        }

        // Append params to URL for GET
        if (params && this.method === "get") {
            this.url += (this.url.indexOf("?") > -1 ? "&" : "?") + params;
        }

        this.parameters = params;

        try {
            var response = new ProtoAjax.Response(this);

            if (this.options.onCreate) {
                this.options.onCreate(response);
            }

            this.transport.open(this.method.toUpperCase(), this.url, this.options.asynchronous);

            if (this.options.asynchronous) {
                this.defer(this.respondToReadyState.bind(this, 1));
            }

            this.transport.onreadystatechange = this.onStateChange.bind(this);
            this.setRequestHeaders();

            this.body = (this.method === "post") ?
                (this.options.postBody || params) : null;

            this.transport.send(this.body);

            if (!this.options.asynchronous && this.transport.overrideMimeType) {
                this.onStateChange();
            }
        } catch (e) {}
    },

    update: function(array, items) {
        var len = array.length;
        var itemLen = items.length;
        while (itemLen--) {
            array[len + itemLen] = items[itemLen];
        }
        return array;
    },

    delay: function(timeout) {
        var self = this;
        var args = Array.prototype.slice.call(arguments, 1);
        timeout *= 1000;
        return setTimeout(function() {
            return self.apply(self, args);
        }, timeout);
    },

    defer: function(fn) {
        var args = this.update([0.01], arguments);
        return this.delay.apply(fn, args);
    },

    onStateChange: function() {
        var readyState = this.transport.readyState;
        if (readyState > 1 && (readyState !== 4 || !this._complete)) {
            this.respondToReadyState(this.transport.readyState);
        }
    },

    setRequestHeaders: function() {
        var headers = {
            Accept: "text/javascript, text/html, application/xml, text/xml, */*"
        };

        if (this.method === "post") {
            headers["Content-type"] = this.options.contentType +
                (this.options.encoding ? "; charset=" + this.options.encoding : "");

            if (this.transport.overrideMimeType) {
                var geckoVersion = (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0, 2005])[1];
                if (geckoVersion < 2005) {
                    headers.Connection = "close";
                }
            }
        }

        // Add custom headers
        if (typeof this.options.requestHeaders === "object") {
            var customHeaders = this.options.requestHeaders;
            if (Object.isFunction && customHeaders.push) {
                for (var i = 0; i < customHeaders.length; i += 2) {
                    headers[customHeaders[i]] = customHeaders[i + 1];
                }
            }
        }

        for (var name in headers) {
            if (headers[name] != null) {
                this.transport.setRequestHeader(name, headers[name]);
            }
        }
    },

    success: function() {
        var status = this.getStatus();
        return !status || (status >= 200 && status < 300) || status === 304;
    },

    getStatus: function() {
        try {
            return this.transport.status === 1223 ? 204 : (this.transport.status || 0);
        } catch (e) {
            return 0;
        }
    },

    respondToReadyState: function(readyState) {
        var state = ProtoAjax.Request.Events[readyState];
        var response = new ProtoAjax.Response(this);

        if (state === "Complete") {
            try {
                this._complete = true;
                var callback = this.options["on" + response.status] ||
                    this.options["on" + (this.success() ? "Success" : "Failure")] ||
                    function() {};
                callback(response);
            } catch (e) {
                Debugger.print("Error handling state: " + e);
            }
        }

        try {
            var stateCallback = this.options["on" + state] || function() {};
            stateCallback(response);
        } catch (e) {}

        if (state === "Complete") {
            this.transport.onreadystatechange = function() {};
        }
    },

    getHeader: function(name) {
        try {
            return this.transport.getResponseHeader(name) || null;
        } catch (e) {
            return null;
        }
    },

    evalResponse: function() {
        try {
            return eval((this.transport.responseText || "").unfilterJSON());
        } catch (e) {}
    }
});

ProtoAjax.Request.Events = ["Uninitialized", "Loading", "Loaded", "Interactive", "Complete"];

/**
 * HTTP Response wrapper
 */
ProtoAjax.Response = ClassHelper.makeClass({

    initialize: function(request) {
        this.request = request;
        var transport = this.transport = request.transport;
        var readyState = this.readyState = transport.readyState;

        if ((readyState > 2 && !ProtoAjax.Browser.IE) || readyState === 4) {
            this.status = this.getStatus();
            this.statusText = this.getStatusText();
            this.responseText = transport.responseText === null ? "" : String(transport.responseText);
        }

        if (readyState === 4) {
            var responseXML = transport.responseXML;
            this.responseXML = responseXML === undefined ? null : responseXML;
        }
    },

    status: 0,
    statusText: "",

    getStatus: ProtoAjax.Request.prototype.getStatus,

    getStatusText: function() {
        try {
            return this.transport.statusText || "";
        } catch (e) {
            return "";
        }
    },

    getHeader: ProtoAjax.Request.prototype.getHeader,

    getAllHeaders: function() {
        try {
            return this.getAllResponseHeaders();
        } catch (e) {
            return null;
        }
    },

    getResponseHeader: function(name) {
        return this.transport.getResponseHeader(name);
    },

    getAllResponseHeaders: function() {
        return this.transport.getAllResponseHeaders();
    }
});

// =============================================================================
// Constants - VMAP/VAST Tag Names
// =============================================================================

var VMAPNS = "http://www.iab.net/videosuite/vmap";

// VMAP tags
var TAG_VMAP_AD_BREAK = "AdBreak";
var ATTR_AD_BREAK_START = "timeOffset";
var ATTR_AD_BREAK_TYPE = "breakType";
var ATTR_AD_BREAK_ID = "breakId";
var TAG_AD_SOURCE = "AdSource";
var TAG_VMAP_TRACKING_EVENTS = "TrackingEvents";
var TAG_VMAP_EXTENSIONS = "Extensions";
var TAG_VMAP_EXTENSION = "Extension";

// Yospace extensions
var TAG_YOEXT_ADBREAK = "http://www.yospace.com/extension/adbreak";
var TAG_YOEXT_STREAM = "http://www.yospace.com/extension/stream";

// VAST tags
var TAG_VAST_AD_DATA = "VASTAdData";
var TAG_YO_STREAM = "Stream";
var ATTR_STREAM_DURATION = "duration";
var ATTR_STREAM_PDTSTART = "pdtstart";
var ATTR_STREAM_PDTEND = "pdtend";
var ATTR_URL_DOMAIN = "urlDomain";
var ATTR_URL_SUFFIX = "urlSuffix";

var TAG_AD = "Ad";
var TAG_AD_EXTENSIONS = "Extensions";
var TAG_AD_EXTENSION = "Extension";
var TAG_INLINE = "InLine";
var TAG_INLINE_ADSYSTEM = "AdSystem";
var TAG_INLINE_VERSION = "version";
var TAG_INLINE_ADTITLE = "AdTitle";
var TAG_INLINE_DESCRIPTION = "Description";
var TAG_INLINE_ADVERTISER = "Advertiser";
var TAG_INLINE_SURVEY = "Survey";
var TAG_CREATIVES = "Creatives";
var TAG_CREATIVE = "Creative";
var TAG_IMPRESSION = "Impression";
var TAG_VAST_TRACKING = "Tracking";
var TAG_VAST_TRACKINGEVENTS = "TrackingEvents";
var TAG_NONLINEARADS = "NonLinearAds";
var TAG_STATICRESOURCE = "StaticResource";
var TAG_IFRAMERESOURCE = "IFrameResource";
var TAG_NONLINEARCLICKTHROUGH = "NonLinearClickThrough";
var TAG_LINEAR = "Linear";
var TAG_CLICKTHROUGH = "ClickThrough";
var TAG_CLICKTRACKING = "ClickTracking";
var TAG_HTMLRESOURCE = "HTMLResource";
var TAG_EXTENSIONS = "CreativeExtensions";
var TAG_EXTENSION = "CreativeExtension";

// HLS tokens
var ANALYTICS_TOKEN = "#EXT-X-YOSPACE-ANALYTICS-URL";
var PAUSE_TOKEN = "#EXT-X-YOSPACE-PAUSE";

// =============================================================================
// YSParseUtils - Parsing Utilities
// =============================================================================

var YSParseUtils = {};

YSParseUtils.NAMESPACES = true;
YSParseUtils.NS_SEPARATOR = ":";

/**
 * Convert seconds to timecode string (HH:MM:SS.mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} Timecode string
 */
YSParseUtils.timecodeToString = function(seconds) {
    var secs = "0" + (seconds % 60);
    var result = "0" + parseInt(seconds / 3600, 10) + ":" +
                 ("0" + parseInt((seconds % 3600) / 60, 10)) + ":" + secs;

    result = result.replace(/(^|:|\.)0(\d{2})/g, "$1$2");

    var decimalPos = secs.indexOf(".");
    result = (result + ".000".substr(decimalPos === -1 ? 0 : 1)).substr(0, 12);

    return result;
};

/**
 * Parse timecode string to seconds
 * @param {string} timecode - Timecode string (HH:MM:SS or seconds)
 * @returns {number} Time in seconds
 */
YSParseUtils.timecodeFromString = function(timecode) {
    if (timecode.indexOf(":") === -1) {
        return parseFloat(timecode);
    }

    return (3600 * parseInt(timecode.substr(0, 2), 10)) +
           (60 * parseInt(timecode.substr(3, 2), 10)) +
           parseFloat(timecode.substr(6), 10);
};

/**
 * Get DOM elements with namespace support
 * @param {Element} element - Parent element
 * @param {string} prefix - Namespace prefix
 * @param {string} namespace - Namespace URI
 * @param {string} tagName - Tag name
 * @returns {NodeList} Matching elements
 */
YSParseUtils.getDOMElements = function(element, prefix, namespace, tagName) {
    if (YSParseUtils.NAMESPACES === false || element.getElementsByTagNameNS === undefined) {
        var fullName = (prefix === "" ? "" : prefix + YSParseUtils.NS_SEPARATOR) + tagName;
        return element.getElementsByTagName(fullName);
    }
    return element.getElementsByTagNameNS(namespace, tagName);
};

// =============================================================================
// Debugger - Logging Utility
// =============================================================================

var Debugger = {};

(function() {
    "use strict";

    Debugger.print = function(message) {
        if (YSSessionManager.DEFAULTS.DEBUGGING) {
            console.log(message);
        }
    };

    Debugger.printErr = function(message) {
        console.error(message);
    };
})();

// =============================================================================
// TrackingEvents - VAST Tracking Management
// =============================================================================

var TrackingEvents = ClassHelper.makeClass({

    initialize: function(element, ad) {
        this.events = {};
        this.suppressedCalls = [];
        this.isSuppressed = false;
        this.ad = ad;
        this.nsPrefix = "";

        if (element === null) {
            return;
        }

        var trackingIndex = element.tagName.indexOf(TAG_VAST_TRACKINGEVENTS);

        if (trackingIndex === -1) {
            element = element.getElementsByTagName(TAG_VAST_TRACKINGEVENTS);
            if (element.length !== 1) {
                return;
            }
            element = element.item(0);
            trackingIndex = element.tagName.indexOf(TAG_VAST_TRACKINGEVENTS);
        }

        if (trackingIndex > 0) {
            this.nsPrefix = element.tagName.substr(0, trackingIndex - 1);
        }

        var trackingElements = YSParseUtils.getDOMElements(element, this.nsPrefix, "*", TAG_VAST_TRACKING);

        for (var i = 0; i < trackingElements.length; i++) {
            var eventName = trackingElements.item(i).getAttribute("event");

            if (eventName) {
                var offset = null;

                if (eventName === "progress") {
                    offset = trackingElements.item(i).getAttribute("offset");
                    eventName += "-" + offset;
                }

                var trackingObj = {
                    url: trackingElements.item(i).textContent.replace(/\s+/g, ""),
                    offset: offset,
                    event: eventName,
                    expired: false
                };

                Debugger.print("Adding tracking for event: " + eventName);

                this.events[eventName] = this.events[eventName] || [];
                this.events[eventName].push(trackingObj);
            }
        }
    },

    Destroy: function() {
        this.suppressedCalls = null;

        for (var event in this.events) {
            if (this.events.hasOwnProperty(event)) {
                delete this.events[event];
            }
        }

        this.events = null;
    },

    addClickTracking: function(url) {
        this.addTracking("click", url);
    },

    addTracking: function(event, url) {
        var trackingObj = {
            url: url,
            event: event,
            offset: null,
            expired: false
        };

        this.events[event] = this.events[event] || [];
        this.events[event].push(trackingObj);
    },

    getEventsOfType: function(types) {
        var result = [];
        var isProgress = types.indexOf("progress") > -1;

        for (var event in this.events) {
            if (this.events.hasOwnProperty(event)) {
                if (types.indexOf(event) > -1 || (isProgress && event.indexOf("progress-") === 0)) {
                    result = result.concat(this.events[event]);
                }
            }
        }

        return result;
    },

    suppressAnalytics: function(suppress) {
        if (suppress) {
            if (!this.isSuppressed) {
                this.suppressedCalls = [];
                this.isSuppressed = true;
            }
        } else {
            this.isSuppressed = false;
        }

        return this.suppressedCalls;
    },

    fire: function(url, tracking) {
        tracking.expired = true;

        if (this.isSuppressed) {
            this.suppressedCalls.push({ event: tracking.event, url: url });
            Debugger.print(" ** SUPPRESSING CALL ** Suppressed length: " + this.suppressedCalls.length);
        } else if (url.length > 0) {
            var img = new Image();
            var parsedUrl = new YSURL(url);

            if (TrackingEvents.FORCE_HTTPS === true) {
                parsedUrl._scheme = "https";
            }

            img.src = parsedUrl.toString();
        }
    },

    track: function(event, macros) {
        if (this.ad) {
            Debugger.print("Tracking " + event + " in " + this.ad.id);
        } else {
            Debugger.print("Tracking " + event + " at global level.");
        }

        var trackingList = [];

        if (this.events[event] && this.events[event].length !== 0) {
            trackingList = [].concat(this.events[event]);
        } else {
            Debugger.print("No specific event to be tracked!");
        }

        var macroMap = {};
        for (var key in macros) {
            if (macros.hasOwnProperty(key)) {
                macroMap["[" + key + "]"] = encodeURIComponent(macros[key]);
            }
        }

        // Handle impressions on creativeView
        if (event === "creativeView") {
            if (this.ad === null || this.ad.hasSentImpression()) {
                if (this.ad === null) {
                    Debugger.print(" *** NO ADVERT FOR FIRING IMPRESSION");
                } else {
                    Debugger.print(" *** IMPRESSION ALREADY SENT");
                }
            } else {
                this.ad.impressionSent();
                Debugger.print(" -=-> Ad Impression");

                for (var j = this.ad.impressions.length - 1; j >= 0; j--) {
                    trackingList.unshift({
                        url: this.ad.impressions[j],
                        expired: false,
                        event: "impression"
                    });
                }
            }
        }

        var self = this;

        for (var i = 0; i < trackingList.length; i++) {
            var tracking = trackingList[i];
            var url = tracking.url;

            // Generate cache buster
            var cacheBuster = String(parseInt(99999999 * Math.random(), 10));
            while (cacheBuster.length !== 8) {
                cacheBuster = "0" + cacheBuster;
            }
            macroMap["[CACHEBUSTING]"] = cacheBuster;

            // Replace macros
            for (var macro in macroMap) {
                if (macroMap.hasOwnProperty(macro)) {
                    url = url.replace(macro, macroMap[macro]);
                }
            }

            if (tracking.expired === false) {
                Debugger.print("Firing tracking of: " + url);
                self.fire(url, tracking);
            }
        }
    },

    progressTrack: function(macros, duration, elapsed) {
        var trackingList = [];
        var threshold = duration;

        for (var event in this.events) {
            var eventList = this.events[event];

            if (eventList.length > 0) {
                for (var i = 0; i < eventList.length; i++) {
                    var tracking = eventList[i];

                    if (tracking.event.substr(0, 9) === "progress-") {
                        var offsetStr = tracking.event.substr(9);

                        if (offsetStr.indexOf("%") !== -1) {
                            var percent = offsetStr.substr(0, offsetStr.length - 1);
                            threshold = parseFloat(percent) * duration / 100;
                        } else {
                            threshold = YSParseUtils.timecodeFromString(offsetStr);
                        }

                        if (elapsed >= threshold) {
                            trackingList.push(tracking);
                        }
                    }
                }
            }
        }

        if (trackingList.length > 0) {
            var macroMap = {};

            for (var key in macros) {
                if (macros.hasOwnProperty(key)) {
                    macroMap["[" + key + "]"] = encodeURIComponent(macros[key]);
                }
            }

            for (var j = 0; j < trackingList.length; j++) {
                var track = trackingList[j];
                var url = track.url;

                var cacheBuster = String(parseInt(99999999 * Math.random(), 10));
                while (cacheBuster.length !== 8) {
                    cacheBuster = "0" + cacheBuster;
                }
                macroMap["[CACHEBUSTING]"] = cacheBuster;

                for (var macro in macroMap) {
                    if (macroMap.hasOwnProperty(macro)) {
                        url = url.replace(macro, macroMap[macro]);
                    }
                }

                if (track.expired === false) {
                    Debugger.print("Firing timed tracking of: " + url);
                    this.fire(url, track);
                }
            }
        }
    }
});

TrackingEvents.FORCE_HTTPS = false;

// =============================================================================
// Yospace Extensions
// =============================================================================

var YoExtension = ClassHelper.makeClass({

    initialize: function(xml) {
        this.isValid = false;
        this.extensionXml = xml;
    },

    Destroy: function() {
        this.extensionXml = null;
    },

    getRaw: function() {
        return this.extensionXml;
    },

    getTypeName: function() {
        return "YoExtension";
    }
});

/**
 * Stream extension with duration and PDT info
 */
var YoStream = ClassHelper.makeClass(YoExtension, {

    initialize: function(xml) {
        this.callSuper(this.initialize, xml);
        this.isValid = true;
        this.StartPDT = null;
        this.EndPDT = null;

        Debugger.print("[1/4] Extracting STREAM extension...");

        var streamElements = YSParseUtils.getDOMElements(xml, "yospace", "", TAG_YO_STREAM);

        if (streamElements.length === 1) {
            var streamEl = streamElements.item(0);

            Debugger.print("[2/4] Validating STREAM tagname...");

            if (streamEl.tagName === "yospace" + YSParseUtils.NS_SEPARATOR + TAG_YO_STREAM) {

                Debugger.print("[3/4] Checking for STREAM duration attribute...");

                if (!streamEl.hasAttribute(ATTR_STREAM_DURATION)) {
                    Debugger.print("[3/4] STREAM duration attribute not found...");
                    this.isValid = false;
                    return;
                }

                this.duration = streamEl.getAttribute(ATTR_STREAM_DURATION);
                Debugger.print("[3/4] Found STREAM duration... " + this.duration);

                Debugger.print("[4/4] Extracting misc STREAM attributes...");

                if (streamEl.hasAttribute(ATTR_STREAM_PDTSTART)) {
                    this.StartPDT = streamEl.getAttribute(ATTR_STREAM_PDTSTART);
                }

                if (streamEl.hasAttribute(ATTR_STREAM_PDTEND)) {
                    this.EndPDT = streamEl.getAttribute(ATTR_STREAM_PDTEND);
                }

                this.urlDomain = streamEl.getAttribute(ATTR_URL_DOMAIN);
                this.urlSuffix = streamEl.getAttribute(ATTR_URL_SUFFIX);
                this.id = streamEl.getAttribute("id");

            } else {
                Debugger.print("Invalid tag name for yospace" + YSParseUtils.NS_SEPARATOR + TAG_YO_STREAM);
                this.isValid = false;
            }
        } else {
            Debugger.print("[1/4] STREAM: No firstElementChild was returned...");
            this.isValid = false;
        }

        Debugger.print("[-/-] STREAM extension parsed. Valid? ... " + (this.isValid ? "YES" : "NO"));
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
    },

    getTypeName: function() {
        return "YoStream";
    }
});

/**
 * Ad break extension
 */
var YoBreak = ClassHelper.makeClass(YoExtension, {

    initialize: function(xml) {
        if (xml) {
            this.callSuper(this.initialize, xml);
            this.isValid = true;

            var breakElements = YSParseUtils.getDOMElements(xml, "yospace", "", TAG_VMAP_AD_BREAK);

            if (breakElements.length === 1) {
                var breakEl = breakElements.item(0);
                this.duration = breakEl.getAttribute(ATTR_STREAM_DURATION);
            } else {
                Debugger.print("[1/4] BREAK: No firstElementChild was returned...");
                this.isValid = false;
            }
        }
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
    },

    getTypeName: function() {
        return "YoBreak";
    }
});

/**
 * Extensions container
 */
var Extensions = ClassHelper.makeClass({

    initialize: function(xml) {
        this.extensions = [];

        if (xml) {
            var extensionElements = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_VMAP_EXTENSION);

            if (extensionElements.length) {
                for (var i = 0; i < extensionElements.length; i++) {
                    var extEl = extensionElements.item(i);
                    var type = extEl.getAttribute("type");
                    var extension;

                    if (type === TAG_YOEXT_ADBREAK) {
                        extension = new YoBreak(extEl);
                        this.extensions.push(extension);
                        Debugger.print("Found BREAK extension in VMAP");
                    } else if (type === TAG_YOEXT_STREAM) {
                        extension = new YoStream(extEl);
                        this.extensions.push(extension);
                        Debugger.print("Found STREAM extension in VMAP");
                    } else {
                        Debugger.print("Unhandled Extension Type: " + type);
                    }
                }
            } else {
                Debugger.print("Empty Extensions section");
            }
        } else {
            Debugger.print("Adjustment/Extraction failed for VMAP extensions");
        }
    },

    Destroy: function() {
        while (this.extensions.length > 0) {
            this.extensions.pop().Destroy();
        }
        this.extensions = null;
    },

    getFirstOfType: function(type) {
        return this.getNextOfType(type, null);
    },

    getNextOfType: function(type, after) {
        var result = null;
        var className = this.getClassForType(type);
        var foundAfter = false;

        if (className !== null) {
            for (var i = 0; i < this.extensions.length; i++) {
                if (this.extensions[i].getTypeName() === className) {
                    if (after === null || foundAfter === true) {
                        result = this.extensions[i];
                        break;
                    }
                    if (this.extensions[i] === after) {
                        foundAfter = true;
                    }
                }
            }
        }

        return result;
    },

    getAllOfType: function(type) {
        var result = [];
        var className = this.getClassForType(type);

        if (className !== null) {
            for (var i = 0; i < this.extensions.length; i++) {
                if (this.extensions[i].getTypeName() === className) {
                    result.push(this.extensions[i]);
                }
            }
        }

        return result;
    },

    getClassForType: function(type) {
        switch (type) {
            case TAG_YOEXT_ADBREAK:
                return "YoBreak";
            case TAG_YOEXT_STREAM:
                return "YoStream";
        }
        return null;
    }
});

// =============================================================================
// VAST Creative Classes
// =============================================================================

/**
 * VAST Icon
 */
var VASTIcon = ClassHelper.makeClass({

    initialize: function(linear, xml, id) {
        this.id = id;
        this.linear = linear;
        this.clickThrough = null;
        this.resources = {
            html: null,
            iframe: null,
            images: {}
        };

        var elements;

        // HTML resource
        elements = xml.getElementsByTagName(TAG_HTMLRESOURCE);
        if (elements.length > 0) {
            this.resources.html = elements.item(0).textContent.replace(/\s+/g, "");
        }

        // IFrame resource
        elements = xml.getElementsByTagName(TAG_IFRAMERESOURCE);
        if (elements.length > 0) {
            this.resources.iframe = elements.item(0).textContent.replace(/\s+/g, "");
        }

        // Static resources
        elements = xml.getElementsByTagName(TAG_STATICRESOURCE);
        for (var i = 0; i < elements.length; i++) {
            var creativeType = elements.item(i).getAttribute("creativeType");
            this.resources.images[creativeType] = elements.item(i).textContent.replace(/\s+/g, "");
        }

        this.tracking = linear.tracking;

        // Icon clicks
        var iconClicks = xml.getElementsByTagName("IconClicks");
        if (iconClicks.length) {
            iconClicks = iconClicks.item(0);

            var clickThrough = iconClicks.getElementsByTagName("IconClickThrough");
            if (clickThrough.length) {
                this.clickThrough = clickThrough.item(0).textContent.replace(/\s+/g, "");
            }

            var clickTracking = iconClicks.getElementsByTagName("IconClickTracking");
            if (clickTracking.length) {
                for (i = 0; i < clickTracking.length; i++) {
                    Debugger.print("Adding Icon Click Tracking: " + i);
                    this.tracking.addTracking("IconClick_" + id, clickTracking.item(i).textContent.replace(/\s+/g, ""));
                }
            }
        }

        // Icon view tracking
        var viewTracking = xml.getElementsByTagName("IconViewTracking");
        if (viewTracking.length) {
            for (i = 0; i < viewTracking.length; i++) {
                this.tracking.addTracking("IconView_" + id, viewTracking.item(i).textContent.replace(/\s+/g, ""));
            }
        }
    },

    Destroy: function() {
        this.resources = null;
        this.linear = null;
        this.tracking = null;
    },

    getAllResources: function() {
        return this.resources;
    }
});

/**
 * VAST Interactive Unit (VPAID)
 */
var VASTInteractive = ClassHelper.makeClass({

    initialize: function(linear, attributes) {
        Debugger.print("Constructing VPAID Unit");

        this.width = -1;
        this.height = -1;
        this.id = "";
        this.scalable = false;
        this.type = "";
        this.maintainAspectRatio = false;
        this.src = "";
        this.linear = linear;
        this.bitrate = -1;
        this.parameters = "";

        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                var value = attributes[attr].replace(/\s+/g, "");

                switch (attr.toLowerCase()) {
                    case "height":
                    case "width":
                    case "bitrate":
                        this[attr.toLowerCase()] = parseInt(value, 10);
                        break;
                    case "id":
                    case "type":
                        this[attr.toLowerCase()] = value;
                        break;
                    case "maintainaspectratio":
                        this.maintainAspectRatio = value.toLowerCase() === "true";
                        break;
                    case "scalable":
                        this.scalable = value.toLowerCase() === "true";
                        break;
                    case "src":
                        this.src = value;
                        break;
                    default:
                        Debugger.print("Unknown attribute: " + attr + " with value: " + value);
                }
            }
        }

        // Get ad parameters
        var adParams = linear.root.getElementsByTagName("AdParameters");
        if (adParams.length === 1) {
            this.parameters = adParams.item(0).textContent;
        }

        this.tracking = new TrackingEvents(linear.root, linear.vastAd);
    },

    Destroy: function() {
        this.resources = null;
        this.linear = null;
        this.tracking.Destroy();
        this.tracking = null;
    },

    track: function(event, playhead, assetUri, duration) {
        Debugger.print(" VPAID: Invoke Tracking: " + event);
        this.tracking.track(event, {
            CONTENTPLAYHEAD: YSParseUtils.timecodeToString(playhead),
            ASSETURI: assetUri,
            "YO:ACTUAL_DURATION": duration
        });
    }
});

/**
 * Base VAST Creative
 */
var VASTCreative = ClassHelper.makeClass({

    initialize: function(vastAd, xml, adId, creativeId) {
        this.vastAd = vastAd;
        this.root = xml;
        this.clickThrough = null;
        this.AdID = adId;
        this.CreativeID = creativeId;
        this.CreativeExtensions = [];

        // Parse creative extensions
        var extensionsEl = xml.getElementsByTagName(TAG_EXTENSIONS);
        if (extensionsEl.length > 0) {
            for (var i = 0; i < extensionsEl.length; i++) {
                var extEl = extensionsEl.item(i).getElementsByTagName(TAG_EXTENSION);
                if (extEl.length > 0) {
                    for (var j = 0; j < extEl.length; j++) {
                        this.CreativeExtensions.push(extEl.item(j));
                    }
                }
            }
        }

        // Handle NonLinear wrapper
        if (xml.tagName === "NonLinear") {
            xml = xml.parentNode;
        }

        this.tracking = new TrackingEvents(xml, vastAd);
    },

    Destroy: function() {
        this.root = null;
        this.CreativeExtensions = null;

        if (this.tracking) {
            this.tracking.Destroy();
            this.tracking = null;
        }
    },

    track: function(event, playhead, assetUri, duration) {
        this.tracking.track(event, {
            CONTENTPLAYHEAD: YSParseUtils.timecodeToString(playhead),
            ASSETURI: assetUri,
            "YO:ACTUAL_DURATION": duration
        });

        this.tracking.progressTrack({
            CONTENTPLAYHEAD: YSParseUtils.timecodeToString(playhead),
            ASSETURI: assetUri,
            "YO:ACTUAL_DURATION": duration
        }, this.getDuration(), playhead);
    },

    trackProgress: function(playhead, assetUri, duration) {
        this.tracking.progressTrack({
            CONTENTPLAYHEAD: YSParseUtils.timecodeToString(playhead),
            ASSETURI: assetUri,
            "YO:ACTUAL_DURATION": duration
        }, this.duration, playhead);
    },

    getClickThrough: function() {
        if (this.clickThrough) {
            var url = new YSURL(this.clickThrough);

            if (TrackingEvents.FORCE_HTTPS === true) {
                url._scheme = "https";
            }

            return url.toString();
        }
        return null;
    },

    attribute: function(name, defaultValue) {
        if (!this.root.hasAttribute(name)) {
            return defaultValue;
        }

        var value = this.root.getAttribute(name);

        switch (name) {
            case "skipoffset":
            case "duration":
            case "offset":
            case "minSuggestedDuration":
                value = YSParseUtils.timecodeFromString(value);
        }

        return value;
    }
});

/**
 * VAST Linear Creative (video ads)
 */
var VASTLinear = ClassHelper.makeClass(VASTCreative, {

    initialize: function(vastAd, xml, adId, creativeId) {
        this.callSuper(this.initialize, vastAd, xml, adId, creativeId);

        this.mediaFiles = [];
        this.duration = null;
        this.skipOffset = -1;
        this.icons = [];
        this.interactiveUnit = null;

        // Video clicks
        var videoClicks = xml.getElementsByTagName("VideoClicks");
        if (videoClicks.length) {
            videoClicks = videoClicks.item(0);

            var clickThrough = videoClicks.getElementsByTagName(TAG_CLICKTHROUGH);
            if (clickThrough.length) {
                this.clickThrough = clickThrough.item(0).textContent.replace(/\s+/g, "");
            }

            var clickTracking = videoClicks.getElementsByTagName(TAG_CLICKTRACKING);
            if (clickTracking.length) {
                for (var i = 0; i < clickTracking.length; i++) {
                    Debugger.print("Adding Click Tracking: " + i);
                    this.tracking.addClickTracking(clickTracking.item(i).textContent.replace(/\s+/g, ""));
                }
            }
        }

        // Duration
        var durationEl = xml.getElementsByTagName("Duration");
        if (durationEl.length) {
            this.duration = YSParseUtils.timecodeFromString(durationEl.item(0).textContent.replace(/\s+/g, ""));
        }

        // Skip offset
        if (xml.hasAttribute("skipoffset")) {
            var skipStr = xml.getAttribute("skipoffset").replace(/\s+/g, "");

            if (skipStr.indexOf("%") >= 0) {
                var percent = this.duration * skipStr.substring(0, skipStr.length - 1) / 100;
                this.skipOffset = percent;
            } else {
                this.skipOffset = YSParseUtils.timecodeFromString(skipStr);
            }
        }

        // Media files
        var mediaFilesEl = xml.getElementsByTagName("MediaFiles");
        if (mediaFilesEl.length) {
            mediaFilesEl = mediaFilesEl.item(0).getElementsByTagName("MediaFile");

            for (var j = 0; j < mediaFilesEl.length; j++) {
                var mediaFile = {};
                var mediaEl = mediaFilesEl.item(j);

                // Get attributes
                if (mediaEl.attributes !== undefined) {
                    for (var k = 0; k < mediaEl.attributes.length; k++) {
                        mediaFile[mediaEl.attributes.item(k).name] = mediaEl.attributes.item(k).value;
                    }
                } else {
                    if (mediaEl.hasAttribute("id")) mediaFile.id = mediaEl.getAttribute("id");
                    if (mediaEl.hasAttribute("bitrate")) mediaFile.bitrate = mediaEl.getAttribute("bitrate");
                    if (mediaEl.hasAttribute("width")) mediaFile.width = mediaEl.getAttribute("width");
                    if (mediaEl.hasAttribute("height")) mediaFile.height = mediaEl.getAttribute("height");
                }

                mediaFile.src = mediaFilesEl.item(j).textContent.replace(/\s+/g, "");

                // Check for VPAID
                if (mediaFile.hasOwnProperty("apiFramework") &&
                    mediaFile.apiFramework.toUpperCase() === "VPAID") {
                    this.interactiveUnit = new VASTInteractive(this, mediaFile);
                }

                this.mediaFiles.push(mediaFile);
            }

            // Icons
            var iconsEl = xml.getElementsByTagName("Icons");
            if (iconsEl.length) {
                iconsEl = iconsEl.item(0).getElementsByTagName("Icon");

                if (iconsEl.length) {
                    for (var m = 0; m < iconsEl.length; m++) {
                        var iconEl = iconsEl.item(m);
                        if (iconEl.tagName === "Icon") {
                            this.icons.push(new VASTIcon(this, iconEl, m));
                        }
                    }
                }
            }
        }
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
        this.mediaFiles = null;

        if (this.interactiveUnit) {
            this.interactiveUnit.Destroy();
            this.interactiveUnit = null;
        }

        if (this.icons) {
            while (this.icons.length > 0) {
                this.icons.pop().Destroy();
            }
            this.icons = null;
        }
    },

    getDuration: function() {
        return this.duration;
    },

    getSkipOffset: function() {
        return this.skipOffset;
    },

    getAllMedias: function() {
        return this.mediaFiles;
    },

    hasInteractiveUnit: function() {
        return this.interactiveUnit !== null;
    }
});

/**
 * VAST NonLinear Creative (overlay ads)
 */
var VASTNonLinear = ClassHelper.makeClass(VASTCreative, {

    initialize: function(vastAd, xml, adId, creativeId) {
        this.callSuper(this.initialize, vastAd, xml, adId, creativeId);

        this.resources = {
            html: null,
            iframe: null,
            images: {}
        };

        var elements;

        // HTML resource
        elements = xml.getElementsByTagName(TAG_HTMLRESOURCE);
        if (elements.length > 0) {
            this.resources.html = elements.item(0).textContent.replace(/\s+/g, "");
        }

        // IFrame resource
        elements = xml.getElementsByTagName(TAG_IFRAMERESOURCE);
        if (elements.length > 0) {
            this.resources.iframe = elements.item(0).textContent.replace(/\s+/g, "");
        }

        // Static resources
        elements = xml.getElementsByTagName(TAG_STATICRESOURCE);
        for (var i = 0; i < elements.length; i++) {
            var creativeType = elements.item(i).getAttribute("creativeType");
            this.resources.images[creativeType] = elements.item(i).textContent.replace(/\s+/g, "");
        }

        // Use parent's nonLinear tracking
        this.tracking = vastAd.nonLinearsTracking;

        // Click tracking
        var clickTracking = xml.getElementsByTagName("NonLinearClickTracking");
        if (clickTracking.length) {
            for (i = 0; i < clickTracking.length; i++) {
                this.tracking.addClickTracking(clickTracking.item(i).textContent.replace(/\s+/g, ""));
            }
        }

        // Click through
        var clickThrough = xml.getElementsByTagName(TAG_NONLINEARCLICKTHROUGH);
        if (clickThrough.length) {
            this.clickThrough = clickThrough.item(0).textContent.replace(/\s+/g, "");
        }

        // Attributes
        this.attributes = {};
        var attrNames = ["width", "height", "id", "expandedWidth", "expandedHeight",
                         "scalable", "maintainAspectRatio", "minSuggestedDuration", "apiFramework"];

        for (i = 0; i < attrNames.length; i++) {
            var attrName = attrNames[i];
            if (xml.hasAttribute(attrName)) {
                this.attributes[attrName] = xml.getAttribute(attrName);
            }
        }
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
        this.resources = null;
        this.attributes = null;
    },

    getAllResources: function() {
        return this.resources;
    }
});

// =============================================================================
// VASTAd - Single VAST Ad
// =============================================================================

/**
 * Wrapper hierarchy for ad lineage tracking
 */
var AdvertWrapper = ClassHelper.makeClass({

    initialize: function(adId, creativeId, adSystem) {
        this.AdId = adId;
        this.AdSystem = adSystem;
        this.CreativeID = creativeId;
        this.child = null;
    }
});

/**
 * Single VAST Ad
 */
var VASTAd = ClassHelper.makeClass({

    initialize: function(vastAds, xml) {
        this.container = null;
        this.vast = vastAds;
        this.vastXML = xml;
        this.id = "";
        this.AdTitle = "";
        this.Description = "";
        this.Advertiser = "";
        this.Survey = "";
        this.version = "";
        this.AdSystem = "";
        this.sequence = null;
        this.linear = null;
        this.nonLinears = [];
        this.nonLinearsTracking = null;
        this.hasContent = true;
        this.impressions = [];
        this.sentImpression = false;
        this.Extensions = [];
        this.AdvertLineage = null;

        this.nonLinearsTracking = new TrackingEvents(null, this);

        // Sequence
        if (xml.hasAttribute("sequence")) {
            this.sequence = parseInt(xml.getAttribute("sequence"), 10);
            Debugger.print(" *VASTAd* Extracted sequence: " + this.sequence);
        }

        // ID
        if (xml.hasAttribute("id")) {
            this.id = xml.getAttribute("id");
            Debugger.print(" *VASTAd* Extracted id: " + this.id);
        }

        // Inline
        var inlineEl = xml.getElementsByTagName(TAG_INLINE);
        if (inlineEl.length === 0) {
            Debugger.print(" *VASTAd* Found no inline element");
            this.hasContent = false;
            return;
        }

        Debugger.print(" *VASTAd* Inline located. Count (should be 1): " + inlineEl.length);
        inlineEl = inlineEl.item(0);

        // AdSystem
        var adSystemEl = inlineEl.getElementsByTagName(TAG_INLINE_ADSYSTEM);
        if (adSystemEl.length !== 0) {
            Debugger.print(" *VASTAd* Extracted AdSystem. Count: " + adSystemEl.length);
            var sysEl = adSystemEl.item(0);
            this.AdSystem = sysEl.textContent.replace(/\s+/g, "");

            if (sysEl.hasAttribute("version")) {
                this.version = sysEl.getAttribute("version");
                Debugger.print(" *VASTAd* Extracted AdSystem version: " + this.version);
            }
        }

        // AdTitle
        var titleEl = inlineEl.getElementsByTagName(TAG_INLINE_ADTITLE);
        if (titleEl.length !== 0) {
            this.AdTitle = titleEl.item(0).textContent.replace(/\s+/g, "");
            Debugger.print(" *VASTAd* Extracted AdTitle: " + this.AdTitle);
        }

        // Description
        var descEl = inlineEl.getElementsByTagName(TAG_INLINE_DESCRIPTION);
        if (descEl.length !== 0) {
            this.Description = descEl.item(0).textContent.replace(/\s+/g, "");
            Debugger.print(" *VASTAd* Extracted Description: " + this.Description);
        }

        // Survey
        var surveyEl = inlineEl.getElementsByTagName(TAG_INLINE_SURVEY);
        if (surveyEl.length !== 0) {
            this.Survey = surveyEl.item(0).textContent.replace(/\s+/g, "");
            Debugger.print(" *VASTAd* Extracted Survey: " + this.Survey);
        }

        // Advertiser
        var advertiserEl = inlineEl.getElementsByTagName(TAG_INLINE_ADVERTISER);
        if (advertiserEl.length !== 0) {
            this.Advertiser = advertiserEl.item(0).textContent.replace(/\s+/g, "");
            Debugger.print(" *VASTAd* Extracted Advertiser: " + this.Advertiser);
        }

        // Impressions
        var impressionEls = inlineEl.getElementsByTagName(TAG_IMPRESSION);
        Debugger.print(" *VASTAd* Extracted impressions. Count: " + impressionEls.length);

        for (var i = 0; i < impressionEls.length; i++) {
            this.impressions.push(impressionEls.item(i).textContent.replace(/\s+/g, ""));
            Debugger.print(" *VASTAd* Impression " + String(i + 1) + ". URL: " +
                           impressionEls.item(i).textContent.replace(/\s+/g, ""));
        }

        // Extensions
        var extensionsEl = xml.getElementsByTagName(TAG_AD_EXTENSIONS);
        Debugger.print(" *VASTAd* Extracted Extensions. Count: " + extensionsEl.length);

        if (extensionsEl.length > 0) {
            for (i = 0; i < extensionsEl.length; i++) {
                var extEl = extensionsEl.item(i).getElementsByTagName(TAG_AD_EXTENSION);
                Debugger.print(" *VASTAd* For Extensions tag " + String(i + 1) +
                               ", Extension count: " + extEl.length);

                if (extEl.length > 0) {
                    for (var j = 0; j < extEl.length; j++) {
                        Debugger.print(" *VASTAd* For Extensions tag " + String(i + 1) +
                                       ", Extension " + String(j + 1) + " have added item");

                        // Check for wrapper hierarchy
                        if (extEl.item(j).hasAttribute("type") &&
                            extEl.item(j).getAttribute("type") === "com.yospace.wrapperhierarchy") {

                            var wrapperNode = extEl.item(j).firstChild;
                            var lastWrapper = null;

                            while (wrapperNode !== null) {
                                if (wrapperNode.tagName === "AdWrapper") {
                                    Debugger.print("Detected Hierarchy: " + wrapperNode.getAttribute("id") +
                                                   " / " + wrapperNode.getAttribute("creativeId") +
                                                   " / " + wrapperNode.getAttribute("AdSystem"));

                                    var wrapper = new AdvertWrapper(
                                        wrapperNode.getAttribute("id"),
                                        wrapperNode.getAttribute("creativeId"),
                                        wrapperNode.getAttribute("AdSystem")
                                    );

                                    if (lastWrapper === null) {
                                        this.AdvertLineage = wrapper;
                                    } else {
                                        lastWrapper.child = wrapper;
                                    }

                                    lastWrapper = wrapper;
                                }
                                wrapperNode = wrapperNode.firstChild;
                            }
                        } else {
                            this.Extensions.push(extEl.item(j));
                        }
                    }
                }
            }
        }

        // Creatives
        var creativesEl = inlineEl.getElementsByTagName(TAG_CREATIVES);
        Debugger.print(" *VASTAd* Extracted creatives tag. Count: " + creativesEl.length);

        if (creativesEl.length !== 0) {
            creativesEl = creativesEl.item(0).getElementsByTagName(TAG_CREATIVE);
            Debugger.print(" *VASTAd* Extracted creatives. Count: " + creativesEl.length);

            for (i = 0; i < creativesEl.length; i++) {
                var adId = "";
                var creativeId = "";

                if (creativesEl.item(i).hasAttribute("AdID")) {
                    adId = creativesEl.item(i).getAttribute("AdID");
                }
                if (creativesEl.item(i).hasAttribute("id")) {
                    creativeId = creativesEl.item(i).getAttribute("id");
                }

                Debugger.print(" *VASTAd* For creatives " + String(i + 1) +
                               ", AdID: " + adId + ", CreativeID: " + creativeId);

                // Find first element child (skip text nodes)
                var creativeChild = creativesEl.item(i).firstChild;
                while (creativeChild !== null && creativeChild.nodeType === 3) {
                    creativeChild = creativeChild.nextSibling;
                }

                if (creativeChild !== null) {
                    switch (creativeChild.tagName) {
                        case TAG_LINEAR:
                            Debugger.print(" *VASTAd* For creatives " + String(i + 1) + ", Extracting Linear");
                            this.linear = new VASTLinear(this, creativeChild, adId, creativeId);
                            break;

                        case TAG_NONLINEARADS:
                            Debugger.print(" *VASTAd* For creatives " + String(i + 1) + ", Extracting NonLinear");
                            var nlTagName = creativeChild.tagName.replace("Ads", "");
                            var nlElements = creativeChild.getElementsByTagName(nlTagName);

                            for (j = 0; j < nlElements.length; j++) {
                                var nonLinear = new VASTNonLinear(this, nlElements.item(j), adId, creativeId);
                                if (nonLinear !== null) {
                                    this.nonLinears.push(nonLinear);
                                }
                            }
                            break;
                    }
                }
            }
        }
    },

    Destroy: function() {
        this.hasContent = false;
        this.vast = null;
        this.vastXML = null;
        this.impressions = null;
        this.Extensions = null;
        this.container = null;
        this.AdvertLineage = null;

        if (this.linear) {
            this.linear.Destroy();
            this.linear = null;
        }

        if (this.nonLinearsTracking) {
            this.nonLinearsTracking.Destroy();
            this.nonLinearsTracking = null;
        }

        if (this.nonLinears) {
            while (this.nonLinears.length > 0) {
                this.nonLinears.pop().Destroy();
            }
            this.nonLinears = null;
        }
    },

    hasSentImpression: function() {
        return this.sentImpression;
    },

    impressionSent: function() {
        this.sentImpression = true;
    },

    isNumber: function(num) {
        return this.sequence === num;
    },

    hasSequence: function() {
        return this.sequence !== null;
    },

    isEmpty: function() {
        return !this.hasContent;
    },

    getLinear: function() {
        return this.linear;
    },

    getNonLinears: function() {
        return this.nonLinears;
    }
});

/**
 * VAST Ads container
 */
var VASTAds = ClassHelper.makeClass({

    initialize: function(onSuccess, onError) {
        this.ads = [];
        this.onAdsAvailable = onSuccess;
        this.onAdsError = onError;
        this.onReceivedErrorCounter = 0;
    },

    Destroy: function() {
        this.onAdsAvailable = null;
        this.onAdsError = null;

        while (this.ads.length > 0) {
            this.ads.pop().Destroy();
        }
        this.ads = null;
    },

    parse: function(xml) {
        var adElements = YSParseUtils.getDOMElements(xml, "", "*", TAG_AD);
        var self = this;

        if (adElements.length !== 0) {
            for (var i = 0; i < adElements.length; i++) {
                var ad = new VASTAd(this, adElements.item(i));

                if (ad.isEmpty()) {
                    Debugger.print("Parsed an empty ad");

                    (function() {
                        self.onReceivedErrorCounter++;
                        if (self.onReceivedErrorCounter === adElements.length &&
                            typeof this.onAdsError === "function") {
                            this.onAdsError.call(this, "All Ads Failed");
                        }
                    })();
                } else {
                    this.ads.push(ad);
                }
            }

            if (typeof this.onAdsAvailable === "function") {
                this.onAdsAvailable.call(this, this.ads);
            }
        } else {
            if (typeof this.onAdsAvailable === "function") {
                this.onAdsAvailable.call(this, []);
            }
        }
    }
});

// =============================================================================
// Parsers - VMAP, Playlist, VAST
// =============================================================================

/**
 * VMAP Ad Break
 */
var AdBreak = ClassHelper.makeClass({

    initialize: function(xml) {
        this.adSource = null;
        this.vast = null;
        this.tracking = null;
        this.extensions = null;
        this.isValid = false;

        this.position = xml.getAttribute(ATTR_AD_BREAK_START);
        this.type = xml.getAttribute(ATTR_AD_BREAK_TYPE);
        this.id = xml.getAttribute(ATTR_AD_BREAK_ID);

        // Ad Source
        var adSourceEl = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_AD_SOURCE);

        if (adSourceEl.length) {
            var vastDataEl = YSParseUtils.getDOMElements(adSourceEl.item(0), "vmap", VMAPNS, TAG_VAST_AD_DATA);

            if (vastDataEl.length) {
                var self = this;
                this.adSource = vastDataEl.item(0).innerHTML;

                this.vast = new VASTAds(
                    function(ads) {
                        Debugger.print("VAST: " + ads.length);
                        if (ads.length > 0) {
                            self.isValid = true;
                        }
                    },
                    function() {
                        Debugger.print("Vast Failed");
                    }
                );

                this.vast.parse(vastDataEl.item(0));
            } else {
                Debugger.print("Not a VASTAdData tag");
            }
        } else {
            Debugger.print("No AdSource section in AdBreak");
        }

        // Tracking Events
        var trackingEl = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_VMAP_TRACKING_EVENTS);

        if (trackingEl.length) {
            this.tracking = new TrackingEvents(trackingEl.item(0), null);
            this.isValid = true;
        } else {
            Debugger.print("No TrackingEvents section in AdBreak");
        }

        // Extensions
        var extensionsEl = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_VMAP_EXTENSIONS);

        if (extensionsEl.length) {
            this.extensions = new Extensions(extensionsEl.item(0));
        } else {
            Debugger.print("No Extensions section in AdBreak");
        }
    },

    Destroy: function() {
        this.adSource = null;

        if (this.vast) {
            this.vast.Destroy();
            this.vast = null;
        }

        if (this.tracking) {
            this.tracking.Destroy();
            this.tracking = null;
        }

        if (this.extensions) {
            this.extensions.Destroy();
            this.extensions = null;
        }
    }
});

/**
 * VMAP Parser
 */
var VMAPParser = ClassHelper.makeClass({

    initialize: function(url, onSuccess, onFailure) {
        this.breaks = [];
        this.extensions = null;
        this.server = url;
        this.onSuccess = onSuccess;
        this.onFailure = onFailure;

        if (url !== null) {
            if (ProtoAjax.DELEGATE !== null) {
                ProtoAjax.DELEGATE(url, {
                    onSuccess: this.onLoadSuccess.bind(this),
                    onFailure: this.onLoadFailure.bind(this)
                });
            } else {
                new ProtoAjax.Request(url, {
                    method: "get",
                    evalJSON: false,
                    evalJS: false,
                    onSuccess: this.onLoadSuccess.bind(this),
                    onFailure: this.onLoadFailure.bind(this)
                });
            }
        }
    },

    Destroy: function() {
        if (this.extensions) {
            this.extensions.Destroy();
            this.extensions = null;
        }

        this.onSuccess = null;
        this.onFailure = null;

        while (this.breaks.length > 0) {
            this.breaks.pop().Destroy();
        }
        this.breaks = null;
    },

    onLoadSuccess: function(response) {
        var isM3U8 = response.responseText.indexOf("#EXTM3U") >= 0;

        if (response.responseXML === null) {
            if (typeof this.onFailure === "function") {
                if (isM3U8) {
                    this.onFailure.call(this, "ism3u8");
                } else {
                    this.onFailure.call(this, response.status);
                }
            }
        } else {
            this.parse(response.responseXML);
        }
    },

    onLoadFailure: function(response) {
        Debugger.printErr("Failed to load VMAP from '" + this.server + "': " + response.status);

        if (typeof this.onFailure === "function") {
            this.onFailure.call(this, response.status);
        }
    },

    parse: function(xml) {
        if (xml === null) {
            if (typeof this.onFailure === "function") {
                this.onFailure.call(this, "error");
            }
            return;
        }

        // If document node, step into VMAP root
        if (xml.nodeType === 9) {
            Debugger.print("Looks like VMAP document was provided. Stepping into root node");

            var vmapRoot = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, "VMAP");

            if (vmapRoot.length !== 1) {
                Debugger.print("VMAP root node count was not 1. This probably wont work: " + vmapRoot.length);
                if (typeof this.onFailure === "function") {
                    this.onFailure.call(this, "error");
                }
                return;
            }

            xml = vmapRoot.item(0);
            Debugger.print("Located root node");
        }

        // Debug diagnostics
        if (YSSessionManager.DEFAULTS.AD_DEBUG === true && YSSessionManager.DEFAULTS.DEBUGGING === true) {
            var commentNode = xml.parentNode.children.item(0).nextSibling;
            if (commentNode !== null && commentNode.nodeType === Node.COMMENT_NODE) {
                Debugger.print(" ************* AD-CALL DIAGNOSTICS ****************");
                Debugger.print(commentNode.nodeValue);
                Debugger.print(" ************* END DIAGNOSTICS ****************");
            }
        }

        // Parse AdBreaks
        var adBreakElements = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_VMAP_AD_BREAK);

        if (adBreakElements.length) {
            for (var i = 0; i < adBreakElements.length; i++) {
                Debugger.print("Processing break: " + i);

                var breakEl = adBreakElements.item(i);

                // Verify parent is the VMAP root
                if (breakEl.parentNode !== undefined &&
                    (breakEl.parentNode === xml ||
                     (xml.tagName !== undefined && breakEl.parentNode.tagName === xml.tagName))) {

                    var adBreak = new AdBreak(breakEl);

                    if (adBreak.isValid) {
                        this.breaks.push(adBreak);
                    } else {
                        Debugger.print("Break not valid");
                    }
                } else {
                    Debugger.print("Ignoring floating AdBreak");
                }
            }
        } else {
            Debugger.print(" ** NO ADBREAK ELEMENTS LOCATED IN VMAP.");
        }

        // Parse Extensions
        var extensionsEl = YSParseUtils.getDOMElements(xml, "vmap", VMAPNS, TAG_VMAP_EXTENSIONS);

        if (extensionsEl.length) {
            for (var j = 0; j < extensionsEl.length; j++) {
                var extEl = typeof extensionsEl.item === "function" ? extensionsEl.item(j) : extensionsEl[j];
                var parentNode = extEl !== undefined ? extEl.parentNode : undefined;

                if (parentNode !== undefined &&
                    (parentNode === xml ||
                     (xml.tagName !== undefined && parentNode.tagName === xml.tagName))) {

                    this.extensions = new Extensions(extensionsEl.item(j));
                    break;
                }

                Debugger.print("Ignoring custom extension which is not top-level");
            }
        } else {
            Debugger.print(" ** NO EXTENSIONS LOCATED IN VMAP.");
        }

        // Validate extensions
        var allValid = true;

        if (this.extensions !== null && this.extensions.extensions !== null) {
            for (var k = 0; k < this.extensions.extensions.length; k++) {
                if (!this.extensions.extensions[k].isValid) {
                    Debugger.print("Extension " + k + " is not valid");
                    allValid = false;
                    break;
                }
            }
        } else {
            Debugger.print("extensions is " + (this.extensions !== null ? "NOT" : "") + " null");
            if (this.extensions !== null) {
                Debugger.print("extensions.extensions is " +
                               (this.extensions.extensions !== null ? "NOT" : "") + " null");
            }
        }

        if (allValid) {
            if (typeof this.onSuccess === "function") {
                this.onSuccess.call(this, this.breaks);
            }
        } else {
            if (typeof this.onFailure === "function") {
                this.onFailure.call(this, "error");
            }
        }
    }
});

/**
 * Playlist (M3U8/DASH) Parser
 */
var PlaylistParser = ClassHelper.makeClass({

    initialize: function(url, onSuccess, onFailure) {
        Debugger.print("Loading M3U8 from: " + url);

        this.server = url;
        this.content = [];
        this.handleSuccess = onSuccess;
        this.handleFailure = onFailure;
        this.isRedirect = false;
        this.isXML = false;

        if (ProtoAjax.DELEGATE !== null) {
            ProtoAjax.DELEGATE(url, {
                onSuccess: this.onLoadSucceeded.bind(this),
                onFailure: this.onLoadFailed.bind(this)
            });
        } else {
            new ProtoAjax.Request(url, {
                method: "get",
                evalJSON: false,
                evalJS: false,
                onSuccess: this.onLoadSucceeded.bind(this),
                onFailure: this.onLoadFailed.bind(this)
            });
        }
    },

    Destroy: function() {
        this.handleSuccess = null;
        this.handleFailure = null;
        this.content = null;
    },

    onLoadSucceeded: function(response) {
        Debugger.print("Playlist loaded... parsing");

        // Check for redirect
        if (response.transport !== undefined &&
            response.transport.responseURL !== undefined &&
            response.transport.status !== 0 &&
            response.transport.responseURL !== this.server) {

            this.server = response.transport.responseURL;
            Debugger.print("Detected a playlist redirect to: " + this.server);
            this.isRedirect = true;
        }

        if (response.responseXML === null) {
            this.content = this.textToArray(response.responseText);
        } else {
            this.isXML = true;
            this.content = [response.responseXML];
        }

        if (response.transport.status >= 200 && response.transport.status <= 399) {
            if (typeof this.handleSuccess === "function") {
                this.handleSuccess.call(this);
            }
        } else {
            if (typeof this.handleFailure === "function") {
                this.handleFailure.call(this, response.transport.status);
            }
        }
    },

    onLoadFailed: function(response) {
        Debugger.printErr("Failed to load Playlist from '" + this.server + "':" + response.status);

        if (typeof this.handleFailure === "function") {
            this.handleFailure.call(this, response.status);
        }
    },

    textToArray: function(text) {
        if (typeof text !== "string") {
            return [];
        }

        text = String(text).trim();
        return text ? text.split(/\s+/) : [];
    }
});

/**
 * VAST Parser
 */
var VASTParser = ClassHelper.makeClass({

    initialize: function(url, onSuccess, onFailure) {
        this.ads = null;
        this.server = url;
        this.onSuccess = onSuccess;
        this.onFailure = onFailure;
    },

    Destroy: function() {
        this.onSuccess = null;
        this.onFailure = null;

        if (this.ads !== null) {
            this.ads.Destroy();
            this.ads = null;
        }
    },

    load: function() {
        if (this.server !== null) {
            Debugger.print("Loading VAST from: " + this.server);

            if (ProtoAjax.DELEGATE !== null) {
                ProtoAjax.DELEGATE(this.server, {
                    onSuccess: this.onLoadSuccess.bind(this),
                    onFailure: this.onLoadFailure.bind(this)
                });
            } else {
                new ProtoAjax.Request(this.server, {
                    method: "get",
                    evalJSON: false,
                    evalJS: false,
                    onSuccess: this.onLoadSuccess.bind(this),
                    onFailure: this.onLoadFailure.bind(this)
                });
            }
        }
    },

    onLoadSuccess: function(response) {
        this.parse(response.responseXML);
    },

    parse: function(xml) {
        this.ads = new VASTAds(this.onVastReady.bind(this), this.onVastFailed.bind(this));
        this.ads.parse(xml);

        // Debug diagnostics
        if (YSSessionManager.DEFAULTS.AD_DEBUG === true && YSSessionManager.DEFAULTS.DEBUGGING === true) {
            var commentNode = xml.children.item(0).nextSibling;
            if (commentNode !== null && commentNode.nodeType === Node.COMMENT_NODE) {
                Debugger.print(" ************* AD-CALL DIAGNOSTICS ****************");
                Debugger.print(commentNode.nodeValue);
                Debugger.print(" ************* END DIAGNOSTICS ****************");
            }
        }
    },

    onVastReady: function(ads) {
        if (typeof this.onSuccess === "function") {
            this.onSuccess.call(this, this.ads.ads);
        }
    },

    onVastFailed: function(error) {
        Debugger.print("ADS ERROR: " + error);
        if (typeof this.onFailure === "function") {
            this.onFailure.call(this, error);
        }
    },

    onLoadFailure: function(response) {
        Debugger.printErr("Failed to load VAST from '" + this.server + "':" + response);
        if (typeof this.onFailure === "function") {
            this.onFailure.call(this, response);
        }
    }
});

// =============================================================================
// YOPoller - Analytics Polling
// =============================================================================

var YOPoller = ClassHelper.makeClass({

    initialize: function(longPeriod, shortPeriod) {
        this.longperiod = longPeriod;
        this.shortperiod = shortPeriod;
        this.running = false;
        this.highpriority = false;
        this.timer = null;
        this.callback = null;
    },

    Destroy: function() {
        if (this.isRunning()) {
            this.stopPolling();
        }
        this.callback = null;
    },

    isRunning: function() {
        return this.running === true && this.timer !== null;
    },

    startPolling: function(highPriority, callback) {
        if (this.timer !== null) {
            this.stopPolling();
        }

        this.callback = callback;
        this.highpriority = highPriority;
        this.running = true;

        var interval = highPriority ? this.shortperiod : this.longperiod;
        this.timer = setInterval(this.timerElapsed.bind(this), interval);
    },

    stopPolling: function() {
        this.running = false;

        if (this.timer !== null) {
            clearInterval(this.timer);
        }

        this.timer = null;
    },

    timerElapsed: function() {
        if (this.callback) {
            this.callback.call(this);
        }
    }
});

// =============================================================================
// Timeline Classes
// =============================================================================

/**
 * Timeline element types
 */
var YSTimelineElement = ClassHelper.makeClass({

    initialize: function(offset, duration) {
        this.type = "";
        this.offset = offset;
        this.duration = duration;
    },

    Destroy: function() {},

    getType: function() {
        return this.type;
    }
});

YSTimelineElement.VOD = "vod";
YSTimelineElement.ADVERT = "advert";
YSTimelineElement.LIVE = "live";

/**
 * VOD content element
 */
var YSTimelineVODElement = ClassHelper.makeClass(YSTimelineElement, {

    initialize: function(offset, duration) {
        this.callSuper(this.initialize, offset, duration);
        this.type = YSTimelineElement.VOD;
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
    }
});

/**
 * Live content element
 */
var YSTimelineLiveElement = ClassHelper.makeClass(YSTimelineElement, {

    initialize: function(offset, duration) {
        this.callSuper(this.initialize, offset, duration);
        this.type = YSTimelineElement.LIVE;
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
    }
});

/**
 * Advert element
 */
var YSTimelineAdvertElement = ClassHelper.makeClass(YSTimelineElement, {

    initialize: function(offset, duration, adBreak) {
        this.callSuper(this.initialize, offset, duration);
        this.type = YSTimelineElement.ADVERT;
        this.adBreak = adBreak;
    },

    Destroy: function() {
        this.callSuper(this.Destroy);
        this.adBreak = null;
    },

    getAdverts: function() {
        return this.adBreak;
    }
});

/**
 * Timeline manager
 */
var YSTimeline = ClassHelper.makeClass({

    initialize: function() {
        this.elements = [];
        this.modified = false;
        this.startOffset = 0;
    },

    Destroy: function() {
        while (this.elements.length > 0) {
            this.elements.pop().Destroy();
        }
        this.elements = null;
    },

    UpdateOffset: function(offset) {
        this.startOffset = offset;

        while (this.elements.length > 0) {
            var element = this.elements[0];

            if (element.offset >= offset) {
                break;
            }

            if (element.offset + element.duration <= offset) {
                // Element completely before offset, remove it
                this.elements.splice(0, 1);
            } else {
                // Element spans offset, trim it
                var trimAmount = offset - element.offset;
                element.duration -= trimAmount;
                element.offset = offset;

                // Handle advert element pruning
                if (element instanceof YSTimelineAdvertElement) {
                    Debugger.print("Validating advert element");

                    var adBreak = element.getAdverts();

                    if (element.duration < adBreak.getDuration()) {
                        Debugger.print("Pruning is required");

                        var adverts = adBreak.adverts;
                        var accumulatedDuration = 0;

                        if (adverts && adverts.length > 0) {
                            Debugger.print("Validating " + adverts.length + " adverts");

                            for (var i = adverts.length - 1; i >= 0;) {
                                if (accumulatedDuration >= element.duration) {
                                    Debugger.print("Winding up. Removing from index: " + i);
                                    while (i >= 0) {
                                        adverts.shift();
                                        i--;
                                    }
                                } else if (adverts[i].duration <= element.duration - accumulatedDuration) {
                                    Debugger.print("Preserving index: " + i);
                                    accumulatedDuration += adverts[i].duration;
                                    i--;
                                } else {
                                    var newDuration = element.duration - accumulatedDuration;
                                    Debugger.print("Truncating index: " + i + " to duration: " + newDuration);
                                    adverts[i].duration = newDuration;
                                    accumulatedDuration += newDuration;
                                    i--;
                                }
                            }
                        }
                    } else {
                        Debugger.print("Prune not required");
                    }
                }

                Debugger.print("New duration: " + element.duration);
                break;
            }
        }
    },

    appendElement: function(element) {
        this.elements.push(element);
        this.modified = true;
    },

    clear: function() {
        this.elements = [];
        this.modified = true;
    },

    getElementAtTime: function(time) {
        for (var i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (time >= element.offset && time < element.offset + element.duration) {
                return element;
            }
        }
        return null;
    },

    getNextElementForTime: function(time) {
        for (var i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (element.offset > time) {
                return element;
            }
        }
        return null;
    },

    getAllElements: function() {
        return this.elements;
    },

    isModified: function() {
        var wasModified = this.modified;
        this.modified = false;
        return wasModified;
    },

    adjustContent: function(totalDuration) {
        var elements = this.getAllElements();
        var accumulatedDuration = 0;
        var contentDuration = 0;
        var index = 0;
        var lastEnd = this.startOffset;

        totalDuration += this.startOffset;

        while (index < elements.length) {
            var element = elements[index];
            accumulatedDuration += element.duration;

            if (element.getType() !== YSTimelineElement.ADVERT) {
                // Remove non-advert elements (will be rebuilt)
                this.elements.splice(index, 1);
            } else {
                // Insert content before advert if needed
                if (element.offset > this.startOffset) {
                    contentDuration += element.offset - lastEnd;
                    contentDuration += element.duration;
                    this.elements.splice(index, 0, new YSTimelineVODElement(lastEnd, element.offset - lastEnd));
                    index++;
                }
                lastEnd = element.offset + element.duration;
                index++;
            }
        }

        // Add trailing content
        if (totalDuration > lastEnd && Math.abs(totalDuration - lastEnd) > 1) {
            contentDuration += totalDuration - lastEnd;
            this.appendElement(new YSTimelineVODElement(lastEnd, totalDuration - lastEnd));
        }

        if (contentDuration !== accumulatedDuration) {
            if (this.elements.length > 0) {
                var lastElement = this.elements[this.elements.length - 1];
                Debugger.print("Range: " + this.elements[0].offset + " to " +
                               (lastElement.offset + lastElement.duration) + " with length: " + contentDuration);
            }
            this.modified = true;
        }
    },

    getTotalDuration: function() {
        var total = 0;
        for (var i = 0; i < this.elements.length; i++) {
            total += this.elements[i].duration;
        }
        return total;
    }
});

// =============================================================================
// Ad Break and Advert Classes
// =============================================================================

/**
 * Yospace Ad Break
 */
var YSAdBreak = ClassHelper.makeClass({

    initialize: function(vmapBreak) {
        this.vmapBreak = vmapBreak;
        this.adBreakIdentifier = "";
        this.adBreakDescription = "";
        this.adverts = [];
        this.startPosition = 0;
    },

    Destroy: function() {
        while (this.adverts.length > 0) {
            this.adverts.pop().Destroy();
        }
        this.adverts = null;
        this.vmapBreak = null;
    },

    isActive: function() {
        if (!this.adverts || this.adverts.length === 0) {
            return false;
        }

        for (var i = 0; i < this.adverts.length; i++) {
            if (this.adverts[i].isActive) {
                return true;
            }
        }

        return false;
    },

    getDuration: function() {
        var total = 0;

        if (this.adverts && this.adverts.length !== 0) {
            for (var i = 0; i < this.adverts.length; i++) {
                total += this.adverts[i].duration;
            }
        }

        return total;
    },

    getAdvertForPosition: function(position) {
        if (this.adverts && this.adverts.length > 0) {
            var currentPos = this.startPosition;

            for (var i = 0; i < this.adverts.length; i++) {
                if (position >= currentPos && (position - currentPos) < this.adverts[i].duration) {
                    return this.adverts[i];
                }
                currentPos += this.adverts[i].duration;
            }
        } else {
            Debugger.print("No adverts!!");
        }

        return null;
    }
});

/**
 * Yospace Advert
 */
var YSAdvert = ClassHelper.makeClass({

    initialize: function(vastAd, timeoutCallback, adBreak) {
        this.isActive = true;
        this.advert = vastAd;
        this.duration = vastAd.getLinear().getDuration();
        this.watchdogCallback = timeoutCallback;
        this.watchdog = null;
        this.trackingMonitor = null;
        this.startPosition = undefined;
        this.alreadyElapsed = 0;
        this.paused = false;
        this.trackingPoint = 0;
        this.adBreak = adBreak;

        vastAd.container = this;
    },

    Destroy: function() {
        this.adBreak = null;
    },

    getBreak: function() {
        return this.adBreak;
    },

    getAdvertID: function() {
        var id = "";
        if (this.advert) {
            var match = YSSession.idRE.exec(this.advert.id);
            id = match ? match[1] : "";
        }
        return id;
    },

    getCreativeID: function() {
        var id = "";
        if (this.advert) {
            var linear = this.advert.getLinear();
            if (linear) {
                id = linear.CreativeID;
            }
        }
        return id;
    },

    getMediaID: function() {
        var id = "";
        if (this.advert) {
            var match = YSSession.idRE.exec(this.advert.id);
            id = match ? match[2] : this.advert.id;
        }
        return id;
    },

    isFiller: function() {
        return this.advert.AdTitle === "filler";
    },

    hasInteractiveUnit: function() {
        return this.advert !== null &&
               this.advert.getLinear() !== null &&
               this.advert.getLinear().hasInteractiveUnit();
    },

    getInteractiveUnit: function() {
        return this.hasInteractiveUnit() ? this.advert.getLinear().interactiveUnit : null;
    },

    pingWatchdog: function() {
        var events = [];

        if (!this.paused) {
            if (this.watchdog !== null) {
                this.stopWatchdog();
            }

            this.startWatchdog(this.duration);

            if (this.duration > 0) {
                var elapsed = this.timeElapsed();
                var duration = this.duration;
                var assetUri = "dummyasset";
                var adBreak = this.adBreak;
                var breakDuration = "";

                if (this.advert.getLinear()) {
                    var mediaFiles = this.advert.getLinear().getAllMedias();
                    if (mediaFiles && mediaFiles.length > 0) {
                        assetUri = mediaFiles[0].src;
                    }

                    breakDuration = YSParseUtils.timecodeToString(adBreak.getDuration());
                    this.advert.getLinear().trackProgress(elapsed, assetUri, breakDuration);
                }

                // First quartile (25%)
                if (elapsed > duration / 4 && this.trackingPoint < 2) {
                    Debugger.print(" -=-> First Quartile");
                    events.push({ track_id: "firstQuartile", progress: elapsed, asset: assetUri });
                    this.advert.getLinear().track("firstQuartile", elapsed, assetUri, breakDuration);
                    this.trackingPoint = 2;
                }

                // Midpoint (50%)
                if (elapsed > duration / 2 && this.trackingPoint < 3) {
                    Debugger.print(" -=-> Midpoint");
                    events.push({ track_id: "midpoint", progress: elapsed, asset: assetUri });
                    this.advert.getLinear().track("midpoint", elapsed, assetUri, breakDuration);
                    this.trackingPoint = 3;
                }

                // Third quartile (75%)
                if (elapsed > (3 * duration) / 4 && this.trackingPoint < 4) {
                    Debugger.print(" -=-> Third Quartile");
                    events.push({ track_id: "thirdQuartile", progress: elapsed, asset: assetUri });
                    this.advert.getLinear().track("thirdQuartile", elapsed, assetUri, breakDuration);
                    this.trackingPoint = 4;
                }
            }

            return events;
        }
    },

    startWatchdog: function(timeout) {
        if (this.watchdog === null) {
            var self = this;

            this.watchdog = setTimeout(function() {
                console.log("Ad watchdog timer fired!");
                if (typeof self.watchdogCallback === "function") {
                    self.watchdogCallback.call(this);
                }
            }, timeout * 1000);
        }
    },

    stopWatchdog: function() {
        if (this.watchdog !== null) {
            clearTimeout(this.watchdog);
            this.watchdog = null;
        }
    },

    isSuppressed: function(suppress) {
        var linearSuppressed, nonLinearSuppressed;
        var combined = [];

        if (this.advert && this.advert.getLinear()) {
            linearSuppressed = this.advert.getLinear().tracking.suppressAnalytics(suppress);
        }

        if (this.advert && this.advert.nonLinearsTracking) {
            nonLinearSuppressed = this.advert.nonLinearsTracking.suppressAnalytics(suppress);
        }

        if (!suppress) {
            if (linearSuppressed) {
                for (var i = 0; i < linearSuppressed.length; i++) {
                    combined.push(linearSuppressed[i]);
                }
            }

            if (nonLinearSuppressed) {
                for (var j = 0; j < nonLinearSuppressed.length; j++) {
                    combined.push(nonLinearSuppressed[j]);
                }
            }

            if (this.isActive) {
                this.startWatchdog(this.duration);
            }

            return combined;
        }

        this.stopWatchdog();
        return null;
    },

    setActive: function(active) {
        if (this.isActive) {
            if (active) {
                this.isActive = active;
                this.startPosition = (new Date()).getTime();
                this.alreadyElapsed = 0;
                this.trackingPoint = 0;
                this.startWatchdog(this.duration);

                Debugger.print(" -=-> Creative View/Start");

                if (!this.hasInteractiveUnit()) {
                    this.invokeTracking("creativeView", false);
                    this.invokeTracking("start", false);
                }
            } else {
                Debugger.print(" -=-> Complete");
                this.stopWatchdog();

                if (!this.paused) {
                    if (this.trackingPoint >= 4) {
                        this.invokeTracking("complete", false, this.duration);
                    }
                    this.isActive = active;
                }
            }
        }
    },

    invokeTracking: function(event, linearOnly, elapsed) {
        var assetUri = "";
        var elapsedTime = elapsed === undefined ? 0 : elapsed;
        var adBreak = this.adBreak;
        var breakDuration = "";
        var linear = this.advert.getLinear();

        if (linear) {
            elapsedTime = elapsed === undefined ? this.timeElapsed() : elapsed;

            var mediaFiles = linear.getAllMedias();
            if (mediaFiles && mediaFiles.length > 0) {
                assetUri = mediaFiles[0].src;
            }

            breakDuration = YSParseUtils.timecodeToString(adBreak.getDuration());
            linear.track(event, elapsedTime, assetUri, breakDuration);

            if (this.trackingMonitor && typeof this.trackingMonitor === "function") {
                this.trackingMonitor(event, elapsedTime, assetUri);
            }
        }

        if (linearOnly !== undefined && Boolean(linearOnly) === false) {
            Debugger.print("Tracking non-linears");

            var nonLinearTracking = this.advert.nonLinearsTracking;
            if (nonLinearTracking) {
                nonLinearTracking.track(event, elapsedTime, assetUri, breakDuration);
            }
        }
    },

    reportLinearEvent: function(event) {
        this.invokeTracking(event, true, this.duration);
    },

    reportNonLinearEvent: function(index, event) {
        var assetUri = "";
        var elapsed = 0;
        var adBreak = this.adBreak;
        var breakDuration = "";
        var linear = this.advert.getLinear();

        if (linear) {
            elapsed = this.timeElapsed();

            var mediaFiles = linear.getAllMedias();
            if (mediaFiles && mediaFiles.length > 0) {
                assetUri = mediaFiles[0].src;
            }

            breakDuration = YSParseUtils.timecodeToString(adBreak.getDuration());
        }

        var nonLinearTracking = this.advert.nonLinearsTracking;
        if (nonLinearTracking) {
            nonLinearTracking.track(event, elapsed, assetUri, breakDuration);
        }
    },

    timeElapsed: function() {
        if (this.paused) {
            return this.alreadyElapsed;
        }
        return this.alreadyElapsed + ((new Date()).getTime() - this.startPosition) / 1000;
    },

    adPaused: function() {
        if (!this.paused) {
            Debugger.print(" -=-> Paused");
            this.stopWatchdog();
            this.alreadyElapsed = this.timeElapsed();
            this.paused = true;
            this.startPosition = 0;
        }
    },

    adResumed: function() {
        if (this.paused) {
            Debugger.print(" -=-> Resumed");
            this.startPosition = (new Date()).getTime();
            this.paused = false;
            this.pingWatchdog();
        }
    }
});

// =============================================================================
// Player Policy
// =============================================================================

/**
 * Player policy for controlling playback during ads
 */
var YSPlayerPolicy = ClassHelper.makeClass({

    initialize: function(session) {
        this.session = session;
    },

    Destroy: function() {
        this.session = null;
    },

    /**
     * Check if seeking to position is allowed
     * @param {number} position - Target position
     * @returns {number} Allowed position
     */
    canSeekTo: function(position) {
        Debugger.print("Checking seek to: " + position);

        if (!(this.session instanceof YSLiveSession)) {
            Debugger.print("VOD can seek to: " + position);

            var timeline = this.session.timeline;

            if (timeline) {
                if (!this.canSeek()) {
                    Debugger.print("Returning last position as we're in an active advert");
                    return this.session.lastPosition || 0;
                }

                var elements = timeline.getAllElements();
                timeline.getElementAtTime(this.session.lastPosition);

                if (elements && elements.length !== 0) {
                    var breakStart = -1;
                    var foundActive = false;

                    for (var i = elements.length - 1; i >= 0; i--) {
                        Debugger.print("Checking element from " + elements[i].offset +
                                       " with duration: " + elements[i].duration);

                        if (elements[i].getType() === YSTimelineElement.ADVERT) {
                            if (foundActive) {
                                // Deactivate skipped breaks
                                var adverts = elements[i].getAdverts().adverts;
                                for (var j = 0; j < adverts.length; j++) {
                                    adverts[j].setActive(false);
                                }
                            } else if (position >= elements[i].offset && elements[i].getAdverts().isActive()) {
                                Debugger.print("Break reports active");
                                breakStart = elements[i].offset;
                                foundActive = true;
                            }
                        }
                    }

                    if (foundActive && this.session.player !== null &&
                        typeof this.session.player.UpdateTimeline === "function") {
                        Debugger.print("Reporting timeline to player: " +
                                       YSParseUtils.timecodeToString(timeline.getTotalDuration()));
                        this.session.player.UpdateTimeline(timeline);
                    }

                    return breakStart === -1 ? position : breakStart;
                }

                Debugger.print("No elements");
            } else {
                Debugger.print("No timeline");
            }

            return position;
        }

        Debugger.print("Returning live default");
        return this.session.lastPosition;
    },

    canStart: function() {
        return true;
    },

    canStop: function() {
        return true;
    },

    canPause: function() {
        return !(this.session instanceof YSLiveSession);
    },

    canSeek: function() {
        if (this.session instanceof YSLiveSession) {
            return false;
        }

        if (this.session.isInAnAdvert() && this.session.currentAdvert.isActive) {
            return false;
        }

        return true;
    },

    /**
     * Check if ad can be skipped
     * @returns {number} Seconds until skip available, 0 if can skip now, -1 if not skippable
     */
    canSkip: function() {
        if (this.session.isInAnAdvert()) {
            if (this.session instanceof YSLiveSession) {
                return -1;
            }

            var advert = this.session.currentAdvert.advert;

            if (advert !== null) {
                var linear = advert.getLinear();

                if (linear !== null) {
                    var skipOffset = linear.getSkipOffset();

                    if (this.session.currentAdvert.isActive === false) {
                        skipOffset = 0;
                    }

                    if (skipOffset === -1) {
                        return -1;
                    }

                    var elapsed = this.session.currentAdvert.timeElapsed();
                    var remaining = elapsed >= skipOffset ? 0 : skipOffset - elapsed;

                    if (this.session instanceof YSVoDSession) {
                        return remaining;
                    }

                    // For live, check if within tolerance of stream end
                    var adRemaining = linear.getDuration() - elapsed;
                    var timeline = this.session.timeline;
                    var totalDuration = timeline.getTotalDuration() + timeline.startOffset;

                    if (this.session.lastPosition + adRemaining >= totalDuration - YSPlayerPolicy.LIVE_TOLERANCE) {
                        return -1;
                    }

                    return remaining;
                }
            }
        }

        return -1;
    },

    canMute: function() {
        return true;
    },

    canChangeFullScreen: function(fullscreen) {
        return true;
    },

    canExpandCreative: function() {
        return false;
    },

    canClickThrough: function() {
        return true;
    }
});

YSPlayerPolicy.LIVE_TOLERANCE = 30;

// =============================================================================
// ID3 Parser
// =============================================================================

var YSID3Parser = ClassHelper.makeClass();

YSID3Parser.ID3SYNC = 1229206272; // "ID3" as int
YSID3Parser.UNSYNC = 128;
YSID3Parser.EXTHDR = 64;

YSID3Parser.GetU32 = function(data, offset) {
    return (YSID3Parser.GetU16(data, offset) << 16) | YSID3Parser.GetU16(data, offset + 2);
};

YSID3Parser.GetU16 = function(data, offset) {
    return (YSID3Parser.GetU8(data, offset) << 8) | YSID3Parser.GetU8(data, offset + 1);
};

YSID3Parser.GetU8 = function(data, offset) {
    return data[offset];
};

/**
 * Parse ID3 tag from array
 */
YSID3Parser.ParseArray = function(data) {
    var uint8Array = new Uint8Array(data);
    return YSID3Parser.ParseUint8Array(uint8Array);
};

/**
 * Parse ID3 tag from Uint8Array
 */
YSID3Parser.ParseUint8Array = function(data) {
    var result = {};
    var offset = 0;

    // Check ID3 sync
    var sync = YSID3Parser.GetU32(data, offset);
    offset += 3;

    if ((sync & 0xFFFFFF00) !== YSID3Parser.ID3SYNC) {
        Debugger.print("Source data is not an ID3 tag");
        return null;
    }

    // Version
    var version = YSID3Parser.GetU16(data, offset);
    offset += 2;

    if (version > 1024) {
        Debugger.print("ID3 tag version too new - not supported");
        return null;
    }

    // Flags
    var flags = YSID3Parser.GetU8(data, offset++);

    if ((flags & YSID3Parser.UNSYNC) || (flags & YSID3Parser.EXTHDR)) {
        return null;
    }

    // Size (syncsafe integer)
    var size = ((YSID3Parser.GetU8(data, offset + 0) & 0x7F) << 21) +
               ((YSID3Parser.GetU8(data, offset + 1) & 0x7F) << 14) +
               ((YSID3Parser.GetU8(data, offset + 2) & 0x7F) << 7) +
               (YSID3Parser.GetU8(data, offset + 3) & 0x7F);
    offset += 4;

    // Parse frames
    while (offset < size) {
        // Frame ID (4 chars)
        var frameId = String.fromCharCode(YSID3Parser.GetU8(data, offset++)) +
                      String.fromCharCode(YSID3Parser.GetU8(data, offset++)) +
                      String.fromCharCode(YSID3Parser.GetU8(data, offset++)) +
                      String.fromCharCode(YSID3Parser.GetU8(data, offset++));

        // Frame size (syncsafe integer)
        var frameSize = ((YSID3Parser.GetU8(data, offset + 0) & 0x7F) << 21) +
                        ((YSID3Parser.GetU8(data, offset + 1) & 0x7F) << 14) +
                        ((YSID3Parser.GetU8(data, offset + 2) & 0x7F) << 7) +
                        (YSID3Parser.GetU8(data, offset + 3) & 0x7F);
        offset += 4;

        if (frameSize === 0) {
            break;
        }

        // Skip flags
        offset += 2;

        // Read frame data
        var frameData = "";
        for (var i = 0; i < frameSize; i++) {
            var byte = YSID3Parser.GetU8(data, offset++);
            if (byte >= 32 && byte < 127) {
                frameData += String.fromCharCode(byte);
            }
        }

        result[frameId] = frameData;
    }

    return result;
};

// =============================================================================
// Player Events
// =============================================================================

var YSPlayerEvents = {};

YSPlayerEvents.READY = "ready";
YSPlayerEvents.START = "start";
YSPlayerEvents.END = "complete";
YSPlayerEvents.MUTE = "mute";
YSPlayerEvents.FULLSCREEN = "fullscreen";
YSPlayerEvents.POSITION = "position";
YSPlayerEvents.METADATA = "id3";
YSPlayerEvents.PAUSE = "pause";
YSPlayerEvents.RESUME = "resume";
YSPlayerEvents.SEEK_START = "seek_begin";
YSPlayerEvents.SEEK_END = "seek_end";
YSPlayerEvents.CLICK = "click";
YSPlayerEvents.NONLINEAR = "non_linear";
YSPlayerEvents.STALL = "buffer";
YSPlayerEvents.CONTINUE = "continue";
YSPlayerEvents.LINEAR_EVENT = "linear";
YSPlayerEvents.NONLINEAR_EVENT = "nonlinear";
YSPlayerEvents.ERROR = "error";

// =============================================================================
// Session Result and Status
// =============================================================================

var YSSessionResult = {};
YSSessionResult.INITIALISED = "ready";
YSSessionResult.NOT_INITIALISED = "error";
YSSessionResult.NO_ANALYTICS = "no-analytics";

var YSSessionStatus = {};
YSSessionStatus.CONNECTION_ERROR = -1;
YSSessionStatus.CONNECTION_TIMEOUT = -2;
YSSessionStatus.MALFORMED_URL = -3;
YSSessionStatus.NON_YOSPACE_URL = -10;
YSSessionStatus.NO_LIVEPAUSE = -11;

// =============================================================================
// YSSession - Base Session Class
// =============================================================================

var YSSession = ClassHelper.makeClass({

    initialize: function(manager, url, callback) {
        Debugger.print("Constructing YSSession");

        if (url !== null && url.length > 0) {
            this.source = new YSURL(url);
        } else {
            this.source = null;
        }

        this.manager = manager;
        this.onComplete = callback;
        this.hostnode = this.source !== null ? this.source.host() : "";
        this.sessionId = "";
        this.analyticsUrl = "";
        this.livePauseUrl = "";
        this.masterURL = null;
        this.timeline = new YSTimeline();
        this.adBreakArray = {};
        this.currentAdvert = null;
        this.breakEndTimer = null;
        this.player = null;
        this.streamType = "hls";
        this.lastPosition = undefined;
        this.analyticsSuppressed = false;
        this.isPaused = false;
        this.isPlaying = false;
        this.policy = new YSPlayerPolicy(this);
        this._missedBreaks = [];
    },

    Destroy: function() {
        Debugger.print("Shutting down Session");

        this.source = null;
        this.manager = null;
        this.masterURL = null;
        this.playlist = null;
        this.player = null;
        this.policy = null;
        this.currentAdvert = null;
        this.onComplete = null;

        this.stopBreakEndTimer();

        if (this.timeline) {
            this.timeline.Destroy();
            this.timeline = null;
        }

        if (this.adBreakArray) {
            for (var key in this.adBreakArray) {
                if (this.adBreakArray.hasOwnProperty(key)) {
                    var array = this.adBreakArray[key];
                    while (array.length > 0) {
                        array.pop().Destroy();
                    }
                    delete this.adBreakArray[key];
                }
            }
            this.adBreakArray = null;
        }

        if (this._missedBreaks.length > 0) {
            for (var i = 0; i < this._missedBreaks.length; i++) {
                this._missedBreaks[i].Destroy();
            }
        }
        this._missedBreaks = null;
    },

    LateInit: function(url, analyticsUrl) {},

    setPaused: function(paused) {
        this.isPaused = paused;
        if (paused && !this.isPlaying) {
            this.isPlaying = true;
        }
    },

    getCurrentBreak: function() {
        if (this instanceof YSLiveSession) {
            if (this.currentAdvert && this._currentBreak) {
                return this._currentBreak;
            }
        } else {
            var element = this.timeline.getElementAtTime(this.lastPosition);
            if (element.getType() === YSTimelineElement.ADVERT) {
                return element.adBreak;
            }
            if (this.currentAdvert) {
                return this.currentAdvert.adBreak;
            }
        }
        return null;
    },

    addEmptyBreak: function(adBreak) {
        if (this._missedBreaks.length > 0) {
            for (var i = 0; i < this._missedBreaks.length; i++) {
                var existing = this._missedBreaks[i];
                if (adBreak.startPosition < existing.startPosition) {
                    Debugger.print("Inserting empty break");
                    this._missedBreaks.splice(i, 0, adBreak);
                    return;
                }
                if (adBreak.startPosition === existing.startPosition) {
                    Debugger.print("Ignoring addition of duplicate empty break");
                    return;
                }
            }
        }
        this._missedBreaks.push(adBreak);
    },

    getAdById: function(id) {
        var advert = null;

        if (this.adBreakArray.hasOwnProperty(id)) {
            var array = this.adBreakArray[id];
            if (array.length > 0) {
                advert = array.pop();
            } else if (array === null) {
                Debugger.print("No adverts have yet been defined");
            } else {
                Debugger.print("Adverts previously seen for this ID, but none currently available: " + id);
            }
        } else {
            Debugger.print("No adverts found in array for this ID, and have not yet seen any: " + id);
            if (this.adBreakArray === null) {
                Debugger.print("And ad break array is null");
            }
        }

        return advert;
    },

    getLinearClickthrough: function() {
        var url = undefined;
        if (this.currentAdvert && this.currentAdvert.advert && this.currentAdvert.advert.getLinear()) {
            url = this.currentAdvert.advert.getLinear().getClickThrough();
        }
        return url;
    },

    setPlayer: function(player) {
        this.player = player;
    },

    suppressAnalytics: function(suppress) {
        if (suppress) {
            if (this.currentAdvert && !this.analyticsSuppressed) {
                this.currentAdvert.isSuppressed(true);
            }
            this.analyticsSuppressed = true;
            this.stopBreakEndTimer();
            return null;
        } else {
            if (this instanceof YSLiveSession) {
                this.startBreakEndTimer();
            }

            if (this.currentAdvert && this.analyticsSuppressed) {
                this.analyticsSuppressed = false;
                return this.currentAdvert.isSuppressed(false);
            } else {
                this.analyticsSuppressed = false;
                return null;
            }
        }
    },

    pingAnalytics: function(callback) {
        if (this.analyticsUrl.length > 0) {
            if (ProtoAjax.DELEGATE !== null) {
                ProtoAjax.DELEGATE(this.analyticsUrl, {
                    onSuccess: callback.bind(this, true),
                    onFailure: callback.bind(this, false)
                });
            } else {
                new ProtoAjax.Request(this.analyticsUrl, {
                    method: "get",
                    evalJSON: false,
                    evalJS: false,
                    onSuccess: callback.bind(this, true),
                    onFailure: callback.bind(this, false)
                });
            }
        } else {
            Debugger.print("No analytics need to be fetched. Poller will not be initialized");
        }
    },

    processAnalytics: function(response) {},

    handleMetadata: function(metadata) {},

    updatePosition: function(position) {
        this.lastPosition = position;
    },

    isInAnAdvert: function() {
        return this.currentAdvert !== null;
    },

    masterPlaylistUrl: function() {
        return this.masterURL.toString();
    },

    loadPlaylist: function() {
        this.playlist = new PlaylistParser(
            this.masterPlaylistUrl(),
            this.playlistLoaded.bind(this),
            this.playlistNotLoaded.bind(this)
        );
    },

    playlistLoaded: function() {
        Debugger.print("Playlist was loaded");

        if (this.playlist.isRedirect) {
            this.masterURL = new YSURL(this.playlist.server);
        }

        if (this.playlist.isXML) {
            Debugger.print("Playlist is XML - assuming DASH");

            var mpdElements = this.playlist.content[0].getElementsByTagName("MPD");

            if (mpdElements.length > 0) {
                var mpd = mpdElements.item(0);

                if (mpd.hasAttribute("analytics")) {
                    this.analyticsUrl = mpd.getAttribute("analytics").replace(/\s+/g, "");

                    var analyticsUrlObj = new YSURL(this.analyticsUrl);
                    var pathParts = analyticsUrlObj.path().split(";");
                    pathParts[0] = this.masterURL.path();

                    this.masterURL._path = pathParts.join(";");
                    this.masterURL._host = analyticsUrlObj.host();
                    this.hostnode = analyticsUrlObj.host();
                    this.sessionId = pathParts[1].split("=")[1];
                }

                if (mpd.hasAttribute("livepause")) {
                    this.livePauseUrl = mpd.getAttribute("livepause").replace(/\s+/g, "");
                }
            }

            this.streamType = "dash";
        } else {
            var keys = Object.keys(this.playlist.content);

            for (var i in keys) {
                if (this.playlist.content.hasOwnProperty(i)) {
                    // Analytics URL
                    if (this.playlist.content[i].indexOf(ANALYTICS_TOKEN) === 0) {
                        this.analyticsUrl = this.playlist.content[i].substr(ANALYTICS_TOKEN.length + 1);

                        if (this.analyticsUrl.charAt(0) === '"') {
                            this.analyticsUrl = this.analyticsUrl.substr(1, this.analyticsUrl.length - 2);
                        }

                        var analyticsUrlObj = new YSURL(this.analyticsUrl);
                        var pathParts = analyticsUrlObj.path().split(";");

                        this.masterURL._path = this.masterURL.path() + ";" + pathParts[1];
                        this.masterURL._host = analyticsUrlObj.host();
                        this.hostnode = analyticsUrlObj.host();
                        this.sessionId = pathParts[1].split("=")[1];
                    }

                    // Live pause URL
                    if (this.playlist.content[i].indexOf(PAUSE_TOKEN) === 0) {
                        this.livePauseUrl = this.playlist.content[i].substr(PAUSE_TOKEN.length + 1);

                        if (this.livePauseUrl.charAt(0) === '"') {
                            this.livePauseUrl = this.livePauseUrl.substr(1, this.livePauseUrl.length - 2);
                        }
                    }
                }
            }
        }

        Debugger.print("Modified URL: " + this.masterPlaylistUrl());
        Debugger.print("Deduced analytics URL: " + this.analyticsUrl);

        if (this.livePauseUrl.length > 0) {
            Debugger.print("Deduced Live Pause URL: " + this.livePauseUrl);
        }

        if (this.analyticsUrl.length === 0) {
            if (typeof this.onComplete === "function") {
                this.onComplete.call(this, YSSessionResult.NO_ANALYTICS, YSSessionStatus.NON_YOSPACE_URL, undefined);
            }
        } else if (this instanceof YSLivePauseSession) {
            if (this.livePauseUrl.length === 0) {
                if (typeof this.onComplete === "function") {
                    this.onComplete.call(this, YSSessionResult.INITIALISED, 0, YSSessionStatus.NO_LIVEPAUSE);
                }
            } else {
                if (typeof this.onComplete === "function") {
                    this.onComplete.call(this, YSSessionResult.INITIALISED, 0, 0);
                }
            }
        } else {
            if (typeof this.onComplete === "function") {
                this.onComplete.call(this, YSSessionResult.INITIALISED);
            }
        }
    },

    playlistNotLoaded: function(status) {
        Debugger.print("Playlist was NOT loaded");

        if (typeof this.onComplete === "function") {
            this.onComplete.call(this, YSSessionResult.NOT_INITIALISED, status, YSSessionStatus.CONNECTION_ERROR);
        }
    },

    startBreakEndTimer: function(timeout) {
        if (isNaN(timeout)) {
            timeout = YSSession.BREAK_TOLERANCE;
        }

        if (this.breakEndTimer !== null) {
            this.stopBreakEndTimer();
        }

        var adBreak = this._currentBreak;

        if (adBreak) {
            console.log("Starting break end timer with break: " + adBreak + " and duration: " + timeout);
            this.breakEndTimer = setTimeout(this.handleBreakEnd.bind(this, adBreak), timeout);
        }
    },

    stopBreakEndTimer: function() {
        if (this.breakEndTimer !== null) {
            clearTimeout(this.breakEndTimer);
            this.breakEndTimer = null;
        }
    },

    handleBreakStart: function(adBreak) {
        Debugger.print(" |||||||| CONTROL FLOW |||||||| HANDLE BREAK START");

        if (adBreak && adBreak.vmapBreak && adBreak.vmapBreak.tracking) {
            adBreak.vmapBreak.tracking.track("breakStart", []);
        }

        if (adBreak) {
            this._currentBreak = adBreak;
        }

        if (this.breakEndTimer === null) {
            if (this.player !== null && typeof this.player.AdBreakStart === "function") {
                this.player.AdBreakStart(adBreak);
            }

            if (this instanceof YSLiveSession) {
                this.startBreakEndTimer();
            }
        }
    },

    handleBreakEnd: function(adBreak) {
        Debugger.print(" |||||||| CONTROL FLOW |||||||| HANDLE BREAK END");

        if (adBreak && adBreak.vmapBreak && adBreak.vmapBreak.tracking) {
            adBreak.vmapBreak.tracking.track("breakEnd", []);
        }

        if (this.isInAnAdvert()) {
            if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                this.player.AdvertEnd(this.currentAdvert.getMediaID());
            }
            this.currentAdvert.setActive(false);
            this.currentAdvert = null;
        }

        if (this.breakEndTimer !== null) {
            this.stopBreakEndTimer();
        }

        if (adBreak) {
            Debugger.print("Advert break ended - notifying consumer");
            if (this.player !== null && typeof this.player.AdBreakEnd === "function") {
                this.player.AdBreakEnd(adBreak);
            }
        }

        this._currentBreak = null;
    },

    handleAdvertStart: function(advert) {
        if (this.player !== null && typeof this.player.AdvertStart === "function") {
            this.player.AdvertStart(advert.getMediaID());
        }
    },

    handleAdvertEnd: function(advert) {
        advert.setActive(false);
        if (this.player !== null && typeof this.player.AdvertEnd === "function") {
            this.player.AdvertEnd(advert.getMediaID());
        }
    },

    reportLinearEvent: function(event) {
        if (this.isInAnAdvert()) {
            var advert = this.currentAdvert;
            if (advert !== null) {
                advert.reportLinearEvent(event);
            }
        }
    },

    reportNonLinearEvent: function(index, event) {
        if (this.isInAnAdvert()) {
            var advert = this.currentAdvert;
            if (advert !== null) {
                advert.reportNonLinearEvent(index, event);
            }
        }
    },

    getPolicy: function() {
        return this.policy;
    }
});

// Static properties
YSSession.idRE = new RegExp(/([^_]*)_YO_([\s\S]*)/i);
YSSession.BREAK_TOLERANCE = 6000;
YSSession.READY = "ready";
YSSession.INIT_FAILED = "error";

// =============================================================================
// YSVoDSession - Video on Demand Session
// =============================================================================

var YSVoDSession = ClassHelper.makeClass(YSSession, {

    initialize: function(manager, url, callback, isVLive) {
        this.callSuper(this.initialize, manager, url, callback);

        Debugger.print("Constructing YSVoDSession");

        this.isVLive = isVLive;

        if (url !== null && url.length > 0) {
            this.grabVMAP();
        } else {
            Debugger.print("Expecting late initialization");
        }
    },

    Destroy: function() {
        Debugger.print("Shutting down VOD Session");
        this.callSuper(this.Destroy);

        if (this.loader) {
            this.loader.Destroy();
            this.loader = null;
        }
    },

    grabVMAP: function() {
        var self = this;

        this.loader = new VMAPParser(
            this.source.toString(),
            this.onVMAPSuccess.bind(this),
            function(error) {
                Debugger.print("Ad Break Load Failed");
                if (typeof self.onComplete === "function") {
                    if (error === "ism3u8") {
                        self.onComplete.call(self, YSSessionResult.NO_ANALYTICS, YSSessionStatus.NON_YOSPACE_URL, undefined);
                    } else {
                        self.onComplete.call(self, YSSessionResult.NOT_INITIALISED, error, YSSessionStatus.CONNECTION_ERROR);
                    }
                }
            }
        );
    },

    onVMAPSuccess: function(breaks) {
        this.rebuildTimeline(breaks);

        if (!this.masterURL) {
            Debugger.printErr("VOD - Cannot start session without playback URL");
            if (typeof this.onComplete === "function") {
                this.onComplete.call(this, YSSessionResult.NOT_INITIALISED, 0, YSSessionStatus.CONNECTION_ERROR);
            }
            return;
        }

        if (this.isVLive) {
            this.loadPlaylist();
        } else {
            Debugger.print("Standard VOD - Bypassing session initialisation");

            if (this.masterURL.toString().indexOf("mpd") > 0) {
                this.streamType = "dash";
            }

            if (typeof this.onComplete === "function") {
                this.onComplete.call(this, YSSessionResult.INITIALISED);
            }
        }
    },

    rebuildTimeline: function(breaks) {
        Debugger.print("\n<<<<<<<<<<<<<< PARSE COMPLETE >>>>>>>>>>>>>>>>\nBreaks returned. Length: " + breaks.length);

        if (this.loader.extensions !== null) {
            var streamExtensions = this.loader.extensions.getAllOfType(TAG_YOEXT_STREAM);

            if (streamExtensions.length > 0 && !this.masterURL) {
                var url = this.source.scheme() + "://" + streamExtensions[0].urlDomain + streamExtensions[0].urlSuffix;
                this.hostnode = streamExtensions[0].urlDomain;
                this.masterURL = new YSURL(url);
                Debugger.print("URL: " + this.masterPlaylistUrl());
            }

            var offset = 0;

            for (var i = 0; i < breaks.length; i++) {
                var vmapBreak = breaks[i];
                offset = YSParseUtils.timecodeFromString(vmapBreak.position);

                var adBreak = new YSAdBreak(vmapBreak);
                adBreak.adBreakIdentifier = vmapBreak.id;
                adBreak.adBreakDescription = vmapBreak.type;
                adBreak.startPosition = offset;

                if (vmapBreak.vast) {
                    var ads = vmapBreak.vast.ads;

                    for (var j = 0; j < ads.length; j++) {
                        var linear = ads[j].getLinear();

                        if (linear) {
                            var mediaId = YSSession.idRE.exec(ads[j].id)[2];
                            var self = this;

                            var advert = new YSAdvert(ads[j], self.onAdTimeout.bind(self, mediaId), adBreak);
                            advert.trackingMonitor = self.onTrackingMonitor.bind(self);
                            adBreak.adverts.push(advert);
                            offset += linear.getDuration();
                        }
                    }

                    this.replaceOnTimeline(new YSTimelineAdvertElement(adBreak.startPosition, adBreak.getDuration(), adBreak));
                } else {
                    this.addEmptyBreak(adBreak);
                }
            }

            var totalDuration = (streamExtensions.length > 0 && streamExtensions[0].isValid && streamExtensions[0].duration.length > 0) ?
                YSParseUtils.timecodeFromString(streamExtensions[0].duration) : offset;

            if (totalDuration > 0) {
                this.timeline.adjustContent(totalDuration);
            } else {
                Debugger.print("No duration info at this time");
            }

            if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
                Debugger.print("Reporting timeline to player: " + YSParseUtils.timecodeToString(this.timeline.getTotalDuration()));
                this.player.UpdateTimeline(this.timeline);
            }
        } else {
            Debugger.printErr("VMAP contained no extensions - this is a potential problem!");
        }
    },

    replaceOnTimeline: function(element) {
        if (this.timeline) {
            var existing = this.timeline.getElementAtTime(element.offset);

            if (existing) {
                if (existing.offset !== element.offset ||
                    existing.duration !== element.duration ||
                    existing.getType() !== element.getType()) {

                    var index = this.timeline.elements.indexOf(existing);
                    this.timeline.elements.splice(index, 1, element);
                }
            } else {
                this.timeline.appendElement(element);
            }
        }
    },

    onTrackingMonitor: function(event, progress, asset) {
        if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
            this.player.AnalyticsFired(event, { progress: progress, asset: asset });
        }
    },

    processAnalytics: function(response, callback) {
        Debugger.print("Processing VMAP Analytics Data (VOD)");
        this.callSuper(this.processAnalytics, response);

        var self = this;

        this.loader = new VMAPParser(
            null,
            function(breaks) {
                Debugger.print("New breaks received: " + breaks.length);
                self.rebuildTimeline(breaks);
                Debugger.print("Timeline rebuilt. Total len: " + self.timeline.getTotalDuration() +
                               " :: " + YSParseUtils.timecodeToString(self.timeline.getTotalDuration()));

                for (var i = 0; i < self.timeline.getAllElements().length; i++) {
                    var elem = self.timeline.getAllElements()[i];
                    Debugger.print("$" + i + ": " + elem.getType() +
                                   " start: " + YSParseUtils.timecodeToString(elem.offset) +
                                   " dur: " + YSParseUtils.timecodeToString(elem.duration));
                }

                if (typeof callback === "function") {
                    callback.call(self, true, breaks);
                }
            },
            function(error) {
                Debugger.print("!no breaks");
                if (typeof callback === "function") {
                    callback.call(self, false, error);
                }
            }
        );

        this.loader.parse(response.responseXML);
    },

    onAdTimeout: function(mediaId) {
        Debugger.print(" !!! Advert Timeout flagged for item: " + mediaId);
    },

    updatePosition: function(position) {
        if (!this.isPaused && this.isPlaying) {
            // Clamp to timeline duration
            if (this.timeline) {
                var totalDuration = this.timeline.getTotalDuration();
                position = (totalDuration > 0 && position > totalDuration) ? totalDuration : position;
            }

            // Check for missed breaks
            if (this._missedBreaks.length > 0) {
                for (var i = 0; i < this._missedBreaks.length; i++) {
                    var missedBreak = this._missedBreaks[i];

                    if (!(this.lastPosition > missedBreak.startPosition) && position > missedBreak.startPosition) {
                        Debugger.print(" @@ MISSED BREAK @@ Transiting a missed break opportunity");

                        var vmapBreak = missedBreak.vmapBreak;
                        if (vmapBreak.tracking) {
                            vmapBreak.tracking.track("breakStart", []);
                            vmapBreak.tracking.track("breakEnd", []);
                        }
                        break;
                    }
                }
            }

            this.callSuper(this.updatePosition, position);

            // Handle current advert tracking
            if (this.isInAnAdvert()) {
                this.currentAdvert.isSuppressed(this.analyticsSuppressed);

                var events = this.currentAdvert.pingWatchdog();

                if (events && events.length > 0) {
                    for (var j = 0; j < events.length; j++) {
                        if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
                            var trackId = events[j].track_id;
                            delete events[j].track_id;
                            this.player.AnalyticsFired(trackId, events[j]);
                        }
                    }
                }
            }

            // Check timeline for ad transitions
            if (this.timeline !== null) {
                var element = this.timeline.getElementAtTime(position);

                if (element === null) {
                    Debugger.print("No timeline element was found");
                    return;
                }

                if (element.getType() === YSTimelineElement.ADVERT) {
                    var advert = element.getAdverts().getAdvertForPosition(position);

                    if (!advert) {
                        Debugger.print("Could not locate current advert!");
                        return;
                    }

                    var mediaId = advert.getMediaID();
                    var currentMediaId = this.currentAdvert ? this.currentAdvert.getMediaID() : "";

                    if (this.currentAdvert !== advert) {
                        Debugger.print("Different ad found");

                        if (this.isInAnAdvert()) {
                            Debugger.print("Shutting down advert: " + currentMediaId);

                            if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                                this.player.AdvertEnd(currentMediaId);
                            }

                            this.currentAdvert.setActive(false);

                            if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
                                this.player.UpdateTimeline(this.timeline);
                            }

                            this.currentAdvert = null;
                        } else {
                            this.handleBreakStart(this.getCurrentBreak());
                        }

                        Debugger.print("Advert starting with ID: " + mediaId);
                        Debugger.print("Advert Duration: " + advert.duration);

                        this.currentAdvert = advert;
                        this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                        this.currentAdvert.setActive(true);

                        if (this.player !== null && typeof this.player.AdvertStart === "function") {
                            this.player.AdvertStart(mediaId);
                        }
                    }
                } else if (this.isInAnAdvert()) {
                    var endingMediaId = this.currentAdvert.getMediaID();
                    Debugger.print("Shutting down advert: " + endingMediaId);

                    if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                        this.player.AdvertEnd(endingMediaId);
                    }

                    this.currentAdvert.setActive(false);

                    if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
                        this.player.UpdateTimeline(this.timeline);
                    }

                    var endingBreak = this.currentAdvert.adBreak;
                    this.currentAdvert = null;

                    Debugger.print("BREAK ENDS!");
                    this.handleBreakEnd(endingBreak);
                } else if (this.breakEndTimer !== null) {
                    this.handleBreakEnd(this._currentBreak);
                }
            }
        } else {
            Debugger.print("Ignoring position update while not actively playing");
        }
    },

    getContentPositionForPlayhead: function(playhead) {
        var remaining = playhead;
        var contentPosition = 0;

        if (this.timeline) {
            var elements = this.timeline.getAllElements();
            var index = 0;

            while (index < elements.length && remaining > 0) {
                var element = elements[index];

                if (element.getType() === YSTimelineElement.ADVERT) {
                    remaining -= element.duration;
                } else {
                    if (remaining > element.duration) {
                        contentPosition += element.duration;
                    } else {
                        contentPosition += remaining;
                    }
                    remaining -= element.duration;
                }

                index++;
            }

            return contentPosition;
        }

        Debugger.print("Conversion from Playhead to Content failed");
        return playhead;
    },

    getPlayheadPositionForContent: function(contentPosition) {
        var remaining = contentPosition;
        var playhead = 0;

        if (this.timeline) {
            var elements = this.timeline.getAllElements();
            var index = 0;

            while (index < elements.length && remaining > 0) {
                var element = elements[index];

                if (element.getType() === YSTimelineElement.ADVERT) {
                    playhead += element.duration;
                } else {
                    if (remaining > element.duration) {
                        playhead += element.duration;
                    } else {
                        playhead += remaining;
                    }
                    remaining -= element.duration;
                }

                index++;
            }

            return playhead;
        }

        Debugger.print("Conversion from Content to Playhead failed");
        return contentPosition;
    }
});

// =============================================================================
// YSLiveSession - Live Streaming Session
// =============================================================================

var YSLiveSession = ClassHelper.makeClass(YSSession, {

    initialize: function(manager, url, callback) {
        this.callSuper(this.initialize, manager, url, callback);

        Debugger.print("Constructing YSLiveSession");

        this.adBreakArray = {};
        this._pollCount = 0;
        this._deferred = false;
        this._currentBreaks = [];
        this._currentBreak = null;
        this._cachedMetadata = [];

        if (url !== null && url.length > 0) {
            this.masterURL = new YSURL(this.source);
            this.loadPlaylist();
        } else {
            Debugger.print("Expecting late initialization");
        }
    },

    Destroy: function() {
        this.callSuper(this.Destroy);

        this._currentBreak = null;

        if (this._currentBreaks) {
            while (this._currentBreaks.length > 0) {
                this._currentBreaks.pop().Destroy();
            }
            this._currentBreaks = null;
        }

        if (this.loader) {
            this.loader.Destroy();
            this.loader = null;
        }
    },

    LateInit: function(url, analyticsUrl) {
        this.masterURL = new YSURL(url);

        var analyticsUrlObj = new YSURL(analyticsUrl);
        this.masterURL._host = analyticsUrlObj.host();

        var sessionParam = analyticsUrlObj.path().split(";")[1];
        this.masterURL._path = this.masterURL._path + ";" + sessionParam;

        this.source = this.masterURL.toString();
        console.log("=== LATE INIT === " + this.masterURL.toString());

        this.loadPlaylist(true);
    },

    processAnalytics: function(response, callback) {
        Debugger.print("Processing VAST Analytics Data");

        if (this._pollCount < 2) {
            this._pollCount++;
        }

        this.callSuper(this.processAnalytics, response);

        var self = this;
        var isEnhanced = false;

        var vmapIndex = response.responseText.indexOf("<vmap" + YSParseUtils.NS_SEPARATOR + "VMAP");
        var vastIndex = response.responseText.indexOf("<VAST");

        if (vmapIndex !== -1 && vmapIndex < vastIndex) {
            Debugger.print(" +=+ USING ENHANCED ANALYTICS +=+ ");
            isEnhanced = true;
        }

        if (isEnhanced) {
            this.loader = new VMAPParser(
                null,
                function(breaks) {
                    Debugger.print("New breaks received: " + breaks.length);

                    if (breaks.length > 0) {
                        for (var i = 0; i < breaks.length; i++) {
                            var vmapBreak = breaks[i];
                            var offset = YSParseUtils.timecodeFromString(vmapBreak.position);

                            var adBreak = new YSAdBreak(vmapBreak);
                            adBreak.adBreakIdentifier = vmapBreak.id;
                            adBreak.adBreakDescription = vmapBreak.type;
                            adBreak.startPosition = offset;

                            if (vmapBreak.vast) {
                                var ads = vmapBreak.vast.ads;

                                for (var j = 0; j < ads.length; j++) {
                                    var linear = ads[j].getLinear();

                                    if (linear) {
                                        var mediaId = YSSession.idRE.exec(ads[j].id)[2];
                                        var advert = new YSAdvert(ads[j], self.onAdTimeout.bind(self, mediaId), adBreak);
                                        advert.trackingMonitor = self.onTrackingMonitor.bind(self);
                                        adBreak.adverts.push(advert);
                                        offset += linear.getDuration();

                                        if (!self.adBreakArray.hasOwnProperty(mediaId)) {
                                            self.adBreakArray[mediaId] = [];
                                        }
                                        self.adBreakArray[mediaId].unshift(advert);
                                    }
                                }

                                self._currentBreaks.push(adBreak);
                            } else {
                                Debugger.print(" @@ MISSED BREAK @@ Transiting a missed break opportunity");
                                if (vmapBreak.tracking) {
                                    vmapBreak.tracking.track("breakStart", []);
                                    vmapBreak.tracking.track("breakEnd", []);
                                }
                            }
                        }
                    }

                    if (breaks.length > 0 && self._deferred) {
                        self.processCachedMetadata();
                    }

                    if (typeof callback === "function") {
                        callback.call(self, true, breaks);
                    }
                },
                function(error) {
                    Debugger.print("!no breaks");
                    if (typeof callback === "function") {
                        callback.call(self, false, error);
                    }
                }
            );
        } else {
            this.loader = new VASTParser(
                null,
                function(ads) {
                    Debugger.print("New breaks received: " + ads.length);

                    if (ads.length > 0) {
                        var adBreak = new YSAdBreak(null);

                        for (var i = 0; i < ads.length; i++) {
                            var match = YSSession.idRE.exec(ads[i].id);
                            var mediaId = match ? match[2] : ads[i].id;

                            Debugger.print("Adding to bucket, MIID: " + mediaId);

                            if (!self.adBreakArray.hasOwnProperty(mediaId)) {
                                self.adBreakArray[mediaId] = [];
                            }

                            var advert = new YSAdvert(ads[i], self.onAdTimeout.bind(self, mediaId), adBreak);
                            adBreak.adverts.push(advert);
                            advert.trackingMonitor = self.onTrackingMonitor.bind(self);
                            self.adBreakArray[mediaId].unshift(advert);

                            var totalAds = 0;
                            for (var key in self.adBreakArray) {
                                if (self.adBreakArray.hasOwnProperty(key)) {
                                    totalAds += self.adBreakArray[key].length;
                                }
                            }
                            Debugger.print("New bucket size: " + totalAds);
                        }

                        self._currentBreaks.push(adBreak);
                    }

                    if (ads.length > 0 && self._deferred) {
                        self.processCachedMetadata();
                    }

                    if (typeof callback === "function") {
                        callback.call(self, true, ads);
                    }
                },
                function(error) {
                    Debugger.print("VAST Failure?");
                    if (typeof callback === "function") {
                        callback.call(self, false, error);
                    }
                }
            );
        }

        this.loader.parse(response.responseXML);
    },

    processCachedMetadata: function() {
        if (this._deferred) {
            Debugger.print("Received deferred VAST response");
            this._deferred = false;
        }

        while (this._cachedMetadata.length > 0) {
            var cached = this._cachedMetadata.shift();
            var metadata = cached.metadata;

            this.handleMetadata(metadata);

            if (metadata.hasOwnProperty("YMID")) {
                var type = metadata.YTYP;
                var seq = metadata.YSEQ.split(":")[0];

                if (type === "S" && seq === "1") {
                    if (this.currentAdvert) {
                        this.currentAdvert.startPosition = cached.timestamp;
                    } else {
                        Debugger.print("Cannot set back-time of current advert (no ad active)");
                    }
                }
            }
        }
    },

    onAdTimeout: function(mediaId) {
        Debugger.print(" !!! Advert Timeout flagged for item: " + mediaId);
    },

    onTrackingMonitor: function(event, progress, asset) {
        if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
            this.player.AnalyticsFired(event, { progress: progress, asset: asset });
        }
    },

    handleMetadata: function(metadata) {
        var isNewAd = false;

        if (this.isPlaying) {
            if (metadata) {
                Debugger.print("Live metadata is non-null");

                for (var key in metadata) {
                    if (metadata.hasOwnProperty(key)) {
                        Debugger.print("Property '" + key + "' = '" + metadata[key] + "'");
                    }
                }

                // Wait for initial VAST response
                if (this._currentBreaks.length === 0 && (this._pollCount < 2 || this._deferred)) {
                    Debugger.print("Waiting for initial VAST response... deferring");

                    if (!this._deferred) {
                        this._deferred = true;
                        var self = this;

                        this.pingAnalytics(function(success, response) {
                            Debugger.print("OK, have pinged: " + success);
                            self.processAnalytics(response, null);
                        });
                    }

                    this._cachedMetadata.push({
                        timestamp: (new Date()).getTime(),
                        metadata: metadata
                    });
                } else if (this._deferred && this._cachedMetadata.length > 0) {
                    this._cachedMetadata.push({
                        timestamp: (new Date()).getTime(),
                        metadata: metadata
                    });
                } else if (metadata.hasOwnProperty("YMID")) {
                    var mediaId = metadata.YMID;
                    var type = metadata.YTYP;
                    var seqParts = metadata.YSEQ.split(":");
                    var seqNum = seqParts[0];
                    var seqTotal = seqParts[1];

                    Debugger.print("Valid ID3 found. MIID: " + mediaId);

                    // Same ad still running
                    if (this.isInAnAdvert() && this.currentAdvert.getMediaID() === mediaId) {
                        Debugger.print("Advert still running for MIID: " + mediaId +
                                       " with type: " + type + " Seq " + seqNum + " of " + seqTotal);

                        this.stopBreakEndTimer();
                        this.startBreakEndTimer();

                        this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                        var events = this.currentAdvert.pingWatchdog();

                        if (events && events.length > 0) {
                            for (var i = 0; i < events.length; i++) {
                                if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
                                    var trackId = events[i].track_id;
                                    delete events[i].track_id;
                                    this.player.AnalyticsFired(trackId, events[i]);
                                }
                            }
                        }
                    } else {
                        // Different ad or new ad
                        var wasInAd = this.isInAnAdvert();

                        if (wasInAd) {
                            Debugger.print("Currently in an advert, but the media ID has changed. Terminating current advert.");
                            this.handleAdvertEnd(this.currentAdvert);
                            this.currentAdvert = null;
                        } else {
                            Debugger.print("Not yet in an advert");
                        }

                        var advert = this.getAdById(mediaId);

                        if (advert !== null) {
                            if (wasInAd || (type === "S" && seqNum === "1")) {
                                Debugger.print("Advert starting for MIID: " + mediaId +
                                               " with type: " + type + " Seq " + seqNum + " of " + seqTotal);
                                Debugger.print("Advert Duration: " + advert.duration);

                                this.currentAdvert = advert;
                                isNewAd = true;
                            } else {
                                Debugger.print("Ignoring advert with MIID: " + mediaId +
                                               " because tag is not a start tag. Type: " + type +
                                               " Seq: " + seqNum + " of " + seqTotal);
                                this.adBreakArray[mediaId].unshift(advert);
                            }

                            // Handle break timing
                            if (this.breakEndTimer !== null || this._currentBreak) {
                                this.stopBreakEndTimer();
                                this.startBreakEndTimer();
                            } else {
                                this._currentBreak = this._currentBreaks[0];
                                if (this._currentBreak) {
                                    this.handleBreakStart(this.getCurrentBreak());
                                } else {
                                    console.log("Could not find break");
                                }
                            }

                            if (this.currentAdvert !== null && this.player !== null &&
                                typeof this.player.AdvertStart === "function") {
                                this.player.AdvertStart(mediaId);
                            }

                            if (this.currentAdvert) {
                                this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                                if (isNewAd) {
                                    this.currentAdvert.setActive(true);
                                }
                            }
                        } else {
                            Debugger.print("Could not locate ad for miid: " + mediaId);

                            if (this.breakEndTimer !== null) {
                                this.stopBreakEndTimer();
                                this.startBreakEndTimer();
                            }
                        }
                    }

                    // Handle end tag
                    if (type === "E" && this.currentAdvert !== null) {
                        if (seqNum === seqTotal || this.currentAdvert.timeElapsed() > this.currentAdvert.duration) {
                            Debugger.print("Advert ending for MIID: " + mediaId +
                                           " with type: " + type + " Seq " + seqNum + " of " + seqTotal);

                            if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                                this.player.AdvertEnd(mediaId);
                            }

                            this.currentAdvert.setActive(false);
                            this.currentAdvert = null;
                        }
                    }
                } else {
                    Debugger.print("Ignoring unrecognized ID3 tag");
                }
            } else {
                Debugger.print("Live metadata is null");
            }
        } else {
            Debugger.print("Dropping metadata reported before playback has started");
        }
    },

    updatePosition: function(position) {
        this.callSuper(this.updatePosition, position);

        if (!this.paused && this.isPlaying) {
            if (this.isInAnAdvert() && this.currentAdvert.advert.getLinear() &&
                !this.currentAdvert.advert.getLinear().hasInteractiveUnit()) {

                if (this.currentAdvert.timeElapsed() > this.currentAdvert.duration) {
                    Debugger.print("******************* ADVERT HAS EXCEEDED DURATION!!! *************************");

                    var mediaId = this.currentAdvert.getMediaID();

                    if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                        this.player.AdvertEnd(mediaId);
                    }

                    this.currentAdvert.setActive(false);
                    this.currentAdvert = null;
                } else {
                    this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                    var events = this.currentAdvert.pingWatchdog();

                    if (events && events.length > 0) {
                        for (var i = 0; i < events.length; i++) {
                            if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
                                var trackId = events[i].track_id;
                                delete events[i].track_id;
                                this.player.AnalyticsFired(trackId, events[i]);
                            }
                        }
                    }
                }
            } else if (this.breakEndTimer !== null) {
                if (this.haveMoreAds()) {
                    Debugger.print("--- WAITING FOR NEXT AD!!!");
                } else {
                    Debugger.print("--- COULD STOP BREAK HERE!!!");
                    this.handleBreakEnd(this._currentBreak);
                }
            }
        } else {
            Debugger.print("Ignoring position update while not actively playing");
        }
    },

    haveMoreAds: function() {
        var count = 0;

        for (var key in this.adBreakArray) {
            if (this.adBreakArray.hasOwnProperty(key)) {
                count += this.adBreakArray[key].length;
            }
        }

        Debugger.print("Have more ads? " + count);
        return count > 0;
    },

    handleBreakEnd: function(adBreak) {
        this.callSuper(this.handleBreakEnd, adBreak);

        if (this._currentBreaks.length > 0) {
            this._currentBreaks.shift();
        }

        this._currentBreak = null;
    }
});

// =============================================================================
// YSLivePauseSession - DVR/Time-shifted Live Session
// =============================================================================

var YSLivePauseSession = ClassHelper.makeClass(YSSession, {

    initialize: function(manager, url, callback) {
        this.callSuper(this.initialize, manager, url, callback);

        Debugger.print("Constructing YSLivePauseSession");

        this.streamStart = null;
        this.streamWindowStart = null;
        this.streamWindowEnd = null;
        this.streamWindowSize = 0;
        this.streamDuration = 0;
        this.adBreakArray = {};
        this._pollCount = 0;
        this._deferred = false;

        this.masterURL = new YSURL(this.source);
        this.loadPlaylist();

        this.livePauseURL = null;
    },

    Destroy: function() {
        this.callSuper(this.Destroy);

        this.streamStart = null;
        this.streamWindowStart = null;
        this.streamWindowEnd = null;
        this._deferred = false;
        this.isPaused = false;
    },

    setPaused: function(paused) {
        this.callSuper(this.setPaused, paused);
        this.isPaused = paused;
    },

    grabVMAP: function() {
        var self = this;

        this.loader = new VMAPParser(
            this.source.toString(),
            this.onVMAPSuccess.bind(this),
            function(error) {
                Debugger.print("Ad Break Load Failed");
                if (typeof self.onComplete === "function") {
                    if (error === "ism3u8") {
                        self.onComplete.call(self, YSSessionResult.NO_ANALYTICS, YSSessionStatus.NON_YOSPACE_URL, undefined);
                    } else {
                        self.onComplete.call(self, YSSessionResult.NOT_INITIALISED, error, YSSessionStatus.CONNECTION_ERROR);
                    }
                }
            }
        );
    },

    onVMAPSuccess: function(breaks) {
        this.rebuildTimeline(breaks);

        if (typeof this.onComplete === "function") {
            this.onComplete.call(this, YSSessionResult.INITIALISED);
        }
    },

    rebuildTimeline: function(breaks) {
        var streamExtensions = this.loader.extensions.getAllOfType(TAG_YOEXT_STREAM);

        if (streamExtensions.length > 0) {
            if (!this.masterURL) {
                var url = this.source.scheme() + "://" + streamExtensions[0].urlDomain + streamExtensions[0].urlSuffix;
                this.hostnode = streamExtensions[0].urlDomain;
                this.masterURL = new YSURL(url);
                Debugger.print("URL: " + this.masterPlaylistUrl());
            }

            var startPDT = streamExtensions[0].StartPDT;
            var endPDT = streamExtensions[0].EndPDT;

            if (startPDT && endPDT) {
                if (!this._streamStart) {
                    this._streamStart = new Date(startPDT);
                }

                this._streamWindowStart = new Date(startPDT);
                this._streamWindowEnd = new Date(endPDT);
                this._streamWindowSize = (this._streamWindowEnd - this._streamWindowStart) / 1000;
                this._streamDuration = (this._streamWindowEnd - this._streamStart) / 1000;

                Debugger.print("Stream start: " + this._streamStart.toISOString());
                Debugger.print("Stream window start: " + this._streamWindowStart.toISOString());
                Debugger.print("Stream window end: " + this._streamWindowEnd.toISOString());
                Debugger.print("Stream Window Length: " + this._streamWindowSize);
                Debugger.print("Stream Duration: " + this._streamDuration);
            }
        }

        var offset = 0;

        for (var i = 0; i < breaks.length; i++) {
            var vmapBreak = breaks[i];
            offset = YSParseUtils.timecodeFromString(vmapBreak.position);

            var adBreak = new YSAdBreak(vmapBreak);
            adBreak.adBreakIdentifier = vmapBreak.id;
            adBreak.adBreakDescription = vmapBreak.type;
            adBreak.startPosition = offset;

            var ads = vmapBreak.vast.ads;

            for (var j = 0; j < ads.length; j++) {
                var linear = ads[j].getLinear();

                if (linear) {
                    var mediaId = YSSession.idRE.exec(ads[j].id)[1];
                    var self = this;

                    var advert = new YSAdvert(ads[j], self.onAdTimeout.bind(self, mediaId), adBreak);
                    advert.trackingMonitor = self.onTrackingMonitor.bind(self);
                    adBreak.adverts.push(advert);
                    offset += linear.getDuration();
                }
            }

            this.replaceOnTimeline(new YSTimelineAdvertElement(adBreak.startPosition, adBreak.getDuration(), adBreak));
        }

        // Update timeline offset
        if (this._streamWindowStart && this._streamStart) {
            this.timeline.UpdateOffset((this._streamWindowStart - this._streamStart) / 1000);
        } else {
            this.timeline.startOffset = 0;
        }

        var totalDuration = (streamExtensions.length > 0 && streamExtensions[0].isValid && streamExtensions[0].duration.length > 0) ?
            YSParseUtils.timecodeFromString(streamExtensions[0].duration) : offset;

        if (totalDuration > 0) {
            this.timeline.adjustContent(totalDuration);
        } else {
            Debugger.print("No duration info at this time");
        }

        if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
            Debugger.print("Reporting timeline to player: " + YSParseUtils.timecodeToString(this.timeline.getTotalDuration()));
            this.player.UpdateTimeline(this.timeline);
        }
    },

    replaceOnTimeline: function(element) {
        if (this.timeline) {
            var existing = this.timeline.getElementAtTime(element.offset);

            if (existing) {
                if (existing.offset !== element.offset ||
                    existing.duration !== element.duration ||
                    existing.getType() !== element.getType()) {

                    var index = this.timeline.elements.indexOf(existing);
                    this.timeline.elements.splice(index, 1, element);
                }
            } else {
                this.timeline.appendElement(element);
            }
        }
    },

    onTrackingMonitor: function(event, progress, asset) {
        if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
            this.player.AnalyticsFired(event, { progress: progress, asset: asset });
        }
    },

    processAnalytics: function(response, callback) {
        this.callSuper(this.processAnalytics, response);

        var self = this;

        this.loader = new VMAPParser(
            null,
            function(breaks) {
                Debugger.print("New breaks received: " + breaks.length);
                self.rebuildTimeline(breaks);
                Debugger.print("Timeline rebuilt. Total len: " + self.timeline.getTotalDuration() +
                               " :: " + YSParseUtils.timecodeToString(self.timeline.getTotalDuration()));

                for (var i = 0; i < self.timeline.getAllElements().length; i++) {
                    var elem = self.timeline.getAllElements()[i];
                    Debugger.print("$" + i + ": " + elem.getType() +
                                   " start: " + YSParseUtils.timecodeToString(elem.offset) +
                                   " dur: " + YSParseUtils.timecodeToString(elem.duration));
                }

                if (typeof callback === "function") {
                    callback.call(self, true, breaks);
                }
            },
            function(error) {
                Debugger.print("!no breaks");
                if (typeof callback === "function") {
                    callback.call(self, false, error);
                }
            }
        );

        this.loader.parse(response.responseXML);

        // Handle live pause
        if (this.isPaused) {
            if (this.livePauseUrl.length > 0) {
                Debugger.print("Calling LivePause Handler...");

                if (ProtoAjax.DELEGATE !== null) {
                    ProtoAjax.DELEGATE(this.livePauseUrl, {
                        onSuccess: function() { Debugger.print("Pause handler returned"); },
                        onFailure: function() { Debugger.print("Pause handler failed"); }
                    });
                } else {
                    new ProtoAjax.Request(this.livePauseUrl, {
                        method: "get",
                        evalJSON: false,
                        evalJS: false,
                        onSuccess: function() { Debugger.print("Pause handler returned"); },
                        onFailure: function() { Debugger.print("Pause handler failed"); }
                    });
                }
            } else {
                Debugger.print("No live pause URL available");
            }
        }
    },

    onAdTimeout: function(mediaId) {
        Debugger.print(" !!! Advert Timeout flagged for item: " + mediaId);
    },

    updatePosition: function(position) {
        this.callSuper(this.updatePosition, position);

        if (!this.paused && this.isPlaying) {
            // Handle current advert tracking
            if (this.isInAnAdvert()) {
                if (!this.currentAdvert.paused) {
                    this.stopBreakEndTimer();
                    this.startBreakEndTimer();
                }

                this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                var events = this.currentAdvert.pingWatchdog();

                if (events && events.length > 0) {
                    for (var i = 0; i < events.length; i++) {
                        if (this.player !== null && typeof this.player.AnalyticsFired === "function") {
                            var trackId = events[i].track_id;
                            delete events[i].track_id;
                            this.player.AnalyticsFired(trackId, events[i]);
                        }
                    }
                }
            }

            // Check timeline for ad transitions
            if (this.timeline !== null) {
                var element = this.timeline.getElementAtTime(position);

                if (element === null) {
                    Debugger.print("No timeline element was found");
                    return;
                }

                if (element.getType() === YSTimelineElement.ADVERT) {
                    var advert = element.getAdverts().getAdvertForPosition(position);

                    if (!advert) {
                        Debugger.print("Could not locate current advert!");
                        return;
                    }

                    var mediaId = advert.getMediaID();
                    var currentMediaId = this.currentAdvert ? this.currentAdvert.getMediaID() : "";

                    if (this.currentAdvert !== advert) {
                        Debugger.print("Different ad found");

                        if (this.isInAnAdvert()) {
                            Debugger.print("Shutting down advert: " + currentMediaId);

                            if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                                this.player.AdvertEnd(currentMediaId);
                            }

                            this.currentAdvert.setActive(false);

                            if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
                                this.player.UpdateTimeline(this.timeline);
                            }

                            this.currentAdvert = null;
                        }

                        Debugger.print("Advert starting with ID: " + mediaId);
                        Debugger.print("Advert Duration: " + advert.duration);

                        this.currentAdvert = advert;
                        this.currentAdvert.isSuppressed(this.analyticsSuppressed);
                        this.currentAdvert.setActive(true);

                        this.handleBreakStart(this.getCurrentBreak());

                        if (this.player !== null && typeof this.player.AdvertStart === "function") {
                            this.player.AdvertStart(mediaId);
                        }
                    }
                } else if (this.isInAnAdvert()) {
                    var endingMediaId = this.currentAdvert.getMediaID();
                    Debugger.print("Shutting down advert: " + endingMediaId);

                    if (this.player !== null && typeof this.player.AdvertEnd === "function") {
                        this.player.AdvertEnd(endingMediaId);
                    }

                    this.currentAdvert.setActive(false);

                    if (this.player !== null && typeof this.player.UpdateTimeline === "function") {
                        this.player.UpdateTimeline(this.timeline);
                    }

                    var endingBreak = this.currentAdvert.adBreak;
                    this.currentAdvert = null;

                    Debugger.print("BREAK ENDS!");
                    this.handleBreakEnd(endingBreak);
                }
            }
        } else {
            Debugger.print("Ignoring position update while not actively playing");
        }
    }
});

// =============================================================================
// YSSessionManager - Main Entry Point
// =============================================================================

var YSSessionManager = ClassHelper.makeClass({

    initialize: function() {
        this.session = null;
        this.listener = null;
        this.poller = null;
        this.player = null;
        this.properties = YSSessionManager.DEFAULTS;
    },

    /**
     * Get SDK version
     * @returns {string} Version string
     */
    getVersion: function() {
        return YSSessionManager.VERSION;
    },

    /**
     * Check if current stream is a Yospace stream
     * @returns {boolean}
     */
    isYospaceStream: function() {
        if (!this.session) {
            return false;
        }

        if (this.session.analyticsUrl.length > 0) {
            return true;
        }

        if (this.session instanceof YSVoDSession) {
            var timeline = this.getTimeline();
            if (timeline && timeline.getAllElements().length > 1) {
                return true;
            }
        }

        return false;
    },

    notifyDelegate: function(event, data) {
        if (typeof this.listener === "function") {
            this.listener.call(this, event, data);
        }
    },

    mergeProperties: function(source, target) {
        var keys = Object.keys(target);

        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
        }
    },

    /**
     * Create a non-linear (VLive) session
     */
    createNonLinearSession: function(url, properties, callback) {
        Debugger.print("Creating for nonLinear: " + url);

        if (properties !== null) {
            this.mergeProperties(properties, this.properties);
        }

        this.listener = callback;
        this.session = new YSVoDSession(this, url, this.sessionConstructed.bind(this), true);
    },

    /**
     * Create a live pause (DVR) session
     */
    createLivePauseSession: function(url, properties, callback) {
        Debugger.print("Creating for nonLinear: " + url);

        if (properties !== null) {
            this.mergeProperties(properties, this.properties);
        }

        this.listener = callback;
        this.session = new YSLivePauseSession(this, url, this.sessionConstructed.bind(this));
    },

    /**
     * Create a VOD session
     */
    createVODSession: function(url, properties, callback) {
        Debugger.print("Creating for VOD: " + url);

        if (properties !== null) {
            this.mergeProperties(properties, this.properties);
        }

        this.listener = callback;
        this.session = new YSVoDSession(this, url, this.sessionConstructed.bind(this), false);
    },

    /**
     * Create a live session
     */
    createLiveSession: function(url, properties, callback) {
        Debugger.print("Creating for Live: " + url);

        if (properties !== null) {
            Debugger.print("Merging properties");
            this.mergeProperties(properties, this.properties);
        }

        this.listener = callback;
        this.session = new YSLiveSession(this, url, this.sessionConstructed.bind(this));
    },

    sessionConstructed: function(result, status, code) {
        Debugger.print("Session Init Result: " + result);
        Debugger.print("Session Init Status: " + status);
        Debugger.print("Session Init Code: " + code);

        if (this.session) {
            if (result === YSSessionResult.INITIALISED) {
                this.poller = new YOPoller(this.properties.LOW_FREQ, this.properties.HIGH_FREQ);
                this._analyticsCB = this.onAnalytics.bind(this);
                this._pingCB = this.session.pingAnalytics.bind(this.session, this._analyticsCB);

                if (!(this.session instanceof YSLivePauseSession)) {
                    this.session.pingAnalytics(this._analyticsCB);
                }
            }

            this.notifyDelegate(result, status === 0 ? code : status);
        } else {
            Debugger.print("Session was constructed - but has now gone away?");
        }
    },

    /**
     * Shutdown the session and cleanup
     */
    shutdown: function() {
        Debugger.print("Shutting down AdManagement session");

        if (this.session) {
            this.session.Destroy();
            this.session = null;
        }

        if (this.poller) {
            this.poller.Destroy();
            this.poller = null;
        }

        this.player = null;
        this.listener = null;
        this._analyticsCB = null;
        this._pingCB = null;
    },

    onAnalytics: function(success, response) {
        if (this.session) {
            if (success) {
                this.session.processAnalytics(response, function(ok, data) {
                    if (!ok) {
                        Debugger.print("Failed to update analytics");
                    }
                });

                this.poller.startPolling(false, this._pingCB);
            } else {
                Debugger.print("ANALYTICS FAIL");
                this.poller.startPolling(false, this._pingCB);
            }
        } else {
            Debugger.print("Ignoring analytics response as there is no session");
        }
    },

    /**
     * Report a player event
     * @param {string} event - Event type from YSPlayerEvents
     * @param {*} data - Event data
     */
    reportPlayerEvent: function(event, data) {
        if (this.session) {
            if (event !== YSPlayerEvents.POSITION) {
                Debugger.print("Event reported: " + event);
            }

            switch (event) {
                case YSPlayerEvents.FULLSCREEN:
                    if (Boolean(data) === true) {
                        this.invokeTracking("fullscreen");
                        this.invokeTracking("expand", false);
                    } else {
                        this.invokeTracking("exitFullscreen");
                        this.invokeTracking("collapse", false);
                    }
                    break;

                case YSPlayerEvents.MUTE:
                    if (Boolean(data) === true) {
                        this.invokeTracking("mute");
                    } else {
                        this.invokeTracking("unmute");
                    }
                    break;

                case YSPlayerEvents.POSITION:
                    this.session.updatePosition(data);
                    break;

                case YSPlayerEvents.NONLINEAR:
                    if (this.session.isInAnAdvert()) {
                        var nonLinears = this.session.currentAdvert.advert.getNonLinears();
                        if (nonLinears && nonLinears.length > data) {
                            var clickUrl = nonLinears[data].getClickThrough();
                            Debugger.print(" <<>> Should open" + clickUrl);
                            this.session.reportNonLinearEvent(data, "click");
                        }
                    }
                    break;

                case YSPlayerEvents.CLICK:
                    if (this.session.isInAnAdvert()) {
                        var linearClickUrl = this.session.currentAdvert.advert.getLinear().getClickThrough();
                        Debugger.print(" <<>> Should open" + linearClickUrl);
                        this.invokeTracking("click");
                    }
                    break;

                case YSPlayerEvents.PAUSE:
                case YSPlayerEvents.STALL:
                    if (event === YSPlayerEvents.PAUSE) {
                        this.invokeTracking("pause");

                        if (this.session instanceof YSLivePauseSession) {
                            this.session.setPaused(true);
                        }
                    }

                    if (this.session.isInAnAdvert()) {
                        this.session.currentAdvert.adPaused();
                        this.session.stopBreakEndTimer();
                    }

                    if (this.session instanceof YSLivePauseSession) {
                        break;
                    }
                    // Fall through to END for non-LivePause

                case YSPlayerEvents.END:
                    if (event === YSPlayerEvents.END && this.session.isInAnAdvert()) {
                        this.session.reportLinearEvent("closeLinear");

                        var adBreak = this.session.currentAdvert.adBreak;
                        this.session.currentAdvert.paused = false;
                        this.session.handleBreakEnd(adBreak);

                        if (adBreak) {
                            Debugger.print("Advert break ended - notifying consumer");
                            if (this.session.player !== null && typeof this.session.player.AdBreakEnd === "function") {
                                this.session.player.AdBreakEnd(adBreak);
                            }
                        }
                    }

                    this.session.isPlaying = false;
                    break;

                case YSPlayerEvents.RESUME:
                case YSPlayerEvents.CONTINUE:
                    if (event === YSPlayerEvents.RESUME) {
                        this.invokeTracking("resume");

                        if (this.session instanceof YSLivePauseSession) {
                            this.session.setPaused(false);
                        }
                    }

                    if (this.session.isInAnAdvert()) {
                        this.session.currentAdvert.adResumed();

                        if (this.session instanceof YSLiveSession) {
                            this.session.startBreakEndTimer();
                        }
                    }

                    if (this.session instanceof YSLivePauseSession) {
                        break;
                    }
                    // Fall through to START for non-LivePause

                case YSPlayerEvents.START:
                    this.session.isPlaying = true;

                    if (event === YSPlayerEvents.START) {
                        var self = this;
                        setTimeout(function() {
                            if (self.session) {
                                self.session.pingAnalytics(self._analyticsCB);
                            }
                        }, 2000);
                    }
                    break;

                case YSPlayerEvents.METADATA:
                    this.session.handleMetadata(this.sanitize(data));
                    break;

                case YSPlayerEvents.LINEAR_EVENT:
                    this.session.reportLinearEvent(data);
                    break;

                case YSPlayerEvents.NONLINEAR_EVENT:
                    if (!data.hasOwnProperty("which")) return;
                    if (!data.hasOwnProperty("event")) return;
                    this.session.reportNonLinearEvent(data.which, data.event);
                    break;
            }
        }
    },

    sanitize: function(data) {
        var result = {};

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var cleanKey = this.makeClean(key);
                var cleanValue = this.makeClean(data[key]);
                result[cleanKey] = cleanValue;
            }
        }

        return result;
    },

    makeClean: function(str) {
        var result = "";

        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) >= 32) {
                result += String.fromCharCode(str.charCodeAt(i));
            }
        }

        return result;
    },

    invokeTracking: function(event, linearOnly, elapsed) {
        if (this.session.isInAnAdvert() && this.session.currentAdvert.advert) {
            this.session.currentAdvert.invokeTracking(event, linearOnly, elapsed);

            if (this.player && typeof this.player.AnalyticsFired === "function") {
                this.player.AnalyticsFired(event, null);
            }
        }
    },

    /**
     * Register player callbacks
     * @param {Object} player - Player object with callback methods
     */
    registerPlayer: function(player) {
        this.player = player;
        this.session.setPlayer(this.player);
    },

    /**
     * Get the modified master playlist URL
     * @returns {string} Playlist URL
     */
    masterPlaylist: function() {
        return this.session.masterPlaylistUrl();
    },

    /**
     * Get the timeline
     * @returns {YSTimeline} Timeline object
     */
    getTimeline: function() {
        return this.session.timeline;
    },

    /**
     * Parse raw ID3 data and report as metadata
     * @param {ArrayBuffer|Uint8Array} data - Raw ID3 bytes
     */
    RawID3: function(data) {
        var parsed = YSID3Parser.ParseArray(data);

        if (parsed) {
            this.reportPlayerEvent(YSPlayerEvents.METADATA, parsed);
        } else {
            Debugger.print("ID3 parse returned null");
        }
    }
});

// =============================================================================
// Static Factory Methods
// =============================================================================

/**
 * Create a session for live pause (DVR) playback
 */
YSSessionManager.createForLivePause = function(url, properties, callback) {
    var manager = new YSSessionManager();

    if (!manager) {
        throw new Error("Failed to create new SessionManager instance");
    }

    manager.createLivePauseSession(url, properties, callback);
    return manager;
};

/**
 * Create a session for live playback
 */
YSSessionManager.createForLive = function(url, properties, callback) {
    var manager = new YSSessionManager();

    if (!manager) {
        throw new Error("Failed to create new SessionManager instance");
    }

    manager.createLiveSession(url, properties, callback);
    return manager;
};

/**
 * Create a session for non-linear (VLive) playback
 */
YSSessionManager.createForNonLinear = function(url, properties, callback) {
    var manager = new YSSessionManager();

    if (!manager) {
        throw new Error("Failed to create new SessionManager instance");
    }

    manager.createNonLinearSession(url, properties, callback);
    return manager;
};

/**
 * Create a session for VOD playback
 */
YSSessionManager.createForVoD = function(url, properties, callback) {
    var manager = new YSSessionManager();

    if (!manager) {
        throw new Error("Failed to create new SessionManager instance");
    }

    manager.createVODSession(url, properties, callback);
    return manager;
};

// Version
YSSessionManager.VERSION = "1.7.10";

// Default configuration
YSSessionManager.DEFAULTS = {
    LOW_FREQ: 4000,     // Analytics poll interval (ms) - low priority
    HIGH_FREQ: 500,     // Analytics poll interval (ms) - high priority
    AD_DEBUG: false,    // Enable ad call diagnostics
    DEBUGGING: false    // Enable debug logging
};

// =============================================================================
// Module Exports
// =============================================================================

if (typeof exports !== "undefined") {
    exports.YSSessionManager = YSSessionManager;
    exports.AdBreak = AdBreak;
    exports.YoExtension = YoExtension;
    exports.YoStream = YoStream;
    exports.YoBreak = YoBreak;
    exports.Extensions = Extensions;
    exports.TrackingEvents = TrackingEvents;
    exports.VASTAd = VASTAd;
    exports.VASTAds = VASTAds;
    exports.VASTCreative = VASTCreative;
    exports.VASTIcon = VASTIcon;
    exports.VASTInteractive = VASTInteractive;
    exports.VASTLinear = VASTLinear;
    exports.VASTNonLinear = VASTNonLinear;
    exports.YSAdBreak = YSAdBreak;
    exports.YSAdvert = YSAdvert;
    exports.YSID3Parser = YSID3Parser;
    exports.YSLiveSession = YSLiveSession;
    exports.YSPlayerEvents = YSPlayerEvents;
    exports.YSSessionStatus = YSSessionStatus;
    exports.YSSessionResult = YSSessionResult;
    exports.YSPlayerPolicy = YSPlayerPolicy;
    exports.YSSession = YSSession;
    exports.YSTimeline = YSTimeline;
    exports.YSTimelineElement = YSTimelineElement;
    exports.YSTimelineVODElement = YSTimelineVODElement;
    exports.YSTimelineLiveElement = YSTimelineLiveElement;
    exports.YSTimelineAdvertElement = YSTimelineAdvertElement;
    exports.YSVoDSession = YSVoDSession;
    exports.YSParseUtils = YSParseUtils;
    exports.Debugger = Debugger;
    exports.ProtoAjax = ProtoAjax;
}
