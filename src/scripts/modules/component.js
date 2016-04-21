import EventEmitter from 'tiny.js/lib/eventEmitter';

let uid = 0;

/**
 * Base class for all components.
 *
 * @class
 * @augments tiny.EventEmitter
 * @param {HTMLElement} [el] It must be a HTMLElement.
 * @param {Object} [options] Configuration options.
 * @returns {component} Returns a Component class.
 *
 * @example
 * // Create a new Component.
 * import Component from './modules/component';
 * let component = new Component();
 * let component = new Component('.my-component', {'option': 'value'});
 * let component = new Component('.my-component');
 * let component = new Component({'option': 'value'});
 */
class Component extends EventEmitter {
    constructor(el, options) {
        super();

        console.log('component init');

        // Set emitter to zero for unlimited listeners to avoid the warning in console
        // @see https://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
        this.setMaxListeners(0);

        if (el === null) {
            throw new Error('The "el" parameter is not present in the DOM');
        }

        /**
         * A unique id to identify the instance of a component.
         * @type {Number}
         */
        this.uid = (uid += 1);

        // el is HTMLElement
        // IE8 and earlier don't define the node type constants, 1 === document.ELEMENT_NODE
        if (el !== undefined && el.nodeType === 1) {
            this._el = el;

            // set the uid to the element to help search for the instance in the collection instances
            this._el.setAttribute('data-uid', this.uid);

            this._options = tiny.extend({}, Component._defaults, options);

            // el is an object configuration
        } else if (el === undefined || el.nodeType === undefined && typeof el === 'object') {

            // creates a empty element because the user is not set a DOM element to use, but we requires one
            // this._el = document.createElement('div');

            this._options = tiny.extend({}, Component._defaults, el);
        } else {
            this._options = tiny.clone(Component._defaults);
        }

        /**
         * Indicates is the component is enabled.
         * @type {Boolean}
         * @private
         */
        this._enabled = true;

        /**
         * Event emitted when the component is ready to use.
         * @event Component#ready
         * @example
         * // Subscribe to "ready" event.
         * component.on('ready', function () {
         *     // Some code here!
         * });
         */
        setTimeout(() => {
            this.emit('ready');
        }, 1);
    }

    /**
     * Component default configuration.
     * @type {Object}
     * @private
     */
    static _defaults = {
        ns: 'ch-'
    };

    /**
     * Inject functionality or abilities from another components.
     *
     * @function
     * @params {...Function} mixins List of mixins to be injected
     * @example
     * let component = new Component();
     * component.inject(Content, Collapsible);
     */
    inject(...args) {
        args.forEach((arg) => {
            if (typeof arg === 'function') {
                arg.call(this);
            }
        });

        return this;
    };

    /**
     * Generates the complete class name including the namespace
     *
     * @param basename
     * @returns {string}
     */
    getClassname(basename) {
        const parts = basename.split(' ')
            .map(part => part.trim())
            .filter(part => !!part)
            .map(part => this._options.ns + part);

        return parts.join(' ');
    }

    /**
     * Enables an instance of Component.
     *
     * @function
     * @returns {component}
     *
     * @example
     * // Enabling an instance of Component.
     * component.enable();
     */
    enable() {
        this._enabled = true;

        /**
         * Emits when a component is enabled.
         *
         * @event Component#enable
         *
         * @example
         * // Subscribe to "enable" event.
         * component.on('enable', function () {
         *     // Some code here!
         * });
         */
        this.emit('enable');

        return this;
    };

    /**
     * Disables an instance of Component.
     *
     * @function
     * @returns {component}
     *
     * @example
     * // Disabling an instance of Component.
     * component.disable();
     */
    disable() {
        this._enabled = false;

        /**
         * Emits when a component is disable.
         *
         * @event Component#disable
         *
         * @example
         * // Subscribe to "disable" event.
         * component.on('disable', function () {
         *     // Some code here!
         * });
         */
        this.emit('disable');

        return this;
    };

    /**
     * Destroys an instance of Component and remove its data from asociated element.
     *
     * @function
     *
     * @example
     * // Destroy a component
     * component.destroy();
     * // Empty the component reference
     * component = undefined;
     */
    destroy() {
        this.disable();

        if (this._el) {
            this._el.removeAttribute('data-uid');
        }

        /**
         * Emits when a component is destroyed.
         *
         * @event Component#destroy
         *
         * @example
         * // Subscribe to "destroy" event.
         * component.on('destroy', function () {
         *     // Some code here!
         * });
         */
        this.emit('destroy');

        return;
    }
}

export default Component;
