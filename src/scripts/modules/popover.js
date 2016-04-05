import Component from './component';
import Positioner from './positioner';
import viewport from './viewport';
import Collapsible from '../mixins/collapsible';
import Content from '../mixins/content';

let shownbyEvent = {
    'pointertap': tiny.onpointertap,
    'pointerenter': tiny.onpointerenter
};


/**
 * Popover is the basic unit of a dialog window.

 * @constructor
 * @augments Component
 * @mixes Collapsible
 * @mixes Content
 * @requires Positioner
 * @param {HTMLElement} el A HTMLElement to create an instance of Popover.
 * @param {Object} [options] Options to customize an instance.
 * @param {String} [options.addClass] CSS class names that will be added to the container on the component initialization.
 * @param {String} [options.fx] Enable or disable UI effects. You must use: "slideDown", "fadeIn" or "none". Default: "fadeIn".
 * @param {String} [options.width] Set a width for the container. Default: "auto".
 * @param {String} [options.height] Set a height for the container. Default: "auto".
 * @param {String} [options.shownby] Determines how to interact with the trigger to show the container. You must use: "pointertap", "pointerenter" or "none". Default: "pointertap".
 * @param {String} [options.hiddenby] Determines how to hide the component. You must use: "button", "pointers", "pointerleave", "all" or "none". Default: "button".
 * @param {HTMLElement} [options.reference] It's a HTMLElement reference to position and size of element that will be considered to carry out the position. Default: the trigger element.
 * @param {String} [options.side] The side option where the target element will be positioned. Its value can be: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {String} [options.align] The align options where the target element will be positioned. Its value can be: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {Number} [options.offsetX] Distance to displace the target horizontally. Default: 0.
 * @param {Number} [options.offsetY] Distance to displace the target vertically. Default: 0.
 * @param {String} [options.position] The type of positioning used. Its value must be "absolute" or "fixed". Default: "absolute".
 * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
 * @param {String} [options.params] Params like query string to be sent to the server.
 * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true.
 * @param {Boolean} [options.async] Force to sent request asynchronously. Default: true.
 * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading. Default: '&lt;div class="ch-loading ch-loading-centered"&gt;&lt;/div&gt;'.
 * @param {(String | HTMLElement)} [options.content] The content to be shown into the Popover container.
 * @param {(Boolean | String)} [options.wrapper] Wrap the reference element and place the container into it instead of body. When value is a string it will be applied as additional wrapper class. Default: false.
 *
 * @returns {popover} Returns a new instance of Popover.
 *
 * @example
 * // Create a new Popover.
 * var popover = new Popover([el], [options]);
 * @example
 * // Create a new Popover with disabled effects.
 * var popover = new Popover(el, {
     *     'fx': 'none'
     * });
 * @example
 * // Create a new Popover using the shorthand way (content as parameter).
 * var popover = new Popover(document.querySelector('.popover'), {'content': 'http://ui.ml.com:3040/ajax'});
 */
class Popover extends Component {
    constructor(el, options) {
        super(el, options);
        this._init(el, options);
    }

    /**
     * Default Popover configuration.
     *
     * @type {Object}
     * @private
     */
    static _defaults = {
        '_ariaRole': 'dialog',
        '_className': '',
        '_hideDelay': 400,
        'addClass': '',
        'fx': 'fadeIn',
        'width': 'auto',
        'height': 'auto',
        'shownby': 'pointertap',
        'hiddenby': 'button',
        'waiting': 'loading loading-centered',
        'position': 'absolute',
        'wrapper': false
    };

