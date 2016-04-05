import Autocomplete from './autocomplete';
import Collapsible from '../mixins/collapsible';
import Content from '../mixins/content';


class Dumb extends Autocomplete {
    constructor(el, cfg) {
        super(el, cfg);
    }

    static _defaults = {
        a: 'b',
        c: 'd'
    };

    _init() {
        console.log('Dumb init');

        this._options = tiny.extend({}, Dumb._defaults);
        super._init();

        //this.inject(Collapsible, Content);
    }
}

export default Dumb;
