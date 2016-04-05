import EventEmitter from 'tiny.js/lib/eventEmitter';

var resized = false,
    scrolled = false,
    requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    }());

function update() {

    var eve = (resized ? tiny.onresize : tiny.onscroll);

    // Refresh viewport
    this.refresh();

    // Change status
    resized = false;
    scrolled = false;

    /**
     * Event emitted when the dimensions of the viewport changes.
     * @event viewport#resize
     * @example
     * viewport.on('resize', function () {
         *     // Some code here!
         * });
     */

    /**
     * Event emitted when the viewport is scrolled.
     * @event viewport#scroll
     * @example
     * viewport.on('scroll', function () {
         *     // Some code here!
         * });
     */

        // Emits the current event
    this.emit(eve);
}

/**
 * The Viewport is a component to ease viewport management. You can get the dimensions of the viewport and beyond, which can be quite helpful to perform some checks with JavaScript.
 * @constructor
 * @augments tiny.EventEmitter
 * @returns {viewport} Returns a new instance of Viewport.
 */
class Viewport extends EventEmitter {
    constructor () {
        super();
        this._init();
    }

    /**
     * Initialize a new instance of Viewport.
     * @memberof! Viewport.prototype
     * @function
     * @private
     * @returns {viewport}
     */
    _init () {
        // Set emitter to zero for unlimited listeners to avoid the warning in console
        // @see https://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
        this.setMaxListeners(0);

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        var that = this;

        /**
         * Element representing the visible area.
         * @memberof! viewport#element
         * @type {Object}
         */
        this.el = window;

        this.refresh();


        function viewportResize() {
            // No changing, exit
            if (!resized) {
                resized = true;

                /**
                 * requestAnimationFrame
                 */
                requestAnimFrame(function updateResize() {
                    update.call(that);
                });
            }
        }

        function viewportScroll() {
            // No changing, exit
            if (!scrolled) {
                scrolled = true;

                /**
                 * requestAnimationFrame
                 */
                requestAnimFrame(function updateScroll() {
                    update.call(that);
                });
            }
        }

        window.addEventListener(tiny.onscroll, viewportScroll, false);
        window.addEventListener(tiny.onresize, viewportResize, false);
    };

    /**
     * Calculates/updates the client rects of viewport (in pixels).
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the client rects of the viewport.
     * viewport.calculateClientRect();
     */
    calculateClientRect () {
        /**
         * The current top client rect of the viewport (in pixels).
         * @public
         * @name Viewport#top
         * @type {Number}
         * @example
         * // Checks if the top client rect of the viewport is equal to 0.
         * (viewport.top === 0) ? 'Yes': 'No';
         */

        /**
         * The current left client rect of the viewport (in pixels).
         * @public
         * @name Viewport#left
         * @type {Number}
         * @example
         * // Checks if the left client rect of the viewport is equal to 0.
         * (viewport.left === 0) ? 'Yes': 'No';
         */
        this.top = this.left = 0;

        /**
         * The current bottom client rect of the viewport (in pixels).
         * @public
         * @name Viewport#bottom
         * @type {Number}
         * @example
         * // Checks if the bottom client rect of the viewport is equal to a number.
         * (viewport.bottom === 900) ? 'Yes': 'No';
         */
        this.bottom = Math.max(this.el.innerHeight || 0, document.documentElement.clientHeight);

        /**
         * The current right client rect of the viewport (in pixels).
         * @public
         * @name Viewport#right
         * @type {Number}
         * @example
         * // Checks if the right client rect of the viewport is equal to a number.
         * (viewport.bottom === 1200) ? 'Yes': 'No';
         */
        this.right = Math.max(this.el.innerWidth || 0, document.documentElement.clientWidth);

        return this;
    };

