/**
 * The Collapsible class gives to components the ability to shown or hidden its container.
 * @memberOf ch
 * @mixin
 * @returns {Function} Returns a private function.
 */
function Collapsible() {

    /**
     * Reference to context of an instance.
     * @type {Object}
     * @private
     */
    let that = this,
        triggerClass = this.getClassname(this.constructor.name.toLowerCase() + '-trigger-on'),
        fx = this._options.fx,
        useEffects = (tiny.support.transition && fx !== 'none' && fx !== false),
        pt, pb;

    let toggleEffects = {
        'slideDown': 'slideUp',
        'slideUp': 'slideDown',
        'fadeIn': 'fadeOut',
        'fadeOut': 'fadeIn'
    };

    function showCallback(e) {
        let { container } = that;

        if (useEffects) {
            tiny.removeClass(container, that.getClassname('fx-' + fx));

            // TODO: Use original height when it is defined
            if (/^slide/.test(fx)) {
                container.style.height = '';
            }
        }
        tiny.removeClass(container, that.getClassname('hide'));
        container.setAttribute('aria-hidden', 'false');

        if (e) {
            e.target.removeEventListener(e.type, showCallback);
        }

        /**
         * Event emitted when the component is shown.
         * @event ch.Collapsible#show
         * @example
         * // Subscribe to "show" event.
         * collapsible.on('show', function () {
             *     // Some code here!
             * });
         */
        that.emit('show');
    }

    function hideCallback(e) {
        let { container } = that;

        if (useEffects) {
            tiny.removeClass(container, that.getClassname('fx-' + toggleEffects[fx]));
            container.style.display = '';
            if (/^slide/.test(fx)) {
                container.style.height = '';
            }
        }
        tiny.addClass(container, that.getClassname('hide'));
        container.setAttribute('aria-hidden', 'true');

        if (e) {
            e.target.removeEventListener(e.type, hideCallback);
        }

        /**
         * Event emitted when the component is hidden.
         * @event ch.Collapsible#hide
         * @example
         * // Subscribe to "hide" event.
         * collapsible.on('hide', function () {
             *     // Some code here!
             * });
         */
        that.emit('hide');
    }

    this._shown = false;

    /**
     * Shows the component container.
     * @function
     * @private
     */
    this._show = () => {
        this._shown = true;

        if (this.trigger !== undefined) {
            tiny.addClass(this.trigger, triggerClass);
        }

        /**
         * Event emitted before the component is shown.
         * @event ch.Collapsible#beforeshow
         * @example
         * // Subscribe to "beforeshow" event.
         * collapsible.on('beforeshow', function () {
             *     // Some code here!
             * });
         */
        this.emit('beforeshow');

        // Animate or not
        if (useEffects) {
            let _h = 0;
            let { container } = this;

            // Be sure to remove an opposite class that probably exist and
            // transitionend listener for an opposite transition, aka $.fn.stop(true, true)
            tiny.off(container, tiny.support.transition.end, hideCallback);
            tiny.removeClass(container, that.getClassname('fx-' + toggleEffects[fx]));

            tiny.on(container, tiny.support.transition.end, showCallback);

            // Reveal an element before the transition
            container.style.display = 'block';

            // Set margin and padding to 0 to prevent content jumping at the transition end
            if (/^slide/.test(fx)) {
                // Cache the original paddings for the first time
                if (!pt || !pb) {
                    pt = tiny.css(container, 'padding-top');
                    pb = tiny.css(container, 'padding-bottom');

                    container.style.marginTop = container.style.marginBottom =
                        container.style.paddingTop = container.style.paddingBottom = '0px';
                }

                container.style.opacity = '0.01';
                _h = container.offsetHeight;
                container.style.opacity = '';
                container.style.height = '0px';
            }

            // Transition cannot be applied at the same time when changing the display property
            setTimeout(() => {
                if (/^slide/.test(fx)) {
                    container.style.height = _h + 'px';
                }
                container.style.paddingTop = pt;
                container.style.paddingBottom = pb;
                tiny.addClass(container, that.getClassname('fx-' + fx));
            }, 0);
        } else {
            showCallback();
        }

        this.emit('_show');

        return this;
    };

    /**
     * Hides the component container.
     * @function
     * @private
     */
    this._hide = () => {

        that._shown = false;

        if (that.trigger !== undefined) {
            tiny.removeClass(that.trigger, triggerClass);
        }

        /**
         * Event emitted before the component is hidden.
         * @event ch.Collapsible#beforehide
         * @example
         * // Subscribe to "beforehide" event.
         * collapsible.on('beforehide', function () {
             *     // Some code here!
             * });
         */
        that.emit('beforehide');

        // Animate or not
        if (useEffects) {
            // Be sure to remove an opposite class that probably exist and
            // transitionend listener for an opposite transition, aka $.fn.stop(true, true)
            tiny.off(that.container, tiny.support.transition.end, showCallback);
            tiny.removeClass(that.container, that.getClassname('fx-' + fx));

            tiny.on(that.container, tiny.support.transition.end, hideCallback);
            // Set margin and padding to 0 to prevent content jumping at the transition end
            if (/^slide/.test(fx)) {
                that.container.style.height = tiny.css(that.container, 'height');
                // Uses nextTick to trigger the height change
                setTimeout(function () {
                    that.container.style.height = '0px';
                    that.container.style.paddingTop = that.container.style.paddingBottom = '0px';
                    tiny.addClass(that.container, that.getClassname('fx-' + toggleEffects[fx]));
                }, 0);
            } else {
                setTimeout(function () {
                    tiny.addClass(that.container, that.getClassname('fx-' + toggleEffects[fx]));
                }, 0);
            }
        } else {
            hideCallback();
        }

        return that;
    };

    /**
     * Shows or hides the component.
     * @function
     * @private
     */
    this._toggle = () => {

        if (this._shown) {
            this.hide();
        } else {
            this.show();
        }

        return this;
    };

    // TODO: Use on.ready instead of timeout
    setTimeout(() => {
        this.on('disable', this.hide);
    }, 1);
}

export default Collapsible;
