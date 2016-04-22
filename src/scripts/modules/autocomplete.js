import Component from './component';
import Popover from './popover';

function highlightSuggestion(target) {
    let posinset;

    Array.prototype.forEach.call(this._suggestionsList.childNodes, function (e) {
        if (e.contains(target)) {
            posinset = parseInt(target.getAttribute('aria-posinset'), 10) - 1;
        }
    });

    this._highlighted = (typeof posinset === 'number') ? posinset : null;

    this._toogleHighlighted();

    return this;
}

let specialKeyCodeMap = {
    9: 'tab',
    27: 'esc',
    37: 'left',
    39: 'right',
    13: 'enter',
    38: 'up',
    40: 'down'
};

const KEYS = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    ESC: 27,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
    /*
    '8': 'backspace',
    '9': 'tab',
    '13': 'enter',
    '27': 'esc',
    '37': 'left_arrow',
    '38': 'up_arrow',
    '39': 'right_arrow',
    '40': 'down_arrow'
    */
};

// there is no mouseenter to highlight the item, so it happens when the user do mousedown
let highlightEvent = (tiny.support.touch) ? tiny.onpointerdown : 'mouseover';

/**
 * Autocomplete Component shows a list of suggestions for a HTMLInputElement.
 * @memberof ch
 * @constructor
 * @augments ch.Component
 * @requires ch.Popover
 * @param {HTMLElement} [el] A HTMLElement to create an instance of ch.Autocomplete.
 * @param {Object} [options] Options to customize an instance.
 * @param {String} [options.loadingClass] Default: "ch-autocomplete-loading".
 * @param {String} [options.highlightedClass] Default: "ch-autocomplete-highlighted".
 * @param {String} [options.itemClass] Default: "ch-autocomplete-item".
 * @param {String} [options.addClass] CSS class names that will be added to the container on the component initialization. Default: "ch-box-lite ch-autocomplete".
 * @param {Number} [options.keystrokesTime] Default: 150.
 * @param {Boolean} [options.html] Default: false.
 * @param {String} [options.side] The side option where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "bottom".
 * @param {String} [options.align] The align options where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "left".
 * @param {Number} [options.offsetX] The offsetX option specifies a distance to displace the target horitontally.
 * @param {Number} [options.offsetY] The offsetY option specifies a distance to displace the target vertically.
 * @param {String} [options.positioned] The positioned option specifies the type of positioning used. You must use: "absolute" or "fixed". Default: "absolute".
 * @param {(Boolean | String)} [options.wrapper] Wrap the reference element and place the container into it instead of body. When value is a string it will be applied as additional wrapper class. Default: false.
 *
 * @returns {autocomplete}
 * @example
 * // Create a new AutoComplete.
 * var autocomplete = new AutoComplete([el], [options]);
 * @example
 * // Create a new AutoComplete with configuration.
 * var autocomplete = new AutoComplete('.my-autocomplete', {
     *  'loadingClass': 'custom-loading',
     *  'highlightedClass': 'custom-highlighted',
     *  'itemClass': 'custom-item',
     *  'addClass': 'carousel-cities',
     *  'keystrokesTime': 600,
     *  'html': true,
     *  'side': 'center',
     *  'align': 'center',
     *  'offsetX': 0,
     *  'offsetY': 0,
     *  'positioned': 'fixed'
     * });
 */
class Autocomplete extends Component {
    constructor(el, options) {
        super(el, options);

        this._init(el, options);

        return this;
    }

    /**
     * Configuration by default.
     * @type {Object}
     * @private
     */
    static _defaults = {
        'loadingClass': 'autocomplete-loading',
        'highlightedClass': 'autocomplete-highlighted',
        'itemClass': 'autocomplete-item',
        'choicesClass': 'autocomplete-choices',
        'addClass': 'box-lite autocomplete',
        'side': 'bottom',
        'align': 'left',
        'html': false,
        '_hiddenby': 'none',
        'keystrokesTime': 150,
        '_itemTemplate': '<li class="{{itemClass}}"{{suggestedData}}>{{term}}<i class="ch-icon-arrow-up" data-js="ch-autocomplete-complete-query"></i></li>',
        'wrapper': false,
        'multiple': false,
        'visibleChoicesLimit': 1,
        'closeOnSelect': true,
        'showFilters': true,
        'i18n': {
            hide_choices: 'Ocultar selección',
            choice: 'colonia',
            choices: 'colonias'
        }
    };