    /**
     * Calculates/updates the dimensions (width and height) of the viewport (in pixels).
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the dimensions values of the viewport.
     * viewport.calculateDimensions();
     */
    calculateDimensions () {
        this.calculateClientRect();

        /**
         * The current height of the viewport (in pixels).
         * @public
         * @name Viewport#height
         * @type Number
         * @example
         * // Checks if the height of the viewport is equal to a number.
         * (viewport.height === 700) ? 'Yes': 'No';
         */
        this.height = this.bottom;

        /**
         * The current width of the viewport (in pixels).
         * @public
         * @name Viewport#width
         * @type Number
         * @example
         * // Checks if the height of the viewport is equal to a number.
         * (viewport.width === 1200) ? 'Yes': 'No';
         */
        this.width = this.right;

        return this;
    };

    /**
     * Calculates/updates the viewport position.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the offest values of the viewport.
     * viewport.calculateOffset();
     */
    calculateOffset () {

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        var scroll = tiny.scroll();

        /**
         * The offset top of the viewport.
         * @memberof! Viewport#offsetTop
         * @type {Number}
         * @example
         * // Checks if the offset top of the viewport is equal to a number.
         * (viewport.offsetTop === 200) ? 'Yes': 'No';
         */
        this.offsetTop = scroll.top;

        /**
         * The offset left of the viewport.
         * @memberof! Viewport#offsetLeft
         * @type {Number}
         * @example
         * // Checks if the offset left of the viewport is equal to a number.
         * (viewport.offsetLeft === 200) ? 'Yes': 'No';
         */
        this.offsetLeft = scroll.left;

        /**
         * The offset right of the viewport.
         * @memberof! Viewport#offsetRight
         * @type {Number}
         * @example
         * // Checks if the offset right of the viewport is equal to a number.
         * (viewport.offsetRight === 200) ? 'Yes': 'No';
         */
        this.offsetRight = this.left + this.width;

        /**
         * The offset bottom of the viewport.
         * @memberof! Viewport#offsetBottom
         * @type {Number}
         * @example
         * // Checks if the offset bottom of the viewport is equal to a number.
         * (viewport.offsetBottom === 200) ? 'Yes': 'No';
         */
        this.offsetBottom = this.offsetTop + this.height;

        return this;
    };

    /**
     * Rertuns/updates the viewport orientation: landscape or portrait.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the dimensions values of the viewport.
     * viewport.calculateDimensions();
     */
    calculateOrientation () {
        /** The viewport orientation: landscape or portrait.
         * @memberof! Viewport#orientation
         * @type {String}
         * @example
         * // Checks if the orientation is "landscape".
         * (viewport.orientation === 'landscape') ? 'Yes': 'No';
         */
        this.orientation = (Math.abs(this.el.orientation) === 90) ? 'landscape' : 'portrait';

        return this;
    };

    /**
     * Calculates if an element is completely located in the viewport.
     * @memberof! Viewport.prototype
     * @function
     * @returns {Boolean}
     * @params {HTMLElement} el A given HMTLElement.
     * @example
     * // Checks if an element is in the viewport.
     * viewport.inViewport(HTMLElement) ? 'Yes': 'No';
     */
    inViewport (el) {
        var r = el.getBoundingClientRect();

        return (r.top > 0) && (r.right < this.width) && (r.bottom < this.height) && (r.left > 0);
    };

    /**
     * Calculates if an element is visible in the viewport.
     * @memberof! Viewport.prototype
     * @function
     * @returns {Boolean}
     * @params {HTMLElement} el A given HTMLElement.
     * @example
     * // Checks if an element is visible.
     * viewport.isVisisble(HTMLElement) ? 'Yes': 'No';
     */
    isVisible (el) {
        var r = el.getBoundingClientRect();

        return (r.height >= this.offsetTop);
    };

    /**
     * Upadtes the viewport dimension, viewport positions and orietation.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Refreshs the viewport.
     * viewport.refresh();
     */
    refresh () {
        this.calculateDimensions();
        this.calculateOffset();
        this.calculateOrientation();

        return this;
    };

}

let viewport = new Viewport();

export default viewport;
