/**
 * Add a function to manage components content.
 * @mixin
 *
 * @returns {Function}
 */
function Content() {
    /**
     * Allows to manage the components content.
     * @function
     * @memberof! ch.Content#
     * @param {(String | HTMLElement)} content The content that will be used by a component.
     * @param {Object} [options] A custom options to be used with content loaded by ajax.
     * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
     * @param {String} [options.params] Params like query string to be sent to the server.
     * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true. false value will work only with HEAD and GET requests
     * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading.
     * @example
     * // Update content with some string.
     * component.content('Some new content here!');
     * @example
     * // Update content that will be loaded by ajax with custom options.
     * component.content('http://chico-ui.com.ar/ajax', {
         *     'cache': false,
         *     'params': 'x-request=true'
         * });
     */
    this.content = function (content, options) {
        var parent;

        // Returns the last updated content.
        if (content === undefined) {
            return this._content.innerHTML;
        }

        this._options.content = content;

        if (this._options.cache === undefined) {
            this._options.cache = true;
        }

        if (typeof content === 'string') {
            // Case 1: AJAX call
            if ((/^(((https|http|ftp|file):\/\/)|www\.|\.\/|(\.\.\/)+|(\/{1,2})|(\d{1,3}\.){3}\d{1,3})(((\w+|-)(\.?)(\/?))+)(\:\d{1,5}){0,1}(((\w+|-)(\.?)(\/?)(#?))+)((\?)(\w+=(\w?)+(&?))+)?(\w+#\w+)?$/).test(content)) {
                getAsyncContent.call(this, content.replace(/#.+/, ''), options);
                // Case 2: Plain text
            } else {
                setContent.call(this, content);
            }
            // Case 3: HTML Element
        } else if (content.nodeType !== undefined) {

            tiny.removeClass(content, this.getClassname('hide'));
            parent = tiny.parent(content);

            setContent.call(this, content);

            if (!this._options.cache) {
                parent.removeChild(content);
            }

        }

        return this;
    };

    // Loads content once. If the cache is disabled the content loads on every show.
    this.once('_show', () => {
        this.content(this._options.content);

        this.on('show', () => {
            if (!this._options.cache) {
                this.content(this._options.content);
            }
        });
    });


    /**
     * Set async content into component's container and emits the current event.
     * @private
     */
    function setAsyncContent(event) {

        this._content.innerHTML = event.response;

        /**
         * Event emitted when the content change.
         * @event ch.Content#contentchange
         * @private
         */
        this.emit('_contentchange');

        /**
         * Event emitted if the content is loaded successfully.
         * @event ch.Content#contentdone
         * @ignore
         */

        /**
         * Event emitted when the content is loading.
         * @event ch.Content#contentwaiting
         * @example
         * // Subscribe to "contentwaiting" event.
         * component.on('contentwaiting', function (event) {
             *     // Some code here!
             * });
         */

        /**
         * Event emitted if the content isn't loaded successfully.
         * @event ch.Content#contenterror
         * @example
         * // Subscribe to "contenterror" event.
         * component.on('contenterror', function (event) {
             *     // Some code here!
             * });
         */

        this.emit('content' + event.status, event);
    }

    /**
     * Set content into component's container and emits the contentdone event.
     * @private
     */
    function setContent(content) {

        if (content.nodeType !== undefined) {
            this._content.innerHTML = '';
            this._content.appendChild(content);
        } else {
            this._content.innerHTML = content;
        }


        this._options.cache = true;

        /**
         * Event emitted when the content change.
         * @event ch.Content#contentchange
         * @private
         */
        this.emit('_contentchange');

        /**
         * Event emitted if the content is loaded successfully.
         * @event ch.Content#contentdone
         * @example
         * // Subscribe to "contentdone" event.
         * component.on('contentdone', function (event) {
             *     // Some code here!
             * });
         */
        this.emit('contentdone');
    }

    /**
     * Get async content with given URL.
     * @private
     */
    function getAsyncContent(url, options) {
        let requestCfg,
            defaults = {
                'method': this._options.method,
                'params': this._options.params,
                'cache': this._options.cache,
                'waiting': this._options.waiting
            };

        // Initial options to be merged with the user's options
        options = tiny.extend({
            'method': 'GET',
            'params': '',
            'waiting': 'loading-large'
        }, defaults, options);

        // Set loading
        setAsyncContent.call(this, {
            'status': 'waiting',
            'response': options.waiting.charAt(0) === '<' ? options.waiting : `<div class="${this.getClassname(options.waiting)}"></div>`
        });

        requestCfg = {
            method: options.method,
            success: (resp) => {
                setAsyncContent.call(this, {
                    'status': 'done',
                    'response': resp
                });
            },
            error: (err) => {
                setAsyncContent.call(this, {
                    'status': 'error',
                    'response': '<p>Error on ajax call.</p>',
                    'data': err.message || JSON.stringify(err)
                });
            }
        };

        if (options.cache !== undefined) {
            this._options.cache = options.cache;
        }

        if (options.cache === false && ['GET', 'HEAD'].indexOf(options.method.toUpperCase()) !== -1) {
            requestCfg.cache = false;
        }

        if (options.params) {
            if (['GET', 'HEAD'].indexOf(options.method.toUpperCase()) !== -1) {
                url += (url.indexOf('?') !== -1 || options.params[0] === '?' ? '' : '?') + options.params;
            } else {
                requestCfg.data = options.params;
            }
        }

        // Make a request
        tiny.ajax(url, requestCfg);
    }

}

export default Content