    /**
     * Initialize a new instance of Popover and merge custom options with defaults options.
     * @memberof! Popover.prototype
     * @function
     * @private
     * @returns {popover}
     */
    _init (el, options) {
        if (el === undefined || !el.nodeType && typeof el === 'object') {
            options = el;
        }

        tiny.extend(this._options, Popover._defaults, options);

        console.log(this._options, options);

        this.inject(Collapsible, Content);

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        let container = document.createElement('div');

        this._configureWrapper();

        container.innerHTML = [
            '<div',
            ' class="' + this.getClassname('popover hide') + ' ' + this.getClassname(this._options._className) + ' ' + this.getClassname(this._options.addClass) + ' ' +
            (tiny.support.transition && this._options.fx !== 'none' && this._options.fx !== false ? this.getClassname('fx') : '') + '"',
            ' role="' + this._options._ariaRole + '"',
            ' id="' + this.getClassname(this.constructor.name.toLowerCase() + '-' + this.uid) + '"',
            ' style="width:' + this._options.width + ';height:' + this._options.height + '"',
            '></div>'
        ].join('');

        /**
         * The popover container. It's the element that will be shown and hidden.
         * @type {HTMLDivElement}
         */
        this.container = container.querySelector('div');

        tiny.on(this.container, tiny.onpointertap, event => {
            event.stopPropagation();
        });

        /**
         * Element where the content will be added.
         * @private
         * @type {HTMLDivElement}
         */
        this._content = document.createElement('div');

        tiny.addClass(this._content, this.getClassname('popover-content'));

        this.container.appendChild(this._content);

        // Add functionality to the trigger if it exists
        this._configureTrigger();

        const positionerOpts = {
            'target': this.container,
            'reference': this._options.reference,
            'side': this._options.side,
            'align': this._options.align,
            'offsetX': this._options.offsetX,
            'offsetY': this._options.offsetY,
            'position': this._options.position
        };

        this._positioner = new Positioner(positionerOpts);

        /**
         * Handler to execute the positioner refresh() method on layout changes.
         * @private
         * @function
         * @todo Define this function on prototype and use bind(): $document.on(ch.onlayoutchange, this.refreshPosition.bind(this));
         */
        this._refreshPositionListener = () => {
            if (this._shown) {
                this._positioner.refresh(positionerOpts);
            }

            return this;
        };

        this._hideTimer = () => {
            this._timeout = window.setTimeout(() => {
                this.hide();
            }, this._options._hideDelay);
        };

        this._hideTimerCleaner = () => {
            window.clearTimeout(this._timeout);
        };

        // Configure the way it hides
        this._configureHiding();

        // Refresh position:
        // on layout change
        tiny.on(document, tiny.onlayoutchange, this._refreshPositionListener);
        // on resize
        viewport.on(tiny.onresize, this._refreshPositionListener);

        this
            .once('_show', this._refreshPositionListener)
            // on content change
            .on('_contentchange', this._refreshPositionListener);

        return this;
    };


    /**
     * Adds functionality to the trigger. When a non-trigger popover is initialized, this method isn't executed.
     * @memberof! Popover.prototype
     * @private
     * @function
     */
    _configureTrigger () {

        if (this._el === undefined) {
            return;
        }

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        // It will be triggered on pointertap/pointerenter of the $trigger
        // It can toggle, show, or do nothing (in specific cases)
        let showHandler = (function () {
            // Toggle as default
            let fn = this._toggle;
            // When a Popover is shown on pointerenter, it will set a timeout to manage when
            // to close the component. Avoid to toggle and let choise when to close to the timer
            if (this._options.shownby === 'pointerenter' || this._options.hiddenby === 'none' || this._options.hiddenby === 'button') {
                fn = () => {
                    if (!this._shown) {
                        this.show();
                    }
                };
            }

            return fn;
        }).bind(this)();

        /**
         * The original and entire element and its state, before initialization.
         * @private
         * @type {HTMLDivElement}
         */
            // cloneNode(true) > parameters is required. Opera & IE throws and internal error. Opera mobile breaks.
        this._snippet = this._el.cloneNode(true);

        // Use the trigger as the positioning reference
        this._options.reference = this._options.reference || this._el;

        // Open event when configured as able to shown anyway
        if (this._options.shownby !== 'none') {

            tiny.addClass(this._el, this.getClassname('shownby-' + this._options.shownby));

            if (this._options.shownby === shownbyEvent.pointertap && navigator.pointerEnabled) {
                tiny.on(this._el, 'click', e => {
                    e.preventDefault();
                });
            }

            tiny.on(this._el, shownbyEvent[this._options.shownby], e => {
                e.stopPropagation();
                e.preventDefault();
                showHandler();
            });
        }

        // Get a content if it's not defined
        if (this._options.content === undefined) {
            // Content from anchor href
            // IE defines the href attribute equal to src attribute on images.
            if (this._el.nodeName === 'A' && this._el.href !== '') {
                this._options.content = this._el.href;

                // Content from title or alt
            } else if (this._el.title !== '' || this._el.alt !== '') {
                // Set the configuration parameter
                this._options.content = this._el.title || this._el.alt;
                // Keep the attributes content into the element for possible usage
                this._el.setAttribute('data-title', this._options.content);
                // Avoid to trigger the native tooltip
                this._el.title = this._el.alt = '';
            }
        }

        // Set WAI-ARIA
        this._el.setAttribute('aria-owns', this.getClassname(this.constructor.name.toLowerCase() + '-' + this.uid));
        this._el.setAttribute('aria-haspopup', 'true');

        /**
         * The popover trigger. It's the element that will show and hide the container.
         * @type {HTMLElement}
         */
        this.trigger = this._el;
    };