    /**
     * Initialize a new instance of Autocomplete and merge custom options with defaults options.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @private
     * @returns {autocomplete}
     */
    _init(el, options) {
        tiny.extend(this._options, Autocomplete._defaults, options);

        // creates the basic item template for this instance
        this._options._itemTemplate = this._options._itemTemplate.replace('{{itemClass}}', this.getClassname(this._options.itemClass));

        if (this._options.html) {
            // remove the suggested data space when html is configured
            this._options._itemTemplate = this._options._itemTemplate.replace('{{suggestedData}}', '');
        }

        if (this._options.multiple) {
            // Always use the wrapper when multiple choices is enabled
            if (!this._options.wrapper) {
                this._options.wrapper = true;
            }
        }

        // The component who shows and manage the suggestions.
        this._popover = new Popover({
            'reference': this._el,
            'content': this._suggestionsList,
            'side': this._options.side,
            'align': this._options.align,
            'addClass': this._options.addClass,
            'hiddenby': this._options._hiddenby,
            'width': this._options.wrapper ? '100%' : this._el.getBoundingClientRect().width + 'px', // IE8 getBoundingClientRect Warning!
            'fx': this._options.fx,
            'wrapper': this._options.wrapper
        });

        /**
         * The autocomplete container.
         * @type {HTMLDivElement}
         * @example
         * // Gets the autocomplete container to append or prepend content.
         * autocomplete.container.appendChild(document.createElement('div'));
         */
        this.container = this._popover.container;

        this.container.setAttribute('aria-hidden', 'true');

        this._wrapper = this._popover._containerWrapper;

        /**
         * The autocomplete choices list.
         * @type {HTMLUListElement}
         * @private
         */
        if (this._options.multiple) {
            this._choicesList = document.createElement('ul');
            tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass));
            tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass+ '--empty'));
            tiny.addClass(this._wrapper, this.getClassname('autocomplete-multiple'));

            this._choicesList.innerHTML = '<li class="ch-autocomplete-search-field"><input type="text" class="ch-autocomplete-search-input" autocomplete="off"></li>';

            this._searchInput = this._choicesList.querySelector('.ch-autocomplete-search-input');
            this._searchInput.setAttribute('placeholder', this._el.getAttribute('placeholder'));

            this._wrapper.appendChild(this._choicesList);

            this._popover._options.reference = this._choicesList;
            this._popover._positioner.refresh({reference: this._choicesList});

            tiny.on(this._searchInput, 'keydown', (e) => {
                this._fixInputWidth();
            });
        }

        /**
         * The autocomplete suggestion list.
         * @type {HTMLUListElement}
         * @private
         */
        this._suggestionsList = document.createElement('ul');
        tiny.addClass(this._suggestionsList, this.getClassname('autocomplete-list'));

        this.container.appendChild(this._suggestionsList);

        /**
         * Selects the items
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @private
         * @returns {autocomplete}
         */

        this._highlightSuggestion = (event) => {
            var target = event.target || event.srcElement,
                item = (target.nodeName === 'LI') ? target : (target.parentNode.nodeName === 'LI') ? target.parentNode : null;

            if (item !== null) {
                highlightSuggestion.call(this, item);
            }
        };

        tiny.on(this.container, highlightEvent, this._highlightSuggestion);


        tiny.on(this.container, tiny.onpointertap, (e) => {
            let target = e.target || e.srcElement;
            const className = this.getClassname(this._options.itemClass);

            // completes the value, it is a shortcut to avoid write the complete word
            if (target.nodeName === 'I' && !this._options.html) {
                e.preventDefault();
                this._el.value = this._suggestions[this._highlighted];
                this.emit('type', this._el.value);
                return;
            }

            if (closestParent(target, `.${this.getClassname('autocomplete-item')}`)) {
                this._selectSuggestion();
            }
        });

        /**
         * The autocomplete trigger.
         * @type {HTMLElement}
         */
        this.trigger = this._options.multiple ? this._searchInput : this._el;

        this.trigger.setAttribute('aria-autocomplete', 'list');
        this.trigger.setAttribute('aria-haspopup', 'true');
        this.trigger.setAttribute('aria-owns', this.container.getAttribute('id'));
        this.trigger.setAttribute('autocomplete', 'off');

        tiny.on(this.trigger, 'focus', (e) => {
            this._turn('on');
        });
        tiny.on(this.trigger, 'blur', (e) => {
            if (this._isOn) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.trigger.focus();
            } else {
                //this.emit('blur');
                this._turn('off');
            }
        });

        // The number of the selected item or null when no selected item is.
        this._highlighted = null;

        // Collection of suggestions to be shown.
        this._suggestions = [];

        // Original suggestions
        this._suggestionsData = [];

        // The list of applied filters
        this._filters = [];

        // Current selected values
        this._value = this._options.multiple ? [] : '';

        // Used to show when the user cancel the suggestions
        this._originalQuery = this._currentQuery = this._el.value;

        this._configureShortcuts();

        this._isOn = false;

        // Turn on when the input element is already has focus
        if (this.trigger === document.activeElement && !this._enabled) {
            this._turn('on');
        }

        return this;
    };

    clearFilters() {
        this._filters = [];

        if (this._options.showFilters) {
            [...this._choicesList.querySelectorAll(`.${this.getClassname('autocomplete-filter')}`)].forEach(f => f.parentNode.removeChild(f));
        }
    }

    setFilters(filters) {
        this.clearFilters();

        if (filters === undefined) {
            return this;
        }

        this._filters = filters;

        if (this._options.showFilters && this._options.multiple) {
            const filtersLabel = this._filters.map(f => {
                return `<li class="${this.getClassname('autocomplete-filter')}" data-value="${f.value}"><span>${f.name || f.value}</span></li>`;
            }).join('');

            this._choicesList.insertAdjacentHTML('afterbegin', filtersLabel);
        }
    }

    getFilters() {
        return this._filters;
    }

    getValue() {
        return this._value;
    }

    clear() {
        if (this._value.length == 0 || !this._options.multiple) {
            this.clearFilters();
            tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass+ '--empty'));
        }

        if (this._options.multiple) {
            this._value = [];
            this._clearChoices();
            this._searchInput.style.width = '';
        } else {
            this._value = '';
        }

        return this;
    }

    _removeChoice(el) {
        [...this._wrapper.querySelectorAll(`.${this.getClassname('autocomplete-choice')}`)].forEach((f, i) => {
            if (el.isEqualNode(f)) {
                f.parentNode.removeChild(f);
                this._value.splice(i, 1);

                const summary = this._choicesList.querySelector('.ch-autocomplete-choices-summary');

                if (this._value.length === 0) {
                    this.clearFilters();
                    const all = this._wrapper.querySelector('.ch-autocomplete-choices-all');
                    if (all) {
                        all.parentNode.removeChild(all);
                    }

                    if (summary) {
                        summary.parentNode.removeChild(summary);
                    }
                } else {
                    if (summary) {
                        const a = summary.querySelector('a');
                        if (!a.getAttribute('data-opened')) {
                            a.innerText = `+ ${this._value.length} colonias`;
                        }
                    }
                }

                return this;
            }
        });
    }

    _clearChoices() {
        [...this._choicesList.querySelectorAll(`.${this.getClassname('autocomplete-choice')}`)].forEach(f => f.parentNode.removeChild(f));
        const summary = this._choicesList.querySelector('.ch-autocomplete-choices-summary');
        if (summary) {
            summary.parentNode.removeChild(summary);
        }
        const all = this._wrapper.querySelector('.ch-autocomplete-choices-all');
        if (all) {
            all.parentNode.removeChild(all);
        }
    }

    _drawSingleChoice(choice) {
        const li = document.createElement('li');
        li.className = 'ch-autocomplete-choice';
        li.innerHTML = `<span>${choice}</span><a class="ch-autocomplete-choice-remove"></a>`;

        tiny.on(li.querySelector('a'), 'click', e => {
            e.preventDefault();
            this._removeChoice(li);
        });

        return li;
    }

    _fixInputWidth() {
        this._searchInput.style.width = `${(this._searchInput.value.length + 2) * .55}em`;
    }

    _showAllChoices() {
        const list = document.createElement('ul');
        list.className = 'ch-autocomplete-choices-all';

        this._value.forEach(v => {
            const choice = this._drawSingleChoice(v);
            list.appendChild(choice);
        });

        const clear = document.createElement('li');
        clear.className = 'ch-autocomplete-remove-all';
        clear.innerText = `Limpiar`;
        list.appendChild(clear);

        tiny.on(clear, 'click', e => {
            this.clear();
        });

        this._choicesList.parentNode.insertBefore(list, this._choicesList.nextSibling);
    }


    /**
     * Turns on the ability off listen the keystrokes
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @private
     * @returns {autocomplete}
     */
    _turn (turn) {
        var that = this;

        if (!this._enabled || this._isOn) {
            return this;
        }


        function turnOn() {
            that._isOn = true;

            that._currentQuery = that.trigger.value.trim();

            // when the user writes
            window.clearTimeout(that._stopTyping);

            that._stopTyping = window.setTimeout(function () {

                tiny.addClass(that.trigger, that.getClassname(that._options.loadingClass));
                /**
                 * Event emitted when the user is typing.
                 * @event ch.Autocomplete#type
                 * @example
                 * // Subscribe to "type" event with ajax call
                 * autocomplete.on('type', function (userInput) {
                 *      $.ajax({
                 *          'url': '/countries?q=' + userInput,
                 *          'dataType': 'json',
                 *          'success': function (response) {
                 *              autocomplete.suggest(response);
                 *          }
                 *      });
                 * });
                 * @example
                 * // Subscribe to "type" event with jsonp
                 * autocomplete.on('type', function (userInput) {
                 *       $.ajax({
                 *           'url': '/countries?q='+ userInput +'&callback=parseResults',
                 *           'dataType': 'jsonp',
                 *           'cache': false,
                 *           'global': true,
                 *           'context': window,
                 *           'jsonp': 'parseResults',
                 *           'crossDomain': true
                 *       });
                 * });
                 */
                that.emit('type', that._currentQuery);
            }, that._options.keystrokesTime);
        }

        function turnOnFallback(e) {
            if (specialKeyCodeMap[e.which || e.keyCode]) {
                return;
            }
            // When keydown is fired that.trigger still has an old value
            setTimeout(turnOn, 1);
        }

        this._originalQuery = this.trigger.value;

        // IE8 don't support the input event at all
        // IE9 is the only browser that doesn't fire the input event when characters are removed
        var ua = navigator.userAgent;
        var MSIE = (/(msie|trident)/i).test(ua) ?
            ua.match(/(msie |rv:)(\d+(.\d+)?)/i)[2] : false;

        if (turn === 'on') {
            if (!MSIE || MSIE > 9) {
                tiny.on(this.trigger, tiny.onkeyinput, turnOn);
            } else {
                'keydown cut paste'.split(' ').forEach(function (evtName) {
                    tiny.on(that.trigger, evtName, turnOnFallback);
                });
            }
        } else if (turn === 'off') {
            that._isOn = false;
            this.hide();
            if (!MSIE || MSIE > 9) {
                tiny.off(this.trigger, tiny.onkeyinput, turnOn);
            } else {
                'keydown cut paste'.split(' ').forEach(function (evtName) {
                    tiny.off(that.trigger, evtName, turnOnFallback);
                });
            }
        }

        return this;
    };

    /**
     * It sets to the HTMLInputElement the selected query and it emits a 'select' event.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @private
     * @returns {autocomplete}
     */
    _selectSuggestion () {
        window.clearTimeout(this._stopTyping);

        if (this._highlighted === null) {
            if (this._suggestions.length > 0) {
                this._highlighted = 0;
                this._toogleHighlighted();
            } else {
                return this;
            }
        }

        if (!this._options.html) {
            // FIXME
            const parts = this._suggestions[this._highlighted].split(',');
            if (this._options.multiple) {
                this._value.push(parts[0].trim());
                this.trigger.value = '';

                tiny.removeClass(this._choicesList, this.getClassname(this._options.choicesClass + '--empty'));

                if (this._value.length > this._options.visibleChoicesLimit) {
                    this._clearChoices();

                    const summary = this._choicesList.querySelector('.ch-autocomplete-choices-summary');
                    const text = `+ ${this._value.length} colonias`;
                    if (summary) {
                        summary.querySelector('a').innerText = text;
                    } else {
                        const li = document.createElement('li');
                        li.className = 'ch-autocomplete-choices-summary';
                        li.innerHTML = `<a>${text}</a>`;
                        const inputWrapper = this._searchInput.parentNode;
                        inputWrapper.parentNode.insertBefore(li, inputWrapper);

                        tiny.on(li.querySelector('a'), 'click', e => {
                            e.preventDefault();
                            const a = e.target;
                            if (a.getAttribute('data-opened')) {
                                a.removeAttribute('data-opened');
                                a.innerText = `+ ${this._value.length} colonias`;
                                const list = this._wrapper.querySelector('.ch-autocomplete-choices-all');
                                list.parentNode.removeChild(list);
                            } else {
                                a.setAttribute('data-opened', true);
                                a.innerText = `Ocultar selección`;
                                this._showAllChoices();
                            }
                        });
                    }

                } else {
                    const choice = this._drawSingleChoice(parts[0].trim());
                    const inputWrapper = this._searchInput.parentNode;
                    inputWrapper.parentNode.insertBefore(choice, inputWrapper);
                }

            } else {
                this._value = parts[0].trim();
                this.trigger.value = this._value;
            }
        }

        if (this._options.multiple) {
            this.suggest([]);
            this._fixInputWidth();
            this._turn('off');
            setTimeout(() => {
                this._searchInput.focus();
            }, 10);

        } else if (this._options.closeOnSelect) {
            this._isOn = false;
            this.trigger.blur();
        }


        /**
         * Event emitted when a suggestion is selected.
         * @event ch.Autocomplete#select
         * @example
         * // Subscribe to "select" event.
         * autocomplete.on('select', function () {
         *     // Some code here!
         * });
         */
        this.emit('select', this._suggestions[this._highlighted], this._highlighted);

        return this;
    };

    /**
     * It highlights the item adding the "ch-autocomplete-highlighted" class name or the class name that you configured as "highlightedClass" option.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @private
     * @returns {autocomplete}
     */
    _toogleHighlighted () {
        // null is when is not a selected item but,
        // increments 1 _highlighted because aria-posinset starts in 1 instead 0 as the collection that stores the data
        let highlightedClassName = this.getClassname(this._options.highlightedClass),
            current = (this._highlighted === null) ? null : (this._highlighted + 1),
            currentItem = this.container.querySelector(`[aria-posinset="${current}"]`),
            selectedItem = this.container.querySelector(`[aria-posinset].${highlightedClassName}`);

        if (selectedItem !== null) {
            // background the highlighted item
            tiny.removeClass(selectedItem, highlightedClassName);
        }

        if (currentItem !== null) {
            // highlight the selected item
            tiny.addClass(currentItem, highlightedClassName);
        }

        return this;
    };

    _configureShortcuts () {

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        var that = this;

        tiny.on(this.trigger, 'keyup', (e) => {
            let key = e.which || e.keyCode;
            let value;

            switch (key) {
                case KEYS.ENTER:
                    that._selectSuggestion();
                    break;
                case KEYS.ESC:
                    that.hide();
                    that.trigger.value = that._originalQuery;
                    break;
                case KEYS.DOWN:
                    // change the selected value & stores the future HTMLInputElement value
                    if (that._highlighted >= that._suggestionsQuantity - 1) {
                        that._highlighted = null;
                        value = that._currentQuery;
                    } else {
                        that._highlighted = that._highlighted === null ? 0 : that._highlighted + 1;
                        value = that._suggestions[that._highlighted];
                    }

                    that._toogleHighlighted();

                    if (!that._options.html && !this._options.multiple) {
                        // FIXME
                        const parts = value.split(',');
                        that.trigger.value = parts[0].trim();
                    }
                    break;
                case KEYS.UP:
                    // change the selected value & stores the future HTMLInputElement value
                    if (that._highlighted === null) {

                        that._highlighted = that._suggestionsQuantity - 1;
                        value = that._suggestions[that._highlighted];

                    } else if (that._highlighted <= 0) {
                        that._highlighted = null;
                        value = that._currentQuery;
                    } else {
                        that._highlighted -= 1;
                        value = that._suggestions[that._highlighted];
                    }

                    that._toogleHighlighted();

                    if (!that._options.html && !this._options.multiple) {
                        // FIXME
                        const parts = value.split(',');
                        that.trigger.value = parts[0].trim();
                    }
                    break;
            }

            if ([KEYS.ENTER, KEYS.DOWN, KEYS.UP].indexOf(key) > -1) {
                e.preventDefault();
            }
        });

        tiny.on(this.trigger, 'keydown', e => {
            let key = e.which || e.keyCode;

            if (key === KEYS.BACKSPACE && this.trigger.value.length === 0) {
                this.clear();
            }
        });

        /*
        // Shortcuts
        ch.shortcuts.add(ch.onkeyenter, this.uid, function (event) {
            event.preventDefault();
            that._selectSuggestion();
        });

        ch.shortcuts.add(ch.onkeyesc, this.uid, function () {
            that.hide();
            that._el.value = that._originalQuery;
        });

        ch.shortcuts.add(ch.onkeyuparrow, this.uid, function (event) {
            event.preventDefault();

            var value;

            // change the selected value & stores the future HTMLInputElement value
            if (that._highlighted === null) {

                that._highlighted = that._suggestionsQuantity - 1;
                value = that._suggestions[that._highlighted];

            } else if (that._highlighted <= 0) {

                this._prevHighlighted = this._currentHighlighted = null;
                value = that._currentQuery;

            } else {

                that._highlighted -= 1;
                value = that._suggestions[that._highlighted];

            }

            that._toogleHighlighted();

            if (!that._options.html) {
                that._el.value = value;
            }

        });

        ch.shortcuts.add(ch.onkeydownarrow, this.uid, function () {
            var value;

            // change the selected value & stores the future HTMLInputElement value
            if (that._highlighted === null) {

                that._highlighted = 0;

                value = that._suggestions[that._highlighted];

            } else if (that._highlighted >= that._suggestionsQuantity - 1) {

                that._highlighted = null;
                value = that._currentQuery;

            } else {

                that._highlighted += 1;
                value = that._suggestions[that._highlighted];

            }

            that._toogleHighlighted();

            if (!that._options.html) {
                that._el.value = value;
            }

        });
        */

        // Activate the shortcuts for this instance
        this._popover.on('show', () => {
            console.log('show');
        });

        // Deactivate the shortcuts for this instance
        this._popover.on('hide', () => {
            console.log('hide');
        });

        this.on('destroy', function () {
            ch.shortcuts.remove(this.uid);
        });

        return this;
    };

    /**
     * Add suggestions to be shown.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @returns {autocomplete}
     * @example
     * // The suggest method needs an Array of strings to work with default configuration
     * autocomplete.suggest(['Aruba','Armenia','Argentina']);
     * @example
     * // To work with html configuration, it needs an Array of strings. Each string must to be as you wish you watch it
     * autocomplete.suggest([
     *  '<strong>Ar</strong>uba <i class="flag-aruba"></i>',
     *  '<strong>Ar</strong>menia <i class="flag-armenia"></i>',
     *  '<strong>Ar</strong>gentina <i class="flag-argentina"></i>'
     * ]);
     */
    suggest (suggestions, data) {

        /**
         * Reference to context of an instance.
         * @type {Object}
         * @private
         */
        let that = this,
            items = [],
            matchedRegExp = new RegExp('(' + this._currentQuery.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1') + ')', 'ig'),
            totalItems,
            itemDOMCollection,
            itemTemplate = this._options._itemTemplate,
            suggestedItem,
            term,
            suggestionsLength = suggestions.length,
            el,
            highlightedClassName = this.getClassname(this._options.highlightedClass),
            itemSelected = this.container.querySelector(`.${highlightedClassName}`);

        // hide the loading feedback
        tiny.removeClass(this.trigger, that.getClassname(that._options.loadingClass));

        // hides the suggestions list
        if (suggestionsLength === 0) {
            this._popover.hide();

            setTimeout(() => {
                // Reset suggestions collection.
                this._suggestions = [];
                this._suggestionsList.innerHTML = '';
                that._highlighted = null;
            }, 50);

            return this;
        }

        // shows the suggestions list when the is closed and the element is withs focus
        if (!this._popover.isShown() && window.document.activeElement === this.trigger) {
            this._popover.show();
        }

        // remove the class from the extra added items
        if (itemSelected !== null) {
            tiny.removeClass(itemSelected, highlightedClassName);
        }

        // add each suggested item to the suggestion list
        for (suggestedItem = 0; suggestedItem < suggestionsLength; suggestedItem += 1) {
            // get the term to be replaced
            term = suggestions[suggestedItem];

            // for the html configured component doesn't highlight the term matched it must be done by the user
            if (!that._options.html) {
                term = term.replace(matchedRegExp, '<strong>$1</strong>');
                itemTemplate = this._options._itemTemplate.replace('{{suggestedData}}', ' data-suggested="' + suggestions[suggestedItem] + '"');
            }

            items.push(itemTemplate.replace('{{term}}', term));
        }

        this._suggestionsList.innerHTML = items.join('');

        itemDOMCollection = this.container.querySelectorAll('.' + this.getClassname(this._options.itemClass));

        // with this we set the aria-setsize value that counts the total
        totalItems = itemDOMCollection.length;

        // Reset suggestions collection.
        this._suggestions = [];

        for (suggestedItem = 0; suggestedItem < totalItems; suggestedItem += 1) {
            el = itemDOMCollection[suggestedItem];

            // add the data to the suggestions collection
            that._suggestions.push(el.getAttribute('data-suggested'));

            el.setAttribute('aria-posinset', that._suggestions.length);
            el.setAttribute('aria-setsize', totalItems);
        }

        this._suggestionsData = data ? data : this._suggestions;

        this._highlighted = null;

        this._suggestionsQuantity = this._suggestions.length;

        return this;
    };

    /**
     * Hides component's container.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @returns {autocomplete}
     * @example
     * // Hides the autocomplete.
     * autocomplete.hide();
     */
    hide () {

        if (!this._enabled) {
            return this;
        }

        this._popover.hide();

        /**
         * Event emitted when the Autocomplete container is hidden.
         * @event ch.Autocomplete#hide
         * @example
         * // Subscribe to "hide" event.
         * autocomplete.on('hide', function () {
         *  // Some code here!
         * });
         */
        this.emit('hide');

        return this;
    };

    /**
     * Returns a Boolean if the component's core behavior is shown. That means it will return 'true' if the component is on and it will return false otherwise.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @returns {Boolean}
     * @example
     * // Execute a function if the component is shown.
     * if (autocomplete.isShown()) {
     *     fn();
     * }
     */
    isShown () {
        return this._popover.isShown();
    };

    disable () {
        if (this.isShown()) {
            this.hide();
            this._isOn = false;
            this._el.blur();
        }

        super.disable();

        return this;
    };

    /**
     * Destroys an Autocomplete instance.
     * @memberof! ch.Autocomplete.prototype
     * @function
     * @example
     * // Destroying an instance of Autocomplete.
     * autocomplete.destroy();
     */
    destroy () {

        tiny.off(this.container, highlightEvent, this._highlightSuggestion);

        this.trigger.removeAttribute('autocomplete');
        this.trigger.removeAttribute('aria-autocomplete');
        this.trigger.removeAttribute('aria-haspopup');
        this.trigger.removeAttribute('aria-owns');

        this._popover.destroy();

        super.destroy();

        return;
    };
}

/**
 * Get closest DOM element up the tree that contains a class, ID, or data attribute
 *
 * @param  {Node} elem The base element
 * @param  {String} selector The class, id, data attribute, or tag to look for
 * @return {Node} Null if no match
 */
var closestParent = function (elem, selector) {
    const firstChar = selector.charAt(0);

    // Get closest match
    for (; elem && elem !== document; elem = elem.parentNode) {

        // If selector is a class
        if (firstChar === '.') {
            if (elem.classList.contains(selector.substr(1))) {
                return elem;
            }
        }

        // If selector is an ID
        if (firstChar === '#') {
            if (elem.id === selector.substr(1)) {
                return elem;
            }
        }

        // If selector is a data attribute
        if (firstChar === '[') {
            if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                return elem;
            }
        }

        // If selector is a tag
        if (elem.tagName.toLowerCase() === selector) {
            return elem;
        }

    }

    return null;
};

export default Autocomplete;
