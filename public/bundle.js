var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src/App.svelte generated by Svelte v3.52.0 */

    const { document: document_1 } = globals;

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[41] = list;
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[45] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    // (108:1) {#each Object.keys(data) as lng, i (`lang-${i}
    function create_each_block_2(key_1, ctx) {
    	let button;
    	let t_value = (/*lng*/ ctx[45] == 'th' ? 'ไทย' : 'Eng') + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*lng*/ ctx[45]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			button = element("button");
    			t = text(t_value);

    			attr(button, "class", button_class_value = "block duration-300 p-4 " + (/*q*/ ctx[1].lang === /*lng*/ ctx[45]
    			? "bg-green-500 text-gray-100"
    			: "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"));

    			this.first = button;
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*data*/ 1 && t_value !== (t_value = (/*lng*/ ctx[45] == 'th' ? 'ไทย' : 'Eng') + "")) set_data(t, t_value);

    			if (dirty[0] & /*q, data*/ 3 && button_class_value !== (button_class_value = "block duration-300 p-4 " + (/*q*/ ctx[1].lang === /*lng*/ ctx[45]
    			? "bg-green-500 text-gray-100"
    			: "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (115:1) {#each Object.keys(data[q.lang].label) as dc, i (`doc-${i}
    function create_each_block_1(key_1, ctx) {
    	let button;
    	let t0_value = /*data*/ ctx[0][/*q*/ ctx[1].lang].label[/*dc*/ ctx[43]].title + "";
    	let t0;
    	let t1;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[9](/*dc*/ ctx[43]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();

    			attr(button, "class", button_class_value = "block duration-300 p-4 " + (/*q*/ ctx[1].doc === /*dc*/ ctx[43]
    			? "bg-green-500 text-gray-100"
    			: "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"));

    			this.first = button;
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t0);
    			append(button, t1);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*data, q*/ 3 && t0_value !== (t0_value = /*data*/ ctx[0][/*q*/ ctx[1].lang].label[/*dc*/ ctx[43]].title + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*q, data*/ 3 && button_class_value !== (button_class_value = "block duration-300 p-4 " + (/*q*/ ctx[1].doc === /*dc*/ ctx[43]
    			? "bg-green-500 text-gray-100"
    			: "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (137:3) {#if q.doc !== 'receipt'}
    function create_if_block_1(ctx) {
    	let div0;
    	let t0_value = /*l*/ ctx[2].duedate + "";
    	let t0;
    	let t1;
    	let div1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			attr(div0, "class", "text-right");
    			attr(div1, "class", "");
    			attr(div1, "contenteditable", "true");
    			if (/*q*/ ctx[1].duedate === void 0) add_render_callback(() => /*div1_input_handler*/ ctx[12].call(div1));
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, t0);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);

    			if (/*q*/ ctx[1].duedate !== void 0) {
    				div1.textContent = /*q*/ ctx[1].duedate;
    			}

    			if (!mounted) {
    				dispose = listen(div1, "input", /*div1_input_handler*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*l*/ 4 && t0_value !== (t0_value = /*l*/ ctx[2].duedate + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].duedate !== div1.textContent) {
    				div1.textContent = /*q*/ ctx[1].duedate;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (185:3) {#each q.itemDesc as _, i (`item-${i}
    function create_each_block(key_1, ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*i*/ ctx[42] + 1 + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2;
    	let td2;
    	let t3_value = /*price*/ ctx[3](/*q*/ ctx[1].itemPrice[/*i*/ ctx[42]]) + "";
    	let t3;
    	let t4;
    	let td3;
    	let t5_value = /*qty*/ ctx[4](/*q*/ ctx[1].itemQty[/*i*/ ctx[42]]) + "";
    	let t5;
    	let t6;
    	let td4;
    	let t7_value = /*price*/ ctx[3](/*q*/ ctx[1].itemAmount[/*i*/ ctx[42]]) + "";
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	function td1_input_handler() {
    		/*td1_input_handler*/ ctx[18].call(td1, /*i*/ ctx[42]);
    	}

    	function focus_handler(...args) {
    		return /*focus_handler*/ ctx[19](/*i*/ ctx[42], ...args);
    	}

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[20](/*i*/ ctx[42], ...args);
    	}

    	function blur_handler(...args) {
    		return /*blur_handler*/ ctx[21](/*i*/ ctx[42], ...args);
    	}

    	function focus_handler_1(...args) {
    		return /*focus_handler_1*/ ctx[22](/*i*/ ctx[42], ...args);
    	}

    	function input_handler_1(...args) {
    		return /*input_handler_1*/ ctx[23](/*i*/ ctx[42], ...args);
    	}

    	function blur_handler_1(...args) {
    		return /*blur_handler_1*/ ctx[24](/*i*/ ctx[42], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = space();
    			td2 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			td3 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			td4 = element("td");
    			t7 = text(t7_value);
    			t8 = space();
    			attr(td0, "class", "p-2 text-center whitespace-nowrap");
    			attr(td0, "contenteditable", "true");
    			attr(td1, "class", "p-2");
    			attr(td1, "contenteditable", "true");
    			if (/*q*/ ctx[1].itemDesc[/*i*/ ctx[42]] === void 0) add_render_callback(td1_input_handler);
    			attr(td2, "class", "p-2 text-center whitespace-nowrap");
    			attr(td2, "contenteditable", "true");
    			attr(td3, "class", "p-2 text-center whitespace-nowrap");
    			attr(td3, "contenteditable", "true");
    			attr(td4, "class", "p-2 text-right whitespace-nowrap");
    			attr(tr, "class", "border-b");
    			this.first = tr;
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);

    			if (/*q*/ ctx[1].itemDesc[/*i*/ ctx[42]] !== void 0) {
    				td1.textContent = /*q*/ ctx[1].itemDesc[/*i*/ ctx[42]];
    			}

    			append(tr, t2);
    			append(tr, td2);
    			append(td2, t3);
    			append(tr, t4);
    			append(tr, td3);
    			append(td3, t5);
    			append(tr, t6);
    			append(tr, td4);
    			append(td4, t7);
    			append(tr, t8);

    			if (!mounted) {
    				dispose = [
    					listen(td1, "input", td1_input_handler),
    					listen(td2, "focus", focus_handler),
    					listen(td2, "input", input_handler),
    					listen(td2, "blur", blur_handler),
    					listen(td3, "focus", focus_handler_1),
    					listen(td3, "input", input_handler_1),
    					listen(td3, "blur", blur_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*q*/ 2 && t0_value !== (t0_value = /*i*/ ctx[42] + 1 + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].itemDesc[/*i*/ ctx[42]] !== td1.textContent) {
    				td1.textContent = /*q*/ ctx[1].itemDesc[/*i*/ ctx[42]];
    			}

    			if (dirty[0] & /*q*/ 2 && t3_value !== (t3_value = /*price*/ ctx[3](/*q*/ ctx[1].itemPrice[/*i*/ ctx[42]]) + "")) set_data(t3, t3_value);
    			if (dirty[0] & /*q*/ 2 && t5_value !== (t5_value = /*qty*/ ctx[4](/*q*/ ctx[1].itemQty[/*i*/ ctx[42]]) + "")) set_data(t5, t5_value);
    			if (dirty[0] & /*q*/ 2 && t7_value !== (t7_value = /*price*/ ctx[3](/*q*/ ctx[1].itemAmount[/*i*/ ctx[42]]) + "")) set_data(t7, t7_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (246:3) {#if q.doc === 'receipt'}
    function create_if_block(ctx) {
    	let tr;
    	let td0;
    	let span0;
    	let t0_value = /*l*/ ctx[2].totalWht + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2;
    	let span2;
    	let t3_value = /*rate*/ ctx[5](/*q*/ ctx[1].whtRate) + "";
    	let t3;
    	let t4;
    	let td1;
    	let t5_value = /*price*/ ctx[3](/*q*/ ctx[1].totalWht) + "";
    	let t5;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = space();
    			span2 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			td1 = element("td");
    			t5 = text(t5_value);
    			attr(span0, "class", "");
    			attr(span1, "class", "");
    			attr(span2, "class", "");
    			attr(span2, "contenteditable", "true");
    			attr(td0, "class", "p-2 text-center whitespace-nowrap");
    			attr(td0, "colspan", "2");
    			attr(td1, "class", "p-2 text-right whitespace-nowrap");
    			attr(tr, "class", "");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, span0);
    			append(span0, t0);
    			append(td0, t1);
    			append(td0, span1);
    			append(td0, t2);
    			append(td0, span2);
    			append(span2, t3);
    			append(tr, t4);
    			append(tr, td1);
    			append(td1, t5);

    			if (!mounted) {
    				dispose = [
    					listen(span2, "focus", /*focus_handler_3*/ ctx[28]),
    					listen(span2, "input", /*input_handler_3*/ ctx[29]),
    					listen(span2, "blur", /*blur_handler_3*/ ctx[30])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*l*/ 4 && t0_value !== (t0_value = /*l*/ ctx[2].totalWht + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*q*/ 2 && t3_value !== (t3_value = /*rate*/ ctx[5](/*q*/ ctx[1].whtRate) + "")) set_data(t3, t3_value);
    			if (dirty[0] & /*q*/ 2 && t5_value !== (t5_value = /*price*/ ctx[3](/*q*/ ctx[1].totalWht) + "")) set_data(t5, t5_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let link;
    	let link_href_value;
    	let t0;
    	let div0;
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t1;
    	let each_blocks_1 = [];
    	let each1_lookup = new Map();
    	let t2;
    	let div25;
    	let div8;
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let t3;
    	let div7;
    	let h1;
    	let t4_value = /*l*/ ctx[2].title + "";
    	let t4;
    	let t5;
    	let div3;
    	let t6_value = /*l*/ ctx[2].ref + "";
    	let t6;
    	let t7;
    	let div4;
    	let t8;
    	let div5;
    	let t9_value = /*l*/ ctx[2].date + "";
    	let t9;
    	let t10;
    	let div6;
    	let t11;
    	let t12;
    	let div11;
    	let div9;
    	let h30;
    	let t13_value = /*l*/ ctx[2].client + "";
    	let t13;
    	let t14;
    	let h20;
    	let t15;
    	let p0;
    	let t16;
    	let p1;
    	let t17;
    	let div10;
    	let h31;
    	let t18_value = /*l*/ ctx[2].paymethod + "";
    	let t18;
    	let t19;
    	let p2;
    	let t20;
    	let h32;
    	let t21_value = /*l*/ ctx[2].subject + "";
    	let t21;
    	let t22;
    	let p3;
    	let t23;
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let t24_value = /*l*/ ctx[2].itemNo + "";
    	let t24;
    	let t25;
    	let td1;
    	let div12;
    	let p4;
    	let t26_value = /*l*/ ctx[2].itemDesc + "";
    	let t26;
    	let t27;
    	let button0;
    	let t28;
    	let button1;
    	let t29;
    	let td2;
    	let t30_value = /*l*/ ctx[2].itemPrice + "";
    	let t30;
    	let t31;
    	let td3;
    	let t32_value = /*l*/ ctx[2].itemQty + "";
    	let t32;
    	let t33;
    	let td4;
    	let t34_value = /*l*/ ctx[2].itemAmount + "";
    	let t34;
    	let t35;
    	let tbody;
    	let each_blocks = [];
    	let each2_lookup = new Map();
    	let t36;
    	let tfoot;
    	let tr1;
    	let td5;
    	let div21;
    	let div16;
    	let div13;
    	let t37_value = /*l*/ ctx[2].vendorSign + "";
    	let t37;
    	let t38;
    	let div14;
    	let t39;
    	let div15;
    	let t40;
    	let div20;
    	let div17;
    	let t41_value = /*l*/ ctx[2].clientSign + "";
    	let t41;
    	let t42;
    	let div18;
    	let t43;
    	let div19;
    	let td5_rowspan_value;
    	let t44;
    	let td6;
    	let t45_value = /*l*/ ctx[2].totalAmount + "";
    	let t45;
    	let t46;
    	let td7;
    	let t47_value = /*price*/ ctx[3](/*q*/ ctx[1].totalAmount) + "";
    	let t47;
    	let t48;
    	let tr2;
    	let td8;
    	let span0;
    	let t49_value = /*l*/ ctx[2].totalVat + "";
    	let t49;
    	let t50;
    	let span1;
    	let t51;
    	let span2;
    	let t52_value = /*rate*/ ctx[5](/*q*/ ctx[1].vatRate) + "";
    	let t52;
    	let t53;
    	let td9;
    	let t54_value = /*price*/ ctx[3](/*q*/ ctx[1].totalVat) + "";
    	let t54;
    	let t55;
    	let t56;
    	let tr3;
    	let td10;
    	let t57_value = /*l*/ ctx[2].totalAdjust + "";
    	let t57;
    	let t58;
    	let td11;
    	let t59_value = /*price*/ ctx[3](/*q*/ ctx[1].totalAdjust) + "";
    	let t59;
    	let t60;
    	let tr4;
    	let td12;
    	let t61_value = /*l*/ ctx[2].totalFinal + "";
    	let t61;
    	let t62;
    	let td13;
    	let t63_value = /*price*/ ctx[3](/*q*/ ctx[1].totalFinal) + "";
    	let t63;
    	let t64;
    	let div24;
    	let div22;
    	let h33;
    	let t65_value = /*l*/ ctx[2].vendor + "";
    	let t65;
    	let t66;
    	let h21;
    	let t67;
    	let p5;
    	let t68;
    	let p6;
    	let t69;
    	let div23;
    	let h34;
    	let t70_value = /*l*/ ctx[2].note + "";
    	let t70;
    	let t71;
    	let p7;
    	let t72;
    	let h22;
    	let t73_value = /*l*/ ctx[2].thankMessage + "";
    	let t73;
    	let t74;
    	let div26;
    	let button2;
    	let mounted;
    	let dispose;
    	let each_value_2 = Object.keys(/*data*/ ctx[0]);
    	const get_key = ctx => `lang-${/*i*/ ctx[42]}`;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = Object.keys(/*data*/ ctx[0][/*q*/ ctx[1].lang].label);
    	const get_key_1 = ctx => `doc-${/*i*/ ctx[42]}`;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let if_block0 = /*q*/ ctx[1].doc !== 'receipt' && create_if_block_1(ctx);
    	let each_value = /*q*/ ctx[1].itemDesc;
    	const get_key_2 = ctx => `item-${/*i*/ ctx[42]}`;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_2(child_ctx);
    		each2_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let if_block1 = /*q*/ ctx[1].doc === 'receipt' && create_if_block(ctx);

    	return {
    		c() {
    			link = element("link");
    			t0 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div25 = element("div");
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t3 = space();
    			div7 = element("div");
    			h1 = element("h1");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			t6 = text(t6_value);
    			t7 = space();
    			div4 = element("div");
    			t8 = space();
    			div5 = element("div");
    			t9 = text(t9_value);
    			t10 = space();
    			div6 = element("div");
    			t11 = space();
    			if (if_block0) if_block0.c();
    			t12 = space();
    			div11 = element("div");
    			div9 = element("div");
    			h30 = element("h3");
    			t13 = text(t13_value);
    			t14 = space();
    			h20 = element("h2");
    			t15 = space();
    			p0 = element("p");
    			t16 = space();
    			p1 = element("p");
    			t17 = space();
    			div10 = element("div");
    			h31 = element("h3");
    			t18 = text(t18_value);
    			t19 = space();
    			p2 = element("p");
    			t20 = space();
    			h32 = element("h3");
    			t21 = text(t21_value);
    			t22 = space();
    			p3 = element("p");
    			t23 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			t24 = text(t24_value);
    			t25 = space();
    			td1 = element("td");
    			div12 = element("div");
    			p4 = element("p");
    			t26 = text(t26_value);
    			t27 = space();
    			button0 = element("button");
    			button0.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"></path><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"></path></svg>`;
    			t28 = space();
    			button1 = element("button");
    			button1.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
    			t29 = space();
    			td2 = element("td");
    			t30 = text(t30_value);
    			t31 = space();
    			td3 = element("td");
    			t32 = text(t32_value);
    			t33 = space();
    			td4 = element("td");
    			t34 = text(t34_value);
    			t35 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t36 = space();
    			tfoot = element("tfoot");
    			tr1 = element("tr");
    			td5 = element("td");
    			div21 = element("div");
    			div16 = element("div");
    			div13 = element("div");
    			t37 = text(t37_value);
    			t38 = space();
    			div14 = element("div");
    			t39 = space();
    			div15 = element("div");
    			t40 = space();
    			div20 = element("div");
    			div17 = element("div");
    			t41 = text(t41_value);
    			t42 = space();
    			div18 = element("div");
    			t43 = space();
    			div19 = element("div");
    			t44 = space();
    			td6 = element("td");
    			t45 = text(t45_value);
    			t46 = space();
    			td7 = element("td");
    			t47 = text(t47_value);
    			t48 = space();
    			tr2 = element("tr");
    			td8 = element("td");
    			span0 = element("span");
    			t49 = text(t49_value);
    			t50 = space();
    			span1 = element("span");
    			t51 = space();
    			span2 = element("span");
    			t52 = text(t52_value);
    			t53 = space();
    			td9 = element("td");
    			t54 = text(t54_value);
    			t55 = space();
    			if (if_block1) if_block1.c();
    			t56 = space();
    			tr3 = element("tr");
    			td10 = element("td");
    			t57 = text(t57_value);
    			t58 = space();
    			td11 = element("td");
    			t59 = text(t59_value);
    			t60 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			t61 = text(t61_value);
    			t62 = space();
    			td13 = element("td");
    			t63 = text(t63_value);
    			t64 = space();
    			div24 = element("div");
    			div22 = element("div");
    			h33 = element("h3");
    			t65 = text(t65_value);
    			t66 = space();
    			h21 = element("h2");
    			t67 = space();
    			p5 = element("p");
    			t68 = space();
    			p6 = element("p");
    			t69 = space();
    			div23 = element("div");
    			h34 = element("h3");
    			t70 = text(t70_value);
    			t71 = space();
    			p7 = element("p");
    			t72 = space();
    			h22 = element("h2");
    			t73 = text(t73_value);
    			t74 = space();
    			div26 = element("div");
    			button2 = element("button");
    			button2.textContent = "Print";
    			attr(link, "href", link_href_value = /*data*/ ctx[0][/*q*/ ctx[1].lang]['font-link']);
    			attr(link, "rel", "stylesheet");
    			attr(div0, "class", "flex flex-wrap justify-center items-center my-4 print:hidden");
    			attr(img, "class", "my-auto");
    			if (!src_url_equal(img.src, img_src_value = /*q*/ ctx[1].vendorLogo)) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "width", "");
    			attr(img, "height", "");
    			attr(div1, "class", "w-1/2 md:w-1/3 h-full p-2 mx-auto rounded-b-full bg-green-400 shadow-lg");
    			attr(div2, "class", "");
    			attr(h1, "class", "rounded text-center text-4xl border-b-2 border-green-400 text-green-400 shadow-md col-span-full p-3");
    			attr(div3, "class", "text-right");
    			attr(div4, "class", "");
    			attr(div4, "contenteditable", "true");
    			if (/*q*/ ctx[1].ref === void 0) add_render_callback(() => /*div4_input_handler*/ ctx[10].call(div4));
    			attr(div5, "class", "text-right");
    			attr(div6, "class", "");
    			attr(div6, "contenteditable", "true");
    			if (/*q*/ ctx[1].date === void 0) add_render_callback(() => /*div6_input_handler*/ ctx[11].call(div6));
    			attr(div7, "class", "grid grid-cols-2 gap-2 self-center");
    			attr(div8, "class", "grid grid-cols-2");
    			attr(h30, "class", "border-b-2 border-green-400 text-green-400 pb-1 mb-1");
    			attr(h20, "class", "text-xl mb-2");
    			attr(h20, "contenteditable", "true");
    			if (/*q*/ ctx[1].clientName === void 0) add_render_callback(() => /*h20_input_handler*/ ctx[13].call(h20));
    			attr(p0, "class", "pl-3 mb-2");
    			attr(p0, "contenteditable", "true");
    			if (/*q*/ ctx[1].clientId === void 0) add_render_callback(() => /*p0_input_handler*/ ctx[14].call(p0));
    			attr(p1, "class", "pl-3 mb-2");
    			attr(p1, "contenteditable", "true");
    			if (/*q*/ ctx[1].clientAddress === void 0) add_render_callback(() => /*p1_input_handler*/ ctx[15].call(p1));
    			attr(div9, "class", "");
    			attr(h31, "class", "border-b-2 border-green-400 text-green-400 pb-1 mb-1");
    			attr(p2, "class", "pl-3 mb-3");
    			attr(p2, "contenteditable", "true");
    			if (/*q*/ ctx[1].paymethod === void 0) add_render_callback(() => /*p2_input_handler*/ ctx[16].call(p2));
    			attr(h32, "class", "border-b-2 border-green-400 text-green-400 pb-1 mb-1");
    			attr(p3, "class", "pl-3");
    			attr(p3, "contenteditable", "true");
    			if (/*q*/ ctx[1].subject === void 0) add_render_callback(() => /*p3_input_handler*/ ctx[17].call(p3));
    			attr(div10, "class", "");
    			attr(div11, "class", "grid grid-cols-2 gap-4 pl-6 pr-2");
    			attr(td0, "class", "p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap");
    			attr(p4, "class", "p-2 flex-grow");
    			attr(button0, "class", "p-2 focus:bg-green-600 hover:bg-green-600 rounded-full transition duration-300 ease-in-out print:hidden");
    			attr(button1, "class", "p-2 focus:bg-green-600 hover:bg-green-600 rounded-full transition duration-300 ease-in-out print:hidden");
    			attr(div12, "class", "flex");
    			attr(td1, "class", "bg-green-400 rounded shadow-md");
    			attr(td2, "class", "p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap");
    			attr(td3, "class", "p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap");
    			attr(td4, "class", "p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap");
    			attr(tr0, "class", "text-white ");
    			attr(thead, "class", "text-center");
    			attr(tbody, "class", "");
    			attr(div13, "class", "");
    			attr(div14, "class", "");
    			attr(div14, "contenteditable", "true");
    			attr(div15, "class", "");
    			attr(div15, "contenteditable", "true");
    			attr(div16, "class", "rounded-3xl shadow-md text-center");
    			attr(div17, "class", "");
    			attr(div18, "class", "");
    			attr(div18, "contenteditable", "true");
    			attr(div19, "class", "");
    			attr(div19, "contenteditable", "true");
    			attr(div20, "class", "rounded-3xl shadow-md text-center");
    			attr(div21, "class", "grid grid-cols-2");
    			attr(td5, "class", "p-2 text-center");
    			attr(td5, "colspan", "2");
    			attr(td5, "rowspan", td5_rowspan_value = /*q*/ ctx[1].doc === 'receipt' ? 5 : 4);
    			attr(td6, "class", "p-2 text-center whitespace-nowrap");
    			attr(td6, "colspan", "2");
    			attr(td7, "class", "p-2 text-right whitespace-nowrap");
    			attr(tr1, "class", "");
    			attr(span0, "class", "");
    			attr(span1, "class", "");
    			attr(span2, "class", "");
    			attr(span2, "contenteditable", "true");
    			attr(td8, "class", "p-2 text-center whitespace-nowrap");
    			attr(td8, "colspan", "2");
    			attr(td9, "class", "p-2 text-right whitespace-nowrap");
    			attr(tr2, "class", "");
    			attr(td10, "class", "p-2 text-center whitespace-nowrap");
    			attr(td10, "colspan", "2");
    			attr(td11, "class", "p-2 text-right");
    			attr(td11, "contenteditable", "true");
    			attr(tr3, "class", "");
    			attr(td12, "class", "p-2 text-center whitespace-nowrap");
    			attr(td12, "colspan", "2");
    			attr(td13, "class", "p-2 text-right whitespace-nowrap");
    			attr(tr4, "class", "");
    			attr(tfoot, "class", "");
    			attr(table, "class", "w-full my-3");
    			attr(h33, "class", "border-b-2 border-green-400 text-green-400 pb-1 mb-1");
    			attr(h21, "class", "text-xl mb-2");
    			attr(h21, "contenteditable", "true");
    			if (/*q*/ ctx[1].vendorName === void 0) add_render_callback(() => /*h21_input_handler*/ ctx[34].call(h21));
    			attr(p5, "class", "pl-3 mb-2");
    			attr(p5, "contenteditable", "true");
    			if (/*q*/ ctx[1].vendorId === void 0) add_render_callback(() => /*p5_input_handler*/ ctx[35].call(p5));
    			attr(p6, "class", "pl-3 mb-2");
    			attr(p6, "contenteditable", "true");
    			if (/*q*/ ctx[1].vendorAddress === void 0) add_render_callback(() => /*p6_input_handler*/ ctx[36].call(p6));
    			attr(div22, "class", "");
    			attr(h34, "class", "border-b-2 border-green-400 text-green-400 pb-1 mb-1");
    			attr(p7, "class", "pl-3 mb-3");
    			attr(p7, "contenteditable", "true");
    			if (/*q*/ ctx[1].note === void 0) add_render_callback(() => /*p7_input_handler*/ ctx[37].call(p7));
    			attr(h22, "class", "text-xl text-center text-green-400");
    			attr(div23, "class", "");
    			attr(div24, "class", "grid grid-cols-2 gap-4 pl-6 pr-2");
    			attr(div25, "class", "bg-white text-black max-w-[60rem] mx-auto print:max-w-none print:mx-0");
    			attr(button2, "class", "block duration-300 p-4 bg-green-500 text-gray-100 hover:bg-gray-100 focus:bg-gray-100 hover:text-gray-900 focus:text-gray-900");
    			attr(div26, "class", "flex flex-wrap justify-center items-center my-4 print:hidden");
    		},
    		m(target, anchor) {
    			append(document_1.head, link);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			append(div0, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			insert(target, t2, anchor);
    			insert(target, div25, anchor);
    			append(div25, div8);
    			append(div8, div2);
    			append(div2, div1);
    			append(div1, img);
    			append(div8, t3);
    			append(div8, div7);
    			append(div7, h1);
    			append(h1, t4);
    			append(div7, t5);
    			append(div7, div3);
    			append(div3, t6);
    			append(div7, t7);
    			append(div7, div4);

    			if (/*q*/ ctx[1].ref !== void 0) {
    				div4.textContent = /*q*/ ctx[1].ref;
    			}

    			append(div7, t8);
    			append(div7, div5);
    			append(div5, t9);
    			append(div7, t10);
    			append(div7, div6);

    			if (/*q*/ ctx[1].date !== void 0) {
    				div6.textContent = /*q*/ ctx[1].date;
    			}

    			append(div7, t11);
    			if (if_block0) if_block0.m(div7, null);
    			append(div25, t12);
    			append(div25, div11);
    			append(div11, div9);
    			append(div9, h30);
    			append(h30, t13);
    			append(div9, t14);
    			append(div9, h20);

    			if (/*q*/ ctx[1].clientName !== void 0) {
    				h20.textContent = /*q*/ ctx[1].clientName;
    			}

    			append(div9, t15);
    			append(div9, p0);

    			if (/*q*/ ctx[1].clientId !== void 0) {
    				p0.textContent = /*q*/ ctx[1].clientId;
    			}

    			append(div9, t16);
    			append(div9, p1);

    			if (/*q*/ ctx[1].clientAddress !== void 0) {
    				p1.textContent = /*q*/ ctx[1].clientAddress;
    			}

    			append(div11, t17);
    			append(div11, div10);
    			append(div10, h31);
    			append(h31, t18);
    			append(div10, t19);
    			append(div10, p2);

    			if (/*q*/ ctx[1].paymethod !== void 0) {
    				p2.textContent = /*q*/ ctx[1].paymethod;
    			}

    			append(div10, t20);
    			append(div10, h32);
    			append(h32, t21);
    			append(div10, t22);
    			append(div10, p3);

    			if (/*q*/ ctx[1].subject !== void 0) {
    				p3.textContent = /*q*/ ctx[1].subject;
    			}

    			append(div25, t23);
    			append(div25, table);
    			append(table, thead);
    			append(thead, tr0);
    			append(tr0, td0);
    			append(td0, t24);
    			append(tr0, t25);
    			append(tr0, td1);
    			append(td1, div12);
    			append(div12, p4);
    			append(p4, t26);
    			append(div12, t27);
    			append(div12, button0);
    			append(div12, t28);
    			append(div12, button1);
    			append(tr0, t29);
    			append(tr0, td2);
    			append(td2, t30);
    			append(tr0, t31);
    			append(tr0, td3);
    			append(td3, t32);
    			append(tr0, t33);
    			append(tr0, td4);
    			append(td4, t34);
    			append(table, t35);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append(table, t36);
    			append(table, tfoot);
    			append(tfoot, tr1);
    			append(tr1, td5);
    			append(td5, div21);
    			append(div21, div16);
    			append(div16, div13);
    			append(div13, t37);
    			append(div16, t38);
    			append(div16, div14);
    			append(div16, t39);
    			append(div16, div15);
    			append(div21, t40);
    			append(div21, div20);
    			append(div20, div17);
    			append(div17, t41);
    			append(div20, t42);
    			append(div20, div18);
    			append(div20, t43);
    			append(div20, div19);
    			append(tr1, t44);
    			append(tr1, td6);
    			append(td6, t45);
    			append(tr1, t46);
    			append(tr1, td7);
    			append(td7, t47);
    			append(tfoot, t48);
    			append(tfoot, tr2);
    			append(tr2, td8);
    			append(td8, span0);
    			append(span0, t49);
    			append(td8, t50);
    			append(td8, span1);
    			append(td8, t51);
    			append(td8, span2);
    			append(span2, t52);
    			append(tr2, t53);
    			append(tr2, td9);
    			append(td9, t54);
    			append(tfoot, t55);
    			if (if_block1) if_block1.m(tfoot, null);
    			append(tfoot, t56);
    			append(tfoot, tr3);
    			append(tr3, td10);
    			append(td10, t57);
    			append(tr3, t58);
    			append(tr3, td11);
    			append(td11, t59);
    			append(tfoot, t60);
    			append(tfoot, tr4);
    			append(tr4, td12);
    			append(td12, t61);
    			append(tr4, t62);
    			append(tr4, td13);
    			append(td13, t63);
    			append(div25, t64);
    			append(div25, div24);
    			append(div24, div22);
    			append(div22, h33);
    			append(h33, t65);
    			append(div22, t66);
    			append(div22, h21);

    			if (/*q*/ ctx[1].vendorName !== void 0) {
    				h21.textContent = /*q*/ ctx[1].vendorName;
    			}

    			append(div22, t67);
    			append(div22, p5);

    			if (/*q*/ ctx[1].vendorId !== void 0) {
    				p5.textContent = /*q*/ ctx[1].vendorId;
    			}

    			append(div22, t68);
    			append(div22, p6);

    			if (/*q*/ ctx[1].vendorAddress !== void 0) {
    				p6.textContent = /*q*/ ctx[1].vendorAddress;
    			}

    			append(div24, t69);
    			append(div24, div23);
    			append(div23, h34);
    			append(h34, t70);
    			append(div23, t71);
    			append(div23, p7);

    			if (/*q*/ ctx[1].note !== void 0) {
    				p7.textContent = /*q*/ ctx[1].note;
    			}

    			append(div23, t72);
    			append(div23, h22);
    			append(h22, t73);
    			insert(target, t74, anchor);
    			insert(target, div26, anchor);
    			append(div26, button2);

    			if (!mounted) {
    				dispose = [
    					listen(div4, "input", /*div4_input_handler*/ ctx[10]),
    					listen(div6, "input", /*div6_input_handler*/ ctx[11]),
    					listen(h20, "input", /*h20_input_handler*/ ctx[13]),
    					listen(p0, "input", /*p0_input_handler*/ ctx[14]),
    					listen(p1, "input", /*p1_input_handler*/ ctx[15]),
    					listen(p2, "input", /*p2_input_handler*/ ctx[16]),
    					listen(p3, "input", /*p3_input_handler*/ ctx[17]),
    					listen(button0, "click", /*addItem*/ ctx[6]),
    					listen(button1, "click", /*removeItem*/ ctx[7]),
    					listen(span2, "focus", /*focus_handler_2*/ ctx[25]),
    					listen(span2, "input", /*input_handler_2*/ ctx[26]),
    					listen(span2, "blur", /*blur_handler_2*/ ctx[27]),
    					listen(td11, "focus", /*focus_handler_4*/ ctx[31]),
    					listen(td11, "input", /*input_handler_4*/ ctx[32]),
    					listen(td11, "blur", /*blur_handler_4*/ ctx[33]),
    					listen(h21, "input", /*h21_input_handler*/ ctx[34]),
    					listen(p5, "input", /*p5_input_handler*/ ctx[35]),
    					listen(p6, "input", /*p6_input_handler*/ ctx[36]),
    					listen(p7, "input", /*p7_input_handler*/ ctx[37]),
    					listen(button2, "click", /*click_handler_2*/ ctx[38])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*data, q*/ 3 && link_href_value !== (link_href_value = /*data*/ ctx[0][/*q*/ ctx[1].lang]['font-link'])) {
    				attr(link, "href", link_href_value);
    			}

    			if (dirty[0] & /*q, data*/ 3) {
    				each_value_2 = Object.keys(/*data*/ ctx[0]);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each0_lookup, div0, destroy_block, create_each_block_2, t1, get_each_context_2);
    			}

    			if (dirty[0] & /*q, data*/ 3) {
    				each_value_1 = Object.keys(/*data*/ ctx[0][/*q*/ ctx[1].lang].label);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_1, each1_lookup, div0, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty[0] & /*q*/ 2 && !src_url_equal(img.src, img_src_value = /*q*/ ctx[1].vendorLogo)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*l*/ 4 && t4_value !== (t4_value = /*l*/ ctx[2].title + "")) set_data(t4, t4_value);
    			if (dirty[0] & /*l*/ 4 && t6_value !== (t6_value = /*l*/ ctx[2].ref + "")) set_data(t6, t6_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].ref !== div4.textContent) {
    				div4.textContent = /*q*/ ctx[1].ref;
    			}

    			if (dirty[0] & /*l*/ 4 && t9_value !== (t9_value = /*l*/ ctx[2].date + "")) set_data(t9, t9_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].date !== div6.textContent) {
    				div6.textContent = /*q*/ ctx[1].date;
    			}

    			if (/*q*/ ctx[1].doc !== 'receipt') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div7, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*l*/ 4 && t13_value !== (t13_value = /*l*/ ctx[2].client + "")) set_data(t13, t13_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].clientName !== h20.textContent) {
    				h20.textContent = /*q*/ ctx[1].clientName;
    			}

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].clientId !== p0.textContent) {
    				p0.textContent = /*q*/ ctx[1].clientId;
    			}

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].clientAddress !== p1.textContent) {
    				p1.textContent = /*q*/ ctx[1].clientAddress;
    			}

    			if (dirty[0] & /*l*/ 4 && t18_value !== (t18_value = /*l*/ ctx[2].paymethod + "")) set_data(t18, t18_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].paymethod !== p2.textContent) {
    				p2.textContent = /*q*/ ctx[1].paymethod;
    			}

    			if (dirty[0] & /*l*/ 4 && t21_value !== (t21_value = /*l*/ ctx[2].subject + "")) set_data(t21, t21_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].subject !== p3.textContent) {
    				p3.textContent = /*q*/ ctx[1].subject;
    			}

    			if (dirty[0] & /*l*/ 4 && t24_value !== (t24_value = /*l*/ ctx[2].itemNo + "")) set_data(t24, t24_value);
    			if (dirty[0] & /*l*/ 4 && t26_value !== (t26_value = /*l*/ ctx[2].itemDesc + "")) set_data(t26, t26_value);
    			if (dirty[0] & /*l*/ 4 && t30_value !== (t30_value = /*l*/ ctx[2].itemPrice + "")) set_data(t30, t30_value);
    			if (dirty[0] & /*l*/ 4 && t32_value !== (t32_value = /*l*/ ctx[2].itemQty + "")) set_data(t32, t32_value);
    			if (dirty[0] & /*l*/ 4 && t34_value !== (t34_value = /*l*/ ctx[2].itemAmount + "")) set_data(t34, t34_value);

    			if (dirty[0] & /*price, q, qty*/ 26) {
    				each_value = /*q*/ ctx[1].itemDesc;
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_2, 1, ctx, each_value, each2_lookup, tbody, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty[0] & /*l*/ 4 && t37_value !== (t37_value = /*l*/ ctx[2].vendorSign + "")) set_data(t37, t37_value);
    			if (dirty[0] & /*l*/ 4 && t41_value !== (t41_value = /*l*/ ctx[2].clientSign + "")) set_data(t41, t41_value);

    			if (dirty[0] & /*q*/ 2 && td5_rowspan_value !== (td5_rowspan_value = /*q*/ ctx[1].doc === 'receipt' ? 5 : 4)) {
    				attr(td5, "rowspan", td5_rowspan_value);
    			}

    			if (dirty[0] & /*l*/ 4 && t45_value !== (t45_value = /*l*/ ctx[2].totalAmount + "")) set_data(t45, t45_value);
    			if (dirty[0] & /*q*/ 2 && t47_value !== (t47_value = /*price*/ ctx[3](/*q*/ ctx[1].totalAmount) + "")) set_data(t47, t47_value);
    			if (dirty[0] & /*l*/ 4 && t49_value !== (t49_value = /*l*/ ctx[2].totalVat + "")) set_data(t49, t49_value);
    			if (dirty[0] & /*q*/ 2 && t52_value !== (t52_value = /*rate*/ ctx[5](/*q*/ ctx[1].vatRate) + "")) set_data(t52, t52_value);
    			if (dirty[0] & /*q*/ 2 && t54_value !== (t54_value = /*price*/ ctx[3](/*q*/ ctx[1].totalVat) + "")) set_data(t54, t54_value);

    			if (/*q*/ ctx[1].doc === 'receipt') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(tfoot, t56);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*l*/ 4 && t57_value !== (t57_value = /*l*/ ctx[2].totalAdjust + "")) set_data(t57, t57_value);
    			if (dirty[0] & /*q*/ 2 && t59_value !== (t59_value = /*price*/ ctx[3](/*q*/ ctx[1].totalAdjust) + "")) set_data(t59, t59_value);
    			if (dirty[0] & /*l*/ 4 && t61_value !== (t61_value = /*l*/ ctx[2].totalFinal + "")) set_data(t61, t61_value);
    			if (dirty[0] & /*q*/ 2 && t63_value !== (t63_value = /*price*/ ctx[3](/*q*/ ctx[1].totalFinal) + "")) set_data(t63, t63_value);
    			if (dirty[0] & /*l*/ 4 && t65_value !== (t65_value = /*l*/ ctx[2].vendor + "")) set_data(t65, t65_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].vendorName !== h21.textContent) {
    				h21.textContent = /*q*/ ctx[1].vendorName;
    			}

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].vendorId !== p5.textContent) {
    				p5.textContent = /*q*/ ctx[1].vendorId;
    			}

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].vendorAddress !== p6.textContent) {
    				p6.textContent = /*q*/ ctx[1].vendorAddress;
    			}

    			if (dirty[0] & /*l*/ 4 && t70_value !== (t70_value = /*l*/ ctx[2].note + "")) set_data(t70, t70_value);

    			if (dirty[0] & /*q*/ 2 && /*q*/ ctx[1].note !== p7.textContent) {
    				p7.textContent = /*q*/ ctx[1].note;
    			}

    			if (dirty[0] & /*l*/ 4 && t73_value !== (t73_value = /*l*/ ctx[2].thankMessage + "")) set_data(t73, t73_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			if (detaching) detach(t2);
    			if (detaching) detach(div25);
    			if (if_block0) if_block0.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
    			if (detaching) detach(t74);
    			if (detaching) detach(div26);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { data } = $$props;
    	let l = data[""].label[""];
    	let q = data[""].q;

    	const price = number => {
    		number = Number(number);

    		if (number === 0 || isNaN(number)) {
    			return "";
    		}

    		return `${q.currency} ${number.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`;
    	};

    	const qty = number => {
    		number = Number(number);

    		if (number === 0 || isNaN(number)) {
    			return "";
    		}

    		return number;
    	};

    	const rate = rate => {
    		rate = Number(rate) * 100;

    		if (!Number.isInteger(rate)) {
    			rate = rate.toFixed(2);
    		}

    		return `${rate} %`;
    	};

    	const addItem = () => {
    		q.itemDesc.push("");
    		q.itemPrice.push("");
    		q.itemQty.push("");
    		$$invalidate(1, q);
    	};

    	const removeItem = () => {
    		q.itemDesc.pop();
    		q.itemPrice.pop();
    		q.itemQty.pop();
    		$$invalidate(1, q);
    	};

    	onMount(() => {
    		const s = new URLSearchParams(location.search);
    		let obj = q;

    		Object.keys(q).forEach(key => {
    			const values = s.getAll(key);

    			if (values.length > 0) {
    				if (Array.isArray(q[key])) {
    					obj[key] = values;
    					return;
    				}

    				obj[key] = values[0];
    			}
    		});

    		$$invalidate(1, q = { ...data[q.lang].q, ...obj });
    	});

    	const click_handler = lng => {
    		$$invalidate(1, q.lang = lng, q);
    	};

    	const click_handler_1 = dc => {
    		$$invalidate(1, q.doc = dc, q);
    	};

    	function div4_input_handler() {
    		q.ref = this.textContent;
    		$$invalidate(1, q);
    	}

    	function div6_input_handler() {
    		q.date = this.textContent;
    		$$invalidate(1, q);
    	}

    	function div1_input_handler() {
    		q.duedate = this.textContent;
    		$$invalidate(1, q);
    	}

    	function h20_input_handler() {
    		q.clientName = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p0_input_handler() {
    		q.clientId = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p1_input_handler() {
    		q.clientAddress = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p2_input_handler() {
    		q.paymethod = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p3_input_handler() {
    		q.subject = this.textContent;
    		$$invalidate(1, q);
    	}

    	function td1_input_handler(i) {
    		q.itemDesc[i] = this.textContent;
    		$$invalidate(1, q);
    	}

    	const focus_handler = (i, e) => e.target.textContent = q.itemPrice[i];
    	const input_handler = (i, e) => $$invalidate(1, q.itemPrice[i] = e.target.textContent, q);
    	const blur_handler = (i, e) => e.target.textContent = price(q.itemPrice[i]);
    	const focus_handler_1 = (i, e) => e.target.textContent = q.itemQty[i];
    	const input_handler_1 = (i, e) => $$invalidate(1, q.itemQty[i] = e.target.textContent, q);
    	const blur_handler_1 = (i, e) => e.target.textContent = qty(q.itemQty[i]);
    	const focus_handler_2 = e => e.target.textContent = q.vatRate;
    	const input_handler_2 = e => $$invalidate(1, q.vatRate = e.target.textContent, q);
    	const blur_handler_2 = e => e.target.textContent = rate(q.vatRate);
    	const focus_handler_3 = e => e.target.textContent = q.whtRate;
    	const input_handler_3 = e => $$invalidate(1, q.whtRate = e.target.textContent, q);
    	const blur_handler_3 = e => e.target.textContent = rate(q.whtRate);
    	const focus_handler_4 = e => e.target.textContent = q.totalAdjust;
    	const input_handler_4 = e => $$invalidate(1, q.totalAdjust = e.target.textContent, q);
    	const blur_handler_4 = e => e.target.textContent = price(q.totalAdjust);

    	function h21_input_handler() {
    		q.vendorName = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p5_input_handler() {
    		q.vendorId = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p6_input_handler() {
    		q.vendorAddress = this.textContent;
    		$$invalidate(1, q);
    	}

    	function p7_input_handler() {
    		q.note = this.textContent;
    		$$invalidate(1, q);
    	}

    	const click_handler_2 = () => window.print();

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			$$invalidate(
    				1,
    				q.itemAmount = q.itemPrice.map((pr, i) => {
    					const num = Number(pr) * Number(q.itemQty[i]);
    					return num ? num : "";
    				}),
    				q
    			);
    		}

    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			$$invalidate(
    				1,
    				q.totalAmount = q.itemAmount.reduce(
    					(a, b) => {
    						const num = Number(a) + Number(b);
    						return num ? num : "";
    					},
    					0
    				),
    				q
    			);
    		}

    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			$$invalidate(1, q.totalVat = Number(q.totalAmount) * Number(q.vatRate), q);
    		}

    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			$$invalidate(1, q.totalWht = Number(q.totalAmount) * Number(q.whtRate), q);
    		}

    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			$$invalidate(1, q.totalFinal = Number(q.totalAmount) + Number(q.totalVat) + Number(q.totalWht) + Number(q.totalAdjust), q);
    		}

    		if ($$self.$$.dirty[0] & /*data, q*/ 3) {
    			{
    				document.body.style = data[q.lang]["font-style"];
    			}
    		}

    		if ($$self.$$.dirty[0] & /*q*/ 2) {
    			{

    				Object.keys(q).forEach(key => {
    					const values = q[key];

    					if (values) {
    						if (Array.isArray(values)) {
    							values.forEach(value => {
    							});

    							return;
    						}
    					}
    				});
    			}
    		}

    		if ($$self.$$.dirty[0] & /*data, q*/ 3) {
    			$$invalidate(2, l = {
    				...data[q.lang].label[""],
    				...data[q.lang].label[q.doc]
    			});
    		}
    	};

    	return [
    		data,
    		q,
    		l,
    		price,
    		qty,
    		rate,
    		addItem,
    		removeItem,
    		click_handler,
    		click_handler_1,
    		div4_input_handler,
    		div6_input_handler,
    		div1_input_handler,
    		h20_input_handler,
    		p0_input_handler,
    		p1_input_handler,
    		p2_input_handler,
    		p3_input_handler,
    		td1_input_handler,
    		focus_handler,
    		input_handler,
    		blur_handler,
    		focus_handler_1,
    		input_handler_1,
    		blur_handler_1,
    		focus_handler_2,
    		input_handler_2,
    		blur_handler_2,
    		focus_handler_3,
    		input_handler_3,
    		blur_handler_3,
    		focus_handler_4,
    		input_handler_4,
    		blur_handler_4,
    		h21_input_handler,
    		p5_input_handler,
    		p6_input_handler,
    		p7_input_handler,
    		click_handler_2
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { data: 0 }, null, [-1, -1]);
    	}
    }

    let data = {
    	"": {
    		"font-link":
    			"https://fonts.googleapis.com/css2?family=Titillium+Web&display=swap",
    		"font-style": "font-family: 'Titillium Web', sans-serif;",
    		label: {
    			"": {
    				title: "Invoice",
    				ref: "No",
    				date: "Date",
    				duedate: "Due Date",
    				vendor: "Vendor",
    				client: "Bill to",
    				paymethod: "Payment",
    				subject: "Project",
    				itemNo: "No",
    				itemDesc: "Description",
    				itemPrice: "Price",
    				itemQty: "Qty",
    				itemAmount: "Amount",
    				totalAmount: "Subtotal",
    				totalVat: "Vat",
    				totalWht: "Tax withheld",
    				totalAdjust: "Adjust",
    				totalFinal: "Pay Amount",
    				note: "Note",
    				vendorSign: "Vendor Signature",
    				clientSign: "Client Signature",
    				thankMessage: "Thank You"
    			},
    			quotation: {
    				title: "Quotation",
    				duedate: "Offer Until",
    				client: "Offer to"
    			},
    			receipt: {
    				title: "Receipt",
    				client: "Received from",
    				totalFinal: "Paid Amount",
    				vendor: "Receiver",
    				vendorSign: "Receiver Signature"
    			},
    			"tax-invoice": {
    				title: "Tax Invoice"
    			}
    		},
    		q: {
    			lang: "",
    			doc: "",
    			currency: "$",
    			vendorLogo: "",
    			ref: Math.random().toString().slice(2, 10),
    			date: new Date().toLocaleDateString(undefined),
    			duedate: "",
    			vendorName: "Vendor Name",
    			vendorId: "Register",
    			vendorAddress: "Address",
    			clientName: "Client Name",
    			clientId: "Register",
    			clientAddress: "Address",
    			paymethod: "",
    			subject: "",
    			itemDesc: ["", "", "", "", "", ""],
    			itemPrice: ["", "", "", "", "", ""],
    			itemQty: ["", "", "", "", "", ""],
    			vatRate: "0.05",
    			whtRate: "0",
    			totalAdjust: "",
    			note: ""
    		}
    	},

    	th: {
    		"font-link": "https://fonts.googleapis.com/css2?family=Athiti&display=swap",
    		"font-style": "font-family: 'Athiti', sans-serif;",
    		label: {
    			"": {
    				title: "ใบแจ้งหนี้",
    				ref: "เลขที่",
    				date: "วันที่",
    				duedate: "ชำระภายใน",
    				vendor: "ผู้ขาย",
    				client: "ส่งถึง",
    				paymethod: "วิธีชำระเงิน",
    				subject: "งาน",
    				itemNo: "#",
    				itemDesc: "รายการ",
    				itemPrice: "ราคา",
    				itemQty: "จำนวน",
    				itemAmount: "จำนวนเงิน",
    				totalAmount: "รวม",
    				totalVat: "ภาษีมูลค่าเพิ่ม",
    				totalWht: "หัก ณ ที่จ่าย",
    				totalAdjust: "ปรับปรุง",
    				totalFinal: "ยอดชำระ",
    				note: "หมายเหตุ",
    				vendorSign: "ลายเซ็นผู้ขาย",
    				clientSign: "ลายเซ็นผู้ซื้อ",
    				thankMessage: ""
    			},
    			quotation: {
    				title: "ใบเสนอราคา",
    				duedate: "สั่งซื้อก่อนวันที่",
    				client: "ส่งถึง"
    			},
    			receipt: {
    				title: "ใบเสร็จรับเงิน",
    				client: "รับเงินจาก",
    				totalFinal: "ยอดชำระ",
    				vendorSign: "ลายเซ็นผู้รับเงิน",
    				vendor: "ผู้รับเงิน"
    			},
    			"tax-invoice": {
    				title: "ใบกำกับภาษี"
    			}
    		},
    		q: {
    			lang: "th",
    			doc: "",
    			currency: "฿",
    			vendorLogo: "",
    			ref: Math.random().toString().slice(2, 10),
    			date: new Date().toLocaleDateString("th"),
    			duedate: "",
    			vendorName: "ชื่อผู้ขาย",
    			vendorId: "เลขประจำตัว",
    			vendorAddress: "ที่อยู่",
    			clientName: "ชื่อลูกค้า",
    			clientId: "เลขประจำตัว",
    			clientAddress: "ที่อยู่",
    			paymethod: "",
    			subject: "",
    			itemDesc: ["", "", "", "", "", ""],
    			itemPrice: ["", "", "", "", "", ""],
    			itemQty: ["", "", "", "", "", ""],
    			vatRate: "0.07",
    			whtRate: "0",
    			totalAdjust: "",
    			note: ""
    		}
    	}
    };

    const app = new App({
    	target: document.getElementById("_app"),
    	props: {
    		data
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