    /**
     * Determines how to hide the component.
     * @memberof! Popover.prototype
     * @private
     * @function
     */
    _configureHiding () {
        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        var hiddenby = this._options.hiddenby,
            dummy,
            button;



        // Don't hide anytime
        if (hiddenby === 'none') { return; }

        // Hide by leaving the component
        if (hiddenby === 'pointerleave' && this.trigger !== undefined) {

            [this.trigger, this.container].forEach(el => {
                tiny.on(el, tiny.onpointerenter, this._hideTimerCleaner);
            });
            [this.trigger, this.container].forEach(el => {
                tiny.on(el, tiny.onpointerleave, this._hideTimer);
            });
        }

        // Hide with the button Close
        if (hiddenby === 'button' || hiddenby === 'all') {
            dummy = document.createElement('div');
            dummy.innerHTML = `<i class="${this.getClassname('close')}" role="button" aria-label="Close"></i>`;
            button = dummy.querySelector('i');

            tiny.on(button, tiny.onpointertap, () => {
                this.hide();
            });

            this.container.insertBefore(button, this.container.firstChild);

        }

        if ((hiddenby === 'pointers' || hiddenby === 'all') && this._hidingShortcuts !== undefined) {
            this._hidingShortcuts();
        }

    };

    /**
     * Creates an options object from the parameters arriving to the constructor method.
     * @memberof! Popover.prototype
     * @private
     * @function
     */
    _normalizeOptions (options) {
        // IE8 and earlier don't define the node type constants, 1 === document.ELEMENT_NODE
        if (typeof options === 'string' || (typeof options === 'object' && options.nodeType === 1)) {
            options = {
                'content': options
            };
        }
        return options;
    };

    /**
     * Wraps the target element and use the wrapper as the placement for container
     * @memberof! Popover.prototype
     * @private
     * @function
     */
    _configureWrapper () {
        var target = this._el || this._options.reference,
            wrapper = this._options.wrapper;

        if (wrapper && target && target.nodeType === 1) {
            // Create the wrapper element and append to it
            wrapper = document.createElement('span');
            tiny.addClass(wrapper, this.getClassname('popover-wrapper'));

            if (typeof this._options.wrapper === 'string') {
                this._options.wrapper.split(' ').forEach(className => {
                    tiny.addClass(wrapper, this.getClassname(className));
                });
            }

            tiny.parent(target).insertBefore(wrapper, target);
            wrapper.appendChild(target);
            if (tiny.css(wrapper, 'position') === 'static') {
                tiny.css(wrapper, {
                    display: 'inline-block',
                    position: 'relative'
                });
            }

            this._containerWrapper = wrapper;
        } else {
            this._containerWrapper = document.body;
        }
    };

    /**
     * Shows the popover container and appends it to the body.
     * @memberof! Popover.prototype
     * @function
     * @param {(String | HTMLElement)} [content] The content that will be used by popover.
     * @param {Object} [options] A custom options to be used with content loaded by ajax.
     * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
     * @param {String} [options.params] Params like query string to be sent to the server.
     * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true.
     * @param {Boolean} [options.async] Force to sent request asynchronously. Default: true.
     * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading.
     * @returns {popover}
     * @example
     * // Shows a basic popover.
     * popover.show();
     * @example
     * // Shows a popover with new content
     * popover.show('Some new content here!');
     * @example
     * // Shows a popover with a new content that will be loaded by ajax with some custom options
     * popover.show('http://domain.com/ajax/url', {
     *     'cache': false,
     *     'params': 'x-request=true'
     * });
     */
    show (content, options) {
        // Don't execute when it's disabled
        if (!this._enabled || this._shown) {
            return this;
        }

        // Append to the configured holder
        this._containerWrapper.appendChild(this.container);

        // Open the collapsible
        this._show();

        // Request the content
        if (content !== undefined) {
            this.content(content, options);
        }

        return this;
    };

    /**
     * Hides the popover container and deletes it from the body.
     * @memberof! Popover.prototype
     * @function
     * @returns {popover}
     * @example
     * // Close a popover
     * popover.hide();
     */
    hide = () => {
        var self = this;
        // Don't execute when it's disabled
        if (!this._enabled || !this._shown) {
            return this;
        }

        // Detach the container from the DOM when it is hidden
        this.once('hide', () => {
            // Due to transitions this._shown can be outdated here
            let parent = self.container.parentNode;
            if (parent !== null) {
                parent.removeChild(self.container);
            }
        });

        // Close the collapsible
        this._hide();

        return this;
    };

    /**
     * Returns a Boolean specifying if the container is shown or not.
     * @memberof! Popover.prototype
     * @function
     * @returns {Boolean}
     * @example
     * // Check the popover status
     * popover.isShown();
     * @example
     * // Check the popover status after an user action
     * $(window).on(tiny.onpointertap, function () {
     *     if (popover.isShown()) {
     *         alert('Popover: visible');
     *     } else {
     *         alert('Popover: not visible');
     *     }
     * });
     */
    isShown () {
        return this._shown;
    };

    /**
     * Sets or gets the width of the container.
     * @memberof! Popover.prototype
     * @function
     * @param {String} [data] Set a width for the container.
     * @returns {(Number | popover)}
     * @example
     * // Set a new popover width
     * component.width('300px');
     * @example
     * // Get the current popover width
     * component.width(); // '300px'
     */
    width (data) {

        if (data === undefined) {
            return this._options.width;
        }

        this.container.style.width = data;

        this._options.width = data;

        this.refreshPosition();

        return this;
    };

    /**
     * Sets or gets the height of the container.
     * @memberof! Popover.prototype
     * @function
     * @param {String} [data] Set a height for the container.
     * @returns {(Number | popover)}
     * @example
     * // Set a new popover height
     * component.height('300px');
     * @example
     * // Get the current popover height
     * component.height(); // '300px'
     */
    height (data) {

        if (data === undefined) {
            return this._options.height;
        }

        this.container.style.height = data;

        this._options.height = data;

        this.refreshPosition();

        return this;
    };

    /**
     * Updates the current position of the container with given options or defaults.
     * @memberof! Popover.prototype
     * @function
     * @params {Object} [options] A configuration object.
     * @returns {popover}
     * @example
     * // Update the current position
     * popover.refreshPosition();
     * @example
     * // Update the current position with a new offsetX and offsetY
     * popover.refreshPosition({
     *     'offestX': 100,
     *     'offestY': 10
     * });
     */
    refreshPosition (options) {

        if (this._shown) {
            // Refresh its position.
            this._positioner.refresh(options);

        } else {
            // Update its options. It will update position the next time to be shown.
            this._positioner._configure(options);
        }

        return this;
    };

    /**
     * Enables a Popover instance.
     * @memberof! Popover.prototype
     * @function
     * @returns {popover}
     * @example
     * // Enable a popover
     * popover.enable();
     */
    enable () {

        if (this._el !== undefined) {
            this._el.setAttribute('aria-disabled', false);
        }

        super.enable();

        return this;
    };

    /**
     * Disables a Popover instance.
     * @memberof! Popover.prototype
     * @function
     * @returns {popover}
     * @example
     * // Disable a popover
     * popover.disable();
     */
    disable () {

        if (this._el !== undefined) {
            this._el.setAttribute('aria-disabled', true);
        }

        if (this._shown) {
            this.hide();
        }

        super.disable();

        return this;
    };

    /**
     * Destroys a Popover instance.
     * @memberof! Popover.prototype
     * @function
     * @returns {popover}
     * @example
     * // Destroy a popover
     * popover.destroy();
     * // Empty the popover reference
     * popover = undefined;
     */
    destroy () {

        if (this.trigger !== undefined) {

            tiny.off(this.trigger, tiny.onpointerenter, this._hideTimerCleaner);
            tiny.off(this.trigger, tiny.onpointerleave, this._hideTimer);

            ['data-title', 'aria-owns', 'aria-haspopup', 'data-side', 'data-align','role' ].forEach(attr => {
                this.trigger.removeAttribute(attr);
            });

            this._snippet.alt ? this.trigger.setAttribute('alt', this._snippet.alt) : null;
            this._snippet.title ? this.trigger.setAttribute('title', this._snippet.title) : null;
        }

        tiny.off(document, tiny.onlayoutchange, this._refreshPositionListener);

        viewport.removeListener(tiny.onresize, this._refreshPositionListener);

        super.destroy();

        return;
    };
}

export default Popover;
