/**
 * Owen Gallagher
 * 2021-11-30
 */

const current_script = document.currentScript
const INPUT_FILE = 0
const INPUT_FORM = 1

const D3_DSV_URL = 'https://cdn.jsdelivr.net/npm/d3-dsv@3'

let USE_WP_HOST_URL = true
const WP_HOST_URL = 'https://wordsearch.dreamhosters.com'
const DEPENDENCIES_URL = '/webpage_dependencies.html'
const WORDSEARCH_COMPONENT_URL = '/wordsearch_webcomponent.html?version=0.37.2'
const WORDSEARCH_CORE_URL = '/wordsearch_generator.js'
const WORDSEARCH_LOG_URL = '/temp_js_logger.js'
const DEFAULT_WORDSEARCH_CONTAINERS_SELECTOR = '.wordsearch-container'
const WORDSEARCH_CONTAINERS_PARENT_SELECTOR = `${DEFAULT_WORDSEARCH_CONTAINERS_SELECTOR}s`

const REM_MIN = 5

const ESCAPE_CHAR = {
	'b': '\b',
	'f': '\f',
	'n': '\n',
	'r': '\r',
	't': '\t',
	'v': '\v',
	'\'': '\'',
	'"': '"',
	'\\': '\\'
}

// whitespace vars
let cell_padx = 16
let cell_padx_min = 0
let cell_padx_max = cell_padx * 2

// fontsize vars
let cell_font = rem_to_px(2.25)
let font_min = 8
let font_max = cell_font * 2.5
let answer_font = rem_to_px(1.5) / cell_font

const SHARE_URL_CHARS_CHOICES = ['none', 'all', 'answers']

const SHARE_URL_QUERY_KEY_WSCOUNT = 'wscount'
const SHARE_URL_QUERY_KEY_WSID_PREFIX = 'wsid_'
const SHARE_URL_QUERY_KEY_WSCONFIG_PREFIX = 'wscfg_'
const SHARE_URL_QUERY_KEY_WSWHITESPACE_PREFIX = 'wsws_'
const SHARE_URL_QUERY_KEY_WSFONTSIZE_PREFIX = 'wsfs_'

const CSS_CLASS_WORDSEARCH_CONFIG = 'wordsearch-config'
const CSS_CLASS_WORDSEARCH_INPUT_METHODS = 'wordsearch-input-methods'
const CSS_CLASS_WORDSEARCH_WHITESPACE_CONTROL = 'whitespace-control'
const CSS_CLASS_WORDSEARCH_FONTSIZE_CONTROL = 'font-size-control'
const CSS_CLASS_WORD_CLUES_SHOW_BUTTON = 'show-word-clues'
const CSS_CLASS_SHARE_URL_BUTTON = 'wordsearch-share-url'
const CSS_CLASS_COPY_SHARE_URL_BUTTON = 'copy-share-url'
const CSS_CLASS_SHARE_URL_TEXT = 'share-url-out'
const CSS_CLASS_SHARE_URL_OTHER_WORDSEARCHES = 'share-url-other-wordsearches'
const CSS_CLASS_SHARE_URL_SOLVE_PROGRESS = 'share-url-solve-progress'
const CSS_CLASS_SHARE_URL_CHARS_PREFIX = 'share-url-chars'

const CSS_CLASS_PRINT = 'printable'
const CSS_CLASS_EDIT = 'editing'
const CSS_CLASS_SHARE_URL_ONLY = 'share-url-only'
const CSS_CLASS_SHARE_URL = 'sharing-url'

let alphabets

// global vars corresponding to each wordsearch generator component by id
let wordsearch_input_type = {}
let wordsearch_use_words_file = {}
let wordsearch_is_random_subset = {}
let wordsearch_is_editing = {}
let wordsearch_sharing = {}
let wordsearch_global = {}
// TODO rename to wordsearch_words_file
let wordsearch_word_clues = {}
let wordsearch_description_json = {}

let endpoint_cells = []

let wordsearch_webpage_promise = new Promise(function(resolve, reject) {
	// update whether to use host in url
	let use_host_attr = $(current_script).attr('data-use-host')
	if (use_host_attr === 'false') {
		USE_WP_HOST_URL = false
	}
	console.log(`DEBUG set use-host=${USE_WP_HOST_URL}`)
	
	Promise.all([
		// external/peripheral dependencies
		new Promise(function(resolve_ext, reject_ext) {
			let url = USE_WP_HOST_URL
				? `${WP_HOST_URL}${DEPENDENCIES_URL}`
				: DEPENDENCIES_URL
	
			$.ajax({
				method: 'GET',
				url: url,
				dataType: 'html',
				success: function(dependencies_html) {
					console.log(`DEBUG loaded wordsearch dependencies html of length ${dependencies_html.length}`)
					$('head').append(dependencies_html)
					resolve_ext()
				},
				error: function(err) {
					console.log(`ERROR failed to get dependencies at ${url}`)
					reject_ext()
				}
			})
		}),
		
		// logging script
		new Promise(function(resolve_log) {
			let url = USE_WP_HOST_URL
				? `${WP_HOST_URL}${WORDSEARCH_LOG_URL}`
				: WORDSEARCH_LOG_URL
			
			$.ajax({
				method: 'GET',
				url: url,
				dataType: 'script',
				cache: false,
				success: function() {
					// normally this happens on window.load, but that event happened already
					TempLogger.init_webpage_console()
					
					// init logging
					TempLogger.config({
						level: 'debug',
						level_gui: 'warning',
						with_timestamp: false,
						caller_name: 'wordsearch_webpage',
						with_lineno: true,
						parse_level_prefix: true,
						with_level: true,
						with_always_level_name: false
					})
					.then(() => {
						console.log(`INFO configured temp logger. level = ${
							TempLogger.LEVEL_TO_STR[TempLogger.root.level]
						}`)
						resolve_log()
					})
				},
				error: function(err) {
					console.log('ERROR failed to fetch logging lib')
					resolve_log()
				}
			})
		}),
		
		// core script
		new Promise(function(resolve_core, reject_core) {
			let url = USE_WP_HOST_URL
				? `${WP_HOST_URL}${WORDSEARCH_CORE_URL}`
				: WORDSEARCH_CORE_URL
			
			$.ajax({
				method: 'GET',
				url: url,
				dataType: 'script',
				cache: false,
				success: function() {
					ext_js_dependencies()
					wordsearch_webpage_main()
					.then(resolve_core)
				},
				error: function(err) {
					console.log('ERROR failed to fetch wordsearch generator')
					reject_core()
				}
			})
		})
	])
	.then(resolve)
	.catch(reject)
})

// load wordsearch web component and resolve the html as a string
let wordsearch_component_promise = new Promise(function(resolve, reject) {
	let url = USE_WP_HOST_URL
		? `${WP_HOST_URL}${WORDSEARCH_COMPONENT_URL}`
		: WORDSEARCH_COMPONENT_URL
	
	$.ajax({
		method: 'GET',
		url: url,
		dataType: 'html',
		cache: false,
		success: function(component_html) {
			resolve(component_html)
		},
		error: function(err) {
			console.log(`ERROR failed to get wordsearch web component at ${url}`)
			reject()
		}
	})
})

window.addEventListener('load', function(e) {
	wordsearch_webpage_promise
	.then(
		function() {
			console.log('INFO wordsearch load passed')
			
			return Promise.resolve()
		},
		function(err) {
			if (err) {
				console.log(err)
			}
	
			$('body').append(
				`<div class="wordsearch-component-error">
					Failed to fetch wordsearch component dependencies
				</div>`
			)
			
			return Promise.reject()
		}
	)

	add_wordsearch_container_btn()
})

function ext_js_dependencies() {
	return new Promise(function(resolve, reject) {
		let url = D3_DSV_URL
		$.getScript(url)
		.done(function() {
			// alias d3 as dsv to match used variable in core
			dsv = d3
			delete d3
			resolve()
		})
		.fail(function() {
			console.log('ERROR failed to load d3-dsv frontend dsv parser library')
			reject()
		})
	})
}

function wordsearch_webpage_main() {
	console.log('DEBUG wordsearch_webpage_main')
	let p = WordsearchGenerator.get_alphabet_aliases()
	.catch(function(err) {
		if (err) {
			console.log(err)
			console.log(`ERROR failed to load alphabet options`)
		}
	})
	.then(function(alphabet_aliases) {
		alphabets = alphabet_aliases
	})
	.then(function() {
		return wordsearch_component_promise
	})
	.catch(function(err) {
		if (err) {
			console.log(err)
		}
		
		$('body').append(
			`<div class="wordsearch-component-error">Failed to fetch wordsearch component</div>`
		)
	})
	.then(function(wordsearch_html) {
		// get attributes from script tag
		// unsure why referencing document.currentScript here returns null
		let script_jq = $(current_script)
		
		let wordsearch_containers_selector = script_jq.attr('data-containers')
		if (wordsearch_containers_selector == undefined) {
			wordsearch_containers_selector = DEFAULT_WORDSEARCH_CONTAINERS_SELECTOR
		}
		console.log(`INFO wordsearch containers selector = ${wordsearch_containers_selector}`)
		
		delete script_jq

		// check for saved wordsearches in url query
		let url = new URL(window.location.href)
		console.log(`debug url = ${url.toString()}`)
		if (url.searchParams.has(SHARE_URL_QUERY_KEY_WSCOUNT)) {
			let url_ws_count = parseInt(url.searchParams.get(SHARE_URL_QUERY_KEY_WSCOUNT))
			console.log(`info loading ${url_ws_count} wordsearches from the url query string`)

			// remove any initial wordsearch containers
			$(wordsearch_containers_selector).remove()
			
			// remove initial decoration around wordsearch containers
			$(WORDSEARCH_CONTAINERS_PARENT_SELECTOR).empty()

			// create loaded containers for each wordsearch as described in the url query params
			let promises = []
			for (let idx = 0; idx < url_ws_count; idx++) {
				let ws_id = url.searchParams.get(`${SHARE_URL_QUERY_KEY_WSID_PREFIX}${idx}`)
				let ws_config_str = url.searchParams.get(`${SHARE_URL_QUERY_KEY_WSCONFIG_PREFIX}${idx}`)
				let ws_whitespace_str = url.searchParams.get(`${SHARE_URL_QUERY_KEY_WSWHITESPACE_PREFIX}${idx}`)
				if (ws_whitespace_str != null) {
					ws_whitespace_str = parseFloat(ws_whitespace_str)
				}
				let ws_fontsize_str = url.searchParams.get(`${SHARE_URL_QUERY_KEY_WSFONTSIZE_PREFIX}${idx}`)
				if (ws_fontsize_str != null) {
					ws_fontsize_str = parseFloat(ws_fontsize_str)
				}
				
				promises.push(
					WordsearchGenerator.import_config_url_query_param(ws_config_str)
					.then((wordsearch) => {
						add_wordsearch_container(
							wordsearch_html,
							undefined,
							ws_id, 
							wordsearch,
							ws_whitespace_str,
							ws_fontsize_str
						)
					})
				)
			}

			return Promise.all(promises)
		}
		else {
			// load example config files into each container
			ex_cfg_file_main()

			// load wordsearch components into each container
			return $(wordsearch_containers_selector).each(function(idx) {
				load_child_wordsearch_generator($(this), wordsearch_html)
			})
			.promise()
		}
	})
	
	return p
}

/**
 * 
 * @param {JQuery} parent_jq 
 * @param {String} wordsearch_html 
 * @param {String} wordsearch_id Index or unique identifier string.
 * @param {WordsearchGenerator} wordsearch 
 * @param {Number} whitespace
 * @param {Number} fontsize
 * 
 * @returns {Number} Wordsearch id.
 */
function load_child_wordsearch_generator(
	parent_jq,
	wordsearch_html,
	wordsearch_id=undefined,
	wordsearch=undefined,
	whitespace=undefined,
	fontsize=undefined
) {
	// load component
	let wordsearch_jq = $(wordsearch_html)
	
	// uniquely identify
	if (wordsearch_id == undefined) {
		wordsearch_id = `wordsearch-component-${new Date().toISOString()}`
		.replaceAll(':','-')
		.replaceAll('.','-')
		wordsearch_jq.attr('id', wordsearch_id)
	}
	else {
		wordsearch_jq.attr('id', wordsearch_id)
	}

	console.log(`DEBUG load wordsearch generator component ${wordsearch_id}`)
	
	// append to container
	parent_jq.append(wordsearch_jq)
	
	if (wordsearch == undefined) {
		set_wordsearch_input_type(wordsearch_id, INPUT_FILE)
	}
	else {
		set_wordsearch_input_type(wordsearch_id, INPUT_FORM)
	}
	
	set_wordsearch_is_random_subset(wordsearch_id, false)
	
	// handle input choice
	wordsearch_jq.find('.wordsearch-input-file').click(function() {
		set_wordsearch_input_type(wordsearch_id, INPUT_FILE)
	})
	wordsearch_jq.find('.wordsearch-input-form').click(function() {
		set_wordsearch_input_type(wordsearch_id, INPUT_FORM)
	})
	
	// handle alphabet choices list
	let langs_jq = wordsearch_jq.find('.languages')
	
	// show on focus
	let lang_jq = wordsearch_jq.find('.language')
	.on('focusin', function() {
		// show alphabets
		langs_jq.show()
	})
	.on('focusout', function(event) {
		// potentially allow a language option to accept a click event before disappearing
		setTimeout(() => {
			langs_jq.hide()
		}, 150)
	})
	
	const alphabet_option_template = 
	`<div class="language-option px-2">
		<span class="alphabet-key"></span>
		<span class="alphabet-aliases"></span>
	</div>`
	
	// display alphabets in list
	for (let alphabet_key in alphabets) {
		// console.log(`debug loaded alphabet:\n${JSON.stringify(alphabet_key)}`)
		let alphabet_jq = $(alphabet_option_template)
		.attr('data-alphabet-key', alphabet_key)
		
		alphabet_jq.find('.alphabet-key').html(alphabet_key)
		alphabet_jq.find('.alphabet-aliases').html(alphabets[alphabet_key].join(' '))
		
		langs_jq.append(alphabet_jq)
		
		// handle alphabet click
		alphabet_jq.on('click', function(event) {
			on_alphabet_option_click(wordsearch_id, event)
		})
	}
	
	// charset display
	wordsearch_jq.find('.charset')
	// show on focus
	.on('focusin', function() {
		// show charsets
		wordsearch_jq.find('.charset-options').show()
	})
	// hide on unfocus
	.on('focusout', function() {
		// potentially allow a charset to accept click before disappearing
		setTimeout(() => {
			wordsearch_jq.find('.charset-options').hide()
		}, 150)
	})
	
	// prob dist display
	wordsearch_jq.find('.prob-dist')
	// show on focus
	.on('focusin', function() {
		// show prob dists
		wordsearch_jq.find('.prob-dist-options').show()
	})
	// hide on unfocus
	.on('focusout', function() {
		// potentially allow a prob dist to accept click before disappearing
		setTimeout(() => {
			wordsearch_jq.find('.prob-dist-options').hide()
		}, 150)
	})
	
	// load initial charsets and prob dists
	load_charsets_prob_dists(wordsearch_id, lang_jq.val())
	
	// set default wordsearch size
	wordsearch_jq.find('.size-width')
	.attr('placeholder', WordsearchGenerator.WIDTH_DEFAULT)
	wordsearch_jq.find('.size-height')
	.attr('placeholder', WordsearchGenerator.WIDTH_DEFAULT)
	
	// handle description file upload
	wordsearch_jq.find('.wordsearch-file').on('change', function() {
		let filereader = new FileReader()
		filereader.onload = function() {
			wordsearch_description_json[wordsearch_id] = filereader.result
			on_wordsearch_config_file(wordsearch_id, wordsearch_description_json[wordsearch_id])
		}
		filereader.readAsText($(this).prop('files')[0])
	})
	
	// handle words file upload
	wordsearch_jq.find('.words-file').on('change', function() {
		let filereader = new FileReader()
		filereader.onload = function() {
			wordsearch_word_clues[wordsearch_id] = filereader.result
		}
		filereader.readAsText($(this).prop('files')[0])
	})
	
	// handle word-clue delim input
	wordsearch_jq.find('.words-file-delim')
	.attr('placeholder', WordsearchGenerator.WORD_CLUE_DELIM)
	
	// handle whitespace controls
	wordsearch_jq.find('.whitespace-label').html(cell_padx)
	wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_WHITESPACE_CONTROL}`)
	.attr('min', cell_padx_min)
	.attr('max', cell_padx_max)
	.attr('step', (cell_padx_max - cell_padx_min) / 20)
	.val(cell_padx)
	.on('input', function() {
		set_wordsearch_whitespace(wordsearch_id)
	})
	
	// handle font size controls
	wordsearch_jq.find('.font-size-label').html(cell_font)
	wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_FONTSIZE_CONTROL}`)
	.attr('min', font_min)
	.attr('max', font_max)
	.attr('step', (font_max - font_min) / 20)
	.val(cell_font)
	.on('input', function() {
		set_wordsearch_fontsize(wordsearch_id)
	})
	
	// handle reload button
	wordsearch_jq.find('.wordsearch-reload').click(function() {
		// console.log(`DEBUG wordsearch reload button ${wordsearch_id}`)
		switch (wordsearch_input_type[wordsearch_id]) {
			case INPUT_FILE:
				let description_json = wordsearch_description_json[wordsearch_id]
				let config = description_json == undefined 
					? undefined
					: JSON.parse(description_json)
				
				if (config != undefined) {
					// use random subset count input if enabled
					if (wordsearch_is_random_subset[wordsearch_id]) {
						let ui_subset_length = wordsearch_jq.find('.random-subset-count').val()
						if (ui_subset_length !== '') {
							ui_subset_length = parseInt(ui_subset_length)
							// console.log(`DEBUG ui subset length = ${ui_subset_length}`)
							config['random_subset'] = ui_subset_length
						}
					}
					
					on_wordsearch_config_file(wordsearch_id, config)
				}
				else {
					console.log(`ERROR wordsearch config file not defined`)
				}
				
				break
	
			case INPUT_FORM:
				on_wordsearch_config_form(wordsearch_id)
				break
		}
		
		// reset whitespace control
		wordsearch_jq.find('.whitespace-label').html(cell_padx)
		wordsearch_jq.find('.whitespace-control').val(cell_padx)
		
		// reset font size control
		wordsearch_jq.find('.font-size-label').html(cell_font)
		wordsearch_jq.find('.font-size-control').val(cell_font)
	})

	// handle word-clue add button click
	wordsearch_jq.find('.add-word-clue').click(function() {
		add_word_clue(wordsearch_id)
	})

	// handle word-clue show/hide button click
	wordsearch_jq.find(`.${CSS_CLASS_WORD_CLUES_SHOW_BUTTON}`)
	.attr('data-on', true)
	.click(function() {
		let show = !is_on($(this))
		set_show_word_clues(show)
	})
	
	// handle words file button click
	wordsearch_jq.find('.words-file-button').click(function() {
		set_wordsearch_use_words_file(wordsearch_id, !is_on($(this)))
	})
	
	// handle random subset button click
	wordsearch_jq.find('.random-subset').click(function() {
		set_wordsearch_is_random_subset(wordsearch_id, !is_on($(this)))
	})
	
	// handle print button
	wordsearch_jq.find('.wordsearch-print').click(function() {
		// clean wordsearch
		wordsearch_jq.find('.wordsearch').addClass(CSS_CLASS_PRINT)

		// hide config
		wordsearch_jq.find('.wordsearch-config').addClass(CSS_CLASS_PRINT)

		// hide answers header
		wordsearch_jq.find('.answers-header').addClass(CSS_CLASS_PRINT)

		// hide answers
		wordsearch_jq.find('.ws-word').addClass(CSS_CLASS_PRINT)

		// show print-only
		wordsearch_jq.find('.printscreen-only').addClass(CSS_CLASS_PRINT)
	})
	
	// handle screen button
	wordsearch_jq.find('.wordsearch-screen').click(function() {
		// mark wordsearch
		wordsearch_jq.find('.wordsearch').removeClass(CSS_CLASS_PRINT)

		// show config
		wordsearch_jq.find('.wordsearch-config').removeClass(CSS_CLASS_PRINT)

		// show answers header
		wordsearch_jq.find('.answers-header').removeClass(CSS_CLASS_PRINT)

		// show answers
		wordsearch_jq.find('.ws-word').removeClass(CSS_CLASS_PRINT)

		// hide print-only
		wordsearch_jq.find('.printscreen-only').removeClass(CSS_CLASS_PRINT)
	})
	
	// handle edit mode button
	wordsearch_is_editing[wordsearch_id] = false
	wordsearch_jq.find('.wordsearch-edit').click(function() {
		set_wordsearch_is_editing(wordsearch_id, true)
	})
	
	// handle edit exit button
	wordsearch_jq.find('.wordsearch-edit-exit').click(function() {		
		set_wordsearch_is_editing(wordsearch_id, false)
	})

	// TODO introduce typing to wordsearch_sharing elements
	wordsearch_sharing[wordsearch_id] = {
		is_sharing: false,
		include_others: false,
		solve_progress: false,
		share_chars: 'none'
	}

	// handle share url button
	wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_BUTTON}`).click(function() {
		set_wordsearch_is_sharing(wordsearch_id)
	})

	// handle share url form controls
	wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_OTHER_WORDSEARCHES}`).click(function() {
		const include_others_jq = $(this)
		let include_others = !is_on(include_others_jq)
		console.log(`debug include other wordsearches in share url = ${include_others}`)
		
		wordsearch_sharing[wordsearch_id].include_others = include_others

		include_others_jq
		.attr('data-on', include_others)
		.addClass(include_others ? 'btn-secondary' : 'btn-outline-secondary')
		.removeClass(include_others ? 'btn-outline-secondary' : 'btn-secondary')

		update_share_url(wordsearch_id)
	})
	wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_SOLVE_PROGRESS}`).click(function() {
		const solve_progress_jq = $(this)
		let solve_progress = !is_on(solve_progress_jq)
		console.log(`debug include solve progress in share url = ${solve_progress}`)

		wordsearch_sharing[wordsearch_id].solve_progress = solve_progress

		solve_progress_jq
		.attr('data-on', solve_progress)
		.addClass(solve_progress ? 'btn-secondary' : 'btn-outline-secondary')
		.removeClass(solve_progress ? 'btn-outline-secondary' : 'btn-secondary')

		update_share_url(wordsearch_id)
	})
	for (let choice of SHARE_URL_CHARS_CHOICES) {
		wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_CHARS_PREFIX}-${choice}`).click(function() {
			set_wordsearch_share_url_chars(wordsearch_id, choice)
		})
	}

	// handle copy share url button
	wordsearch_jq.find(`.${CSS_CLASS_COPY_SHARE_URL_BUTTON}`).click(function() {
		let share_url_jq = wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_TEXT}`)
		share_url_jq.select()

		// copy url to clipboard
		let share_url = share_url_jq.val()
		navigator.clipboard.writeText(share_url)
		.then(function() {
			console.log(`INFO copied wordsearch share url to the clipboard:\n${share_url}`)
		})

		// display confirmation
		let copy_btn = $(this)
		copy_btn.attr('data-on', 'true')
		setTimeout(
			function() {
				copy_btn.attr('data-on', 'false')
			}, 
			1000
		)
	})
	
	// handle export config button
	wordsearch_jq.find('.wordsearch-export-config').click(function() {
		if (wordsearch_global[wordsearch_id] != undefined) {
			let wordsearch_json_encoded = btoa(unescape(encodeURIComponent(
				JSON.stringify(wordsearch_global[wordsearch_id].export_config())
			)))
			console.log(`DEBUG encoded export = ${wordsearch_json_encoded}`)
	
			wordsearch_jq.find('.wordsearch-export-link')
			.prop('href',`data:application/json;base64,${wordsearch_json_encoded}`)
			.prop('download',`wordsearch_cfg_${new Date().toISOString()}.json`)
			[0].click()
		}
	})

	// load wordsearch instance
	if (wordsearch != undefined && wordsearch instanceof WordsearchGenerator) {
		on_wordsearch_instance(wordsearch_id, wordsearch, false, whitespace, fontsize)
	}
	
	return wordsearch_id
}

function add_wordsearch_container_btn() {
	console.log('add_wordsearch_container_btn()')

	wordsearch_component_promise.then((wordsearch_html) => {
		console.log('handle add-wordsearch-container button')

		$('#add-wordsearch-container').click(function() {
			console.log('DEBUG add-wordsearch-container.click')
			
			add_wordsearch_container(wordsearch_html)
		})
	})
}

/**
 * 
 * @param {String} wordsearch_html
 * @param {String} parent_selector
 * @param {String} wordsearch_id
 * @param {WordsearchGenerator} wordsearch
 * @param {Number} whitespace
 * @param {Number} fontsize
 * 
 * @returns {Promise}
 */
function add_wordsearch_container(
	wordsearch_html,
	parent_selector=WORDSEARCH_CONTAINERS_PARENT_SELECTOR, 
	wordsearch_id=undefined, 
	wordsearch=undefined,
	whitespace=undefined,
	fontsize=undefined
) {
	// add new wordsearch container
	let header_jq = $(
		`<div class="mb-2 row">
			<div class="h2 col">Wordsearch generator</div>
			<div class="col-auto">
				<button class="btn btn-danger rm-wordsearch-container">
					Remove wordsearch generator
				</button>
			</div>
		</div>`
	)
	let container_jq = $(
		`<section class="wordsearch-container mb-3"></section>`
	)
	let hr_jq = $(`<hr/>`)
	
	$(parent_selector)
	.append(header_jq)
	.append(container_jq)
	.append(hr_jq)
	
	// load child wordsearch generator in new wordsearch container
	wordsearch_id = load_child_wordsearch_generator(
		container_jq, 
		wordsearch_html,
		wordsearch_id, 
		wordsearch,
		whitespace,
		fontsize
	)
	
	let wordsearch_jq = $(`#${wordsearch_id}`)

	// handle remove button
	header_jq.find('.rm-wordsearch-container').click(function() {
		hr_jq.remove()
		container_jq.remove()
		header_jq.remove()

		delete wordsearch_global[wordsearch_id]
	})

	// enable example cfg file button
	ex_cfg_file_main(wordsearch_jq)
	
	return Promise.resolve()
}

// TODO rename to set_wordsearch_config_type
function set_wordsearch_input_type(wordsearch_cmp_id, input_type) {
	// console.log(`DEBUG ${wordsearch_cmp_id} set input type=${input_type}`)
	let wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
	wordsearch_input_type[wordsearch_cmp_id] = input_type
	
	switch (input_type) {
		case INPUT_FILE:
			wordsearch_cmp.find('.wordsearch-input-file').removeClass('btn-outline-secondary').addClass('btn-secondary')
			wordsearch_cmp.find('.wordsearch-input-form').removeClass('btn-secondary').addClass('btn-outline-secondary')
			wordsearch_cmp.find('.wordsearch-files').show()
			wordsearch_cmp.find('.wordsearch-form').hide()
			break
			
		case INPUT_FORM:
			wordsearch_cmp.find('.wordsearch-input-file').removeClass('btn-secondary').addClass('btn-outline-secondary')
			wordsearch_cmp.find('.wordsearch-input-form').removeClass('btn-outline-secondary').addClass('btn-secondary')
			wordsearch_cmp.find('.wordsearch-files').hide()
			wordsearch_cmp.find('.wordsearch-form').show()
			break
	}
}

function set_wordsearch_use_words_file(wordsearch_cmp_id, use_file) {
	let wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
	wordsearch_use_words_file[wordsearch_cmp_id] = use_file
	
	// update button data
	wordsearch_cmp.find('.words-file-button')
	.attr('data-on', use_file)
	.addClass(use_file ? 'btn-secondary' : 'btn-outline-secondary')
	.removeClass(use_file ? 'btn-outline-secondary' : 'btn-secondary')
	
	// update words file input
	wordsearch_cmp.find('.words-file')
	.prop('disabled', !use_file)
	
	// update word-clue delimiter input
	wordsearch_cmp.find('.words-file-delim')
	.prop('disabled', !use_file)
	
	// update word-clues section
	const wcs_jq = wordsearch_cmp.find('.word-clues-section')
	if (use_file) {
		wcs_jq.addClass('d-none')
	}
	else {
		wcs_jq.removeClass('d-none')
	}
	
	// update word-clues inputs
	wcs_jq.find('.word-clue input')
	.prop('disabled', use_file)
}

function set_wordsearch_is_random_subset(wordsearch_cmp_id, is_random, subset_length) {
	let wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
	wordsearch_is_random_subset[wordsearch_cmp_id] = is_random
	
	// update button data
	wordsearch_cmp.find('.random-subset')
	.attr('data-on', is_random)
	.addClass(is_random ? 'btn-secondary' : 'btn-outline-secondary')
	.removeClass(is_random ? 'btn-outline-secondary' : 'btn-secondary')
	
	// update count input
	if (is_random) {
		wordsearch_cmp.find('.random-subset-count')
		.prop('disabled', false)
		.val(subset_length)
	}
	else {
		wordsearch_cmp.find('.random-subset-count')
		.prop('disabled', true)
	}
}

function set_wordsearch_whitespace(wordsearch_id, whitespace=undefined) {
	let wordsearch_jq = $(`#${wordsearch_id}`)
	
	let new_cell_padx 
	if (whitespace == undefined) {
		new_cell_padx = parseFloat(
			wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_WHITESPACE_CONTROL}`).val()
		)
	}
	else {
		new_cell_padx = whitespace
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_WHITESPACE_CONTROL}`).val(whitespace)
	}
	
	wordsearch_jq.find('.ws-cell')
	.css('padding-left', new_cell_padx)
	.css('padding-right', new_cell_padx)
	
	wordsearch_jq.find('.whitespace-label').html(Math.round(new_cell_padx))
}

function set_wordsearch_fontsize(wordsearch_id, fontsize=undefined) {
	let wordsearch_jq = $(`#${wordsearch_id}`)
	
	let new_cell_font 
	if (fontsize == undefined) {
		new_cell_font = parseFloat(
			wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_FONTSIZE_CONTROL}`).val()
		)
	}
	else {
		new_cell_font = fontsize
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_FONTSIZE_CONTROL}`).val(fontsize)
	}
	
	wordsearch_jq.find('.ws-cell').css('fontSize', new_cell_font)
	wordsearch_jq.find('.ws-answer').css('fontSize', new_cell_font * answer_font)
	
	wordsearch_jq.find('.font-size-label').html(Math.round(new_cell_font))
}

function set_wordsearch_is_editing(wordsearch_id, is_editing) {
	wordsearch_is_editing[wordsearch_id] = is_editing
	
	const wordsearch_jq = $(`#${wordsearch_id}`)
	
	if (is_editing) {
		// enable wordsearch editing styles
		wordsearch_jq.find('.wordsearch').addClass(CSS_CLASS_EDIT)
		
		// hide config
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_CONFIG}`).addClass(CSS_CLASS_PRINT)
		
		// show edit-only
		wordsearch_jq.find('.edit-only').addClass(CSS_CLASS_EDIT)
	}
	else {
		// disable wordsearch editing styles
		wordsearch_jq.find('.wordsearch').removeClass(CSS_CLASS_EDIT)
		
		// show config
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_CONFIG}`).removeClass(CSS_CLASS_PRINT)
		
		// hide edit-only
		wordsearch_jq.find('.edit-only').removeClass(CSS_CLASS_EDIT)
	}
}

function set_wordsearch_is_sharing(wordsearch_id) {
	is_sharing = !wordsearch_sharing[wordsearch_id].is_sharing
	wordsearch_sharing[wordsearch_id].is_sharing = is_sharing

	const wordsearch_jq = $(`#${wordsearch_id}`)

	if (is_sharing) {
		// hide config input methods
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_CONFIG}`).addClass(CSS_CLASS_SHARE_URL)

		// show share-url-only
		wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_ONLY}`).addClass(CSS_CLASS_SHARE_URL)
		wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_BUTTON}`).addClass(CSS_CLASS_SHARE_URL)
	}
	else {
		// show config input methods
		wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_CONFIG}`).removeClass(CSS_CLASS_SHARE_URL)

		// hide share-url-only
		wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_ONLY}`).removeClass(CSS_CLASS_SHARE_URL)
		wordsearch_jq.find(`.${CSS_CLASS_SHARE_URL_BUTTON}`).removeClass(CSS_CLASS_SHARE_URL)
	}

	update_share_url(wordsearch_id)
}

/**
 * 
 * @param {String} wordsearch_id 
 * @param {String} choice 
 */
function set_wordsearch_share_url_chars(wordsearch_id, choice) {
	const choice_idx = SHARE_URL_CHARS_CHOICES.indexOf(choice)

	if (choice_idx !== -1) {
		// update share url chars widgets
		$(`.${CSS_CLASS_SHARE_URL_CHARS_PREFIX}-${choice}`)
		.attr('data-on', true)
		.removeClass('btn-outline-secondary')
		.addClass('btn-secondary')

		const others = new Array(...SHARE_URL_CHARS_CHOICES)
		others.splice(choice_idx, 1)

		for (let other of others) {
			$(`.${CSS_CLASS_SHARE_URL_CHARS_PREFIX}-${other}`)
			.attr('data-on', false)
			.removeClass('btn-secondary')
			.addClass('btn-outline-secondary')
		}

		// update options
		wordsearch_sharing[wordsearch_id].share_chars = choice

		// update share url
		update_share_url(wordsearch_id)
	}
	else {
		console.log(`error invalid url share chars choice ${choice}; not in ${SHARE_URL_CHARS_CHOICES}`)
	}
}

function set_show_word_clues(show) {
	const word_clues_show_jq = $(`.${CSS_CLASS_WORD_CLUES_SHOW_BUTTON}`)

	word_clues_show_jq
	.attr('data-on', show)
	.find('.show-hide').text(
		show ? 'hide' : 'show'
	)
	
	if (show) {
		$('.word-clues').removeClass('d-none')
	}
	else {
		$('.word-clues').addClass('d-none')
	}
}

/**
 * 
 * @param {String} wordsearch_id 
 * 
 * @returns {URL} Share url with wordsearch[es] included.
 */
function update_share_url(wordsearch_id) {
	let share_url_options = wordsearch_sharing[wordsearch_id]

	// collect wordsearches to include in url
	let wordsearches = []
	if (share_url_options.include_others) {
		for (let wsid of Object.keys(wordsearch_global)) {
			wordsearches.push({
				id: wsid,
				wordsearch: wordsearch_global[wsid]
			})
		}
	}
	else {
		wordsearches.push({
			id: wordsearch_id,
			wordsearch: wordsearch_global[wordsearch_id]
		})
	}

	// compile share url
	let share_url = new URL(WP_HOST_URL)
	share_url.searchParams.set(SHARE_URL_QUERY_KEY_WSCOUNT, new Number(wordsearches.length).toString())

	let idx = 0
	for (let wordsearch_kv of wordsearches) {
		let id = wordsearch_kv.id
		let wordsearch = wordsearch_kv.wordsearch
		let wordsearch_jq = $(`#${wordsearch_id}`)

		share_url.searchParams.set(
			`${SHARE_URL_QUERY_KEY_WSID_PREFIX}${idx}`,
			id
		)

		share_url.searchParams.set(
			`${SHARE_URL_QUERY_KEY_WSCONFIG_PREFIX}${idx}`,
			wordsearch.export_config_url_query_param(share_url_options.share_chars)
		)
		
		/* TODO make whitespace and fontsize optional */
		share_url.searchParams.set(
			`${SHARE_URL_QUERY_KEY_WSWHITESPACE_PREFIX}${idx}`,
			wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_WHITESPACE_CONTROL}`).val()
		)
		share_url.searchParams.set(
			`${SHARE_URL_QUERY_KEY_WSFONTSIZE_PREFIX}${idx}`,
			wordsearch_jq.find(`.${CSS_CLASS_WORDSEARCH_FONTSIZE_CONTROL}`).val()
		)
		
		idx++
	}

	let share_url_str = share_url.toString()
	console.log(
		`debug updated share url with ${wordsearches.length} wordsearches of length ${share_url_str.length}`
	)

	// update active share url form
	$(`#${wordsearch_id}`).find(`.${CSS_CLASS_SHARE_URL_TEXT}`).val(share_url_str)

	return share_url
}

/**
 * 
 * @param {String} wordsearch_id 
 * @param {WordsearchGenerator} wordsearch 
 * 
 * @returns {Promise}
 */
function on_wordsearch_instance(wordsearch_id, wordsearch, show_word_clues=false, whitespace=undefined, fontsize=undefined) {
	console.log(`info load wordsearch from generator instance ${wordsearch_id}`)

	const wordsearch_jq = $(`#${wordsearch_id}`)

	// show wordsearch
	return wordsearch.init_promise
	.then(() => {
		return display_wordsearch(wordsearch, wordsearch_id)
	})
	.then(() => {
		// update input widgets to match wordsearch contents
		
		// TODO title
		// alphabet
		wordsearch_jq.find('.language').val(wordsearch.language)

		// TODO charset
		// TODO prob dist

		// random subset
		set_wordsearch_is_random_subset(wordsearch_id, wordsearch.random_subset)

		// words clues
		set_show_word_clues(show_word_clues)
		let word, clue
		for (let i=0; i<wordsearch.words.length; i++) {
			word = wordsearch.words[i]
			clue = wordsearch.clues[i]

			add_word_clue(wordsearch_id, word, clue)
		}

		// TODO dimensions
		wordsearch_jq.find('.size-width').val(wordsearch.width)
		wordsearch_jq.find('.size-height').val(wordsearch.height)

		// whitespace
		if (whitespace != undefined) {
			set_wordsearch_whitespace(wordsearch_id, whitespace)
		}
		
		// font size
		if (fontsize != undefined) {
			set_wordsearch_fontsize(wordsearch_id, fontsize)
		}
	})
}

function on_wordsearch_config_file(wordsearch_id, wordsearch_json) {
	if (wordsearch_json != undefined) {
		console.log(`INFO ${wordsearch_id}:on_wordsearch_input_file`)
		let description = typeof wordsearch_json === 'string' 
			? JSON.parse(wordsearch_json)
			: wordsearch_json
		console.log(JSON.stringify(description, undefined, 2))
		
		let random_subset = description[WordsearchGenerator.KEY_RANDOM_SUBSET]
		
		let use_words_file = wordsearch_use_words_file[wordsearch_id]
		
		// get word-clue delimiter from config file
		let words_delim = description[WordsearchGenerator.KEY_WORDS_DELIM]
		if (words_delim == undefined || use_words_file) {
			// get word-clue delimiter from delimiter input
			words_delim = $(`#${wordsearch_id} .words-file-delim`).val()
			
			if (words_delim == '') {
				// use default
				words_delim = WordsearchGenerator.WORD_CLUE_DELIM
			}
		}
		
		new Promise(function(resolve) {
			let word_clues = wordsearch_word_clues[wordsearch_id]
			if (!use_words_file || word_clues == undefined) {
				// use word-clues embedded in config file
				word_clues = description[WordsearchGenerator.KEY_WORDS]
				
				/* 
				Frontend constructor will attempt to parse string as words file data, but in this
				case, a string is a dsv file path that is not usable in frontend env directly.
				*/
				if (typeof word_clues == 'string') {
					console.log(
						`WARNING unable to access words file ${
							word_clues
						} in webpage via path directly. Use the dsv file input instead.`
					)
					word_clues = undefined
				}
				
				resolve(word_clues)
			}
			else {
				// parse word-clues from dsv file
				parse_wordsearch_words_file(word_clues, words_delim)
				.then(resolve)
				.catch(() => {
					resolve(undefined)
				})
			}
		})
		.then((word_clues) => {
			console.log('DEBUG init new wordsearch generator')
			let wordsearch = new WordsearchGenerator(
				description[WordsearchGenerator.KEY_LANGUAGE],
				description[WordsearchGenerator.KEY_CASE],
				description[WordsearchGenerator.KEY_SIZE],
				word_clues,
				random_subset,
				description[WordsearchGenerator.KEY_TITLE],
				words_delim,
				description[WordsearchGenerator.KEY_SELECTED_CHARSET],
				description[WordsearchGenerator.KEY_SELECTED_PROB_DIST]
			)
		
			if (random_subset != undefined) {
				set_wordsearch_is_random_subset(wordsearch_id, true, random_subset)
			}
			
			return wordsearch.init_promise.then(() => {
				return Promise.resolve(wordsearch)
			})
		})
		.then((wordsearch) => {
			display_wordsearch(wordsearch, wordsearch_id)
		})
	}
	else {
		console.log('ERROR wordsearch description not defined')
	}
}

function on_wordsearch_config_form(wordsearch_id) {
	console.log(`${wordsearch_id}:on_wordsearch_input_form`)
	let wordsearch_cmp = $(`#${wordsearch_id}`)
	
	try {
		let width_str = wordsearch_cmp.find('.size-width').val().trim()
		if (width_str == '') {
			width_str = (WordsearchGenerator.WIDTH_DEFAULT).toString()
		}
		let height_str = wordsearch_cmp.find('.size-height').val().trim()
		if (height_str == '') {
			height_str = (WordsearchGenerator.WIDTH_DEFAULT).toString()
		}
		
		// load initial config
		let wordsearch = new WordsearchGenerator(
			wordsearch_cmp.find('.language').val().trim().toLowerCase(),
			wordsearch_cmp.find('.case').val().trim().toLowerCase(),
			[
				parseInt(width_str),
				parseInt(height_str)
			],
			// words
			undefined,
			// random subset
			undefined,
			// title
			undefined,
			// word-clue delimiter
			undefined,
			// charset
			wordsearch_cmp.find('.charset').val(),
			// prob dist
			wordsearch_cmp.find('.prob-dist').val()
		)
		
		wordsearch.init_promise.then(() => {
			new Promise(function(res_words) {
				let use_words_file = wordsearch_use_words_file[wordsearch_id]
				let word_clues = wordsearch_word_clues[wordsearch_id]
				
				if (use_words_file && word_clues != undefined) {					
					// use words file
					console.log(`DEBUG use word-clues from words file ${word_clues}`)
					
					// get delimiter
					let words_delim = wordsearch_cmp.find('.words-file-delim').val()
					if (words_delim == '') {
						// default delimiter
						words_delim = WordsearchGenerator.WORD_CLUE_DELIM
					}
					
					// parse words file
					parse_wordsearch_words_file(word_clues, words_delim)
					.then(res_words)
					.catch(() => {
						res_words(undefined)
					})
				}
				else {
					// use word-clue rows in form
					word_clues = []
					
					wordsearch_cmp.find('.word-clue').each(function(idx) {
						// read word and clue from row
						let rowjq = $(this)
				
						let word = rowjq.find('.word-clue-word').val()
						let clue = rowjq.find('.word-clue-clue').val()
						if (word !== '') {
							if (clue === '') {
								clue = word
							}
					
							console.log(`DEBUG word:clue ${word}:${clue}`)
							word_clues.push([word, clue])
						}
					})
					.promise()
					.done(() => {
						res_words(word_clues)
					})
				}
			})
			.then(function(word_clues) {
				load_word_clues(wordsearch_id, wordsearch, word_clues)
				
				display_wordsearch(wordsearch, wordsearch_id)
			})
		})
	}
	catch (err) {
		console.log(err)
		console.log(`ERROR wordsearch config is invalid: ${err}`)
	}
}

function parse_wordsearch_words_file(words_dsv, words_delim) {
	return WordsearchGenerator.load_words_file_dsv(
		words_dsv,
		unescape_backslashes(words_delim)
	)
}

/**
 * Load a word-clue array into the specified wordsearch.
 *
 * @param {String} wordsearch_cmp_id .
 * @param {WordsearchGenerator} wordsearch .
 * @param {Array} word_clues Array of either word-clue arrays or delimited strings.
 *
 * @returns Resolves undefined.
 * @type Promise
 */
function load_word_clues(wordsearch_cmp_id, wordsearch, word_clues) {
	let wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
	
	if (wordsearch_is_random_subset) {
		console.log('DEBUG is random subset')
		
		let subset_count_jq = $(`#${wordsearch_cmp_id}`).find('.random-subset-count')
		if (subset_count_jq.val() == '') {
			subset_count_jq.val(word_clues.length)
		}
		
		// show answer count in random subset input
		let subset_length = parseInt(subset_count_jq.val())
		
		// get random subset of words and clues
		if (subset_length < word_clues.length && subset_length > 0) {
			let subset_idx = new Set()
			while (subset_idx.size < subset_length) {
				subset_idx.add(Math.floor(Math.random() * word_clues.length))
			}
			
			subset_idx = new Array(...subset_idx)
			let subset = new Array(subset_length)
			for (let i=0; i < subset_idx.length; i++) {
				subset[i] = word_clues[subset_idx[i]]
			}
			
			word_clues = subset
		}
	}
	else {
		wordsearch_cmp.find('.random-subset-count').val('')
	}
	
	console.log(`DEBUG word_clues = \n${JSON.stringify(word_clues)}`)
	for (let word_clue of word_clues) {
		let array = (word_clue instanceof Array)
			// is already array
			? word_clue
			// is delimited string
			: word_clue.split(WordsearchGenerator.WORD_CLUE_DELIM)
		
		let word = array[0]
		let clue = word
		if (array.length == 2) {
			clue = array[1]
		}
		
		let word_n = WordsearchGenerator.string_to_array(word).length
		
		if (word_n <= Math.max(wordsearch.grid.length, wordsearch.grid[0].length)) {
			if (!wordsearch.add_word_clue(word,clue)) {
				console.log(`ERROR failed to find a place for ${word}`)
			}
		}
		else {
			console.log(
				`ERROR ${word} length ${word.length} longer than board width ${
					wordsearch.grid.length
				}`
			)
		}
	}
	
	return Promise.resolve()
}

/**
 *
 * @param {WordsearchGenerator} wordsearch
 * @param {String} wordsearch_cmp_id
 * 
 * @returns {Promise}
 */ 
function display_wordsearch(wordsearch, wordsearch_cmp_id) {
	return new Promise(function(res) {
		let wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
		console.log(`INFO display wordsearch in ${wordsearch_cmp_id}`)
		
		// clear endpoint_cells
		endpoint_cells = []
		
		// wordsearch element
		let wel = wordsearch_cmp.find('.wordsearch')
		.html('')
		
		// table element
		let tel = $(
			`<table></table>`
		)
		
		let y=0
		for (let row of wordsearch.grid) {
			// row element
			let rel = $(
				`<tr class="ws-row"></tr>`
			)
	
			let x=0
			for (let cell of row) {
				// cell element
				let cel = $(
					`<td class="ws-cell"
						data-x="${x}" data-y="${y}" data-char="${cell}"
						data-on="false">
						<div class="ws-cell-content d-flex flex-column justify-content-center">
							${cell}
						</div>
						<input type="text" class="ws-cell-input form-control" value="${cell}"/>
					</td>`
				)
		
				cel.click(function(e) {
					on_cell_click(wordsearch_cmp_id, cel, wordsearch, e)
				})
		
				cel.find('.ws-cell-input').on('keyup', function(e) {
					on_cell_input_key(wordsearch_cmp_id, cel, e.originalEvent)
				})
		
				rel.append(cel)
				x++
			}
	
			tel.append(rel)
			y++
		}

		wel.append(tel)

		// associate answer cells with corresponding words
		for (let word_idx of Object.keys(wordsearch.word_idx_to_point)) {
			let points = wordsearch.word_idx_to_point[word_idx]
			let a = points[0]
			let b = points[1]
			let dx = Math.sign(b.x - a.x)
			let dy = Math.sign(b.y - a.y)
	
			for (let x=a.x, y=a.y; x!=b.x+dx || y!=b.y+dy; x+=dx, y+=dy) {
				tel.find(`.ws-cell[data-x="${x}"][data-y="${y}"]`)
				.attr('data-word-idx', word_idx)
			}
		}

		display_answers(wordsearch_cmp_id, wordsearch.words, wordsearch.clues)

		// enable print view
		wordsearch_cmp.find('.wordsearch-print').prop('disabled', false)

		// enable edit mode
		wordsearch_cmp.find('.wordsearch-edit').prop('disabled', false)

		// enable share url
		wordsearch_cmp.find(`.${CSS_CLASS_SHARE_URL_BUTTON}`).prop('disabled', false)

		// enable export
		wordsearch_cmp.find('.wordsearch-export-config').prop('disabled', false)

		// update wordsearch reference
		wordsearch_global[wordsearch_cmp_id] = wordsearch
		
		res()
	})
}

function display_answers(wordsearch_cmp_id, words, clues) {
	// show answer word-clues
	let answersjq = $(`#${wordsearch_cmp_id}`).find('.answers').html('')
	
	for (let i=0; i < words.length; i++) {
		let rowjq = $(
			`<li class="ws-answer" data-word-idx="${i}">
				<span class="ws-clue">${clues[i]}</span> &rarr;
				<span class="ws-word" data-found="false">${words[i]}</span>
			</li>`
		)
		
		answersjq.append(rowjq)
	}
}

function on_cell_click(wordsearch_cmp_id, cell, wordsearch, event) {
	const wordsearch_cmp = $(`#${wordsearch_cmp_id}`)
	const shifted = event.shiftKey
	// console.log(
	// 	`DEBUG cell ${cell.attr('data-x')},${cell.attr('data-y')}=${
	// 		cell.attr('data-char')
	// 	} clicked. shifted=${event.shiftKey}`
	// )
	
	const cell_is_on = !is_on(cell)
	cell.attr('data-on', cell_is_on)
	
	if (cell_is_on) {
		let en = endpoint_cells.length
		
		if (wordsearch_is_editing[wordsearch_cmp_id]) {
			if (shifted && en == 1) {
				// add endpoints as new word
				let a = endpoint_cells[0]
				let b = cell
				let ax = parseInt(a.attr('data-x')), ay = parseInt(a.attr('data-y'))
				let bx = parseInt(b.attr('data-x')), by = parseInt(b.attr('data-y'))
				let dx = Math.sign(bx-ax), dy = Math.sign(by-ay)
				
				let wxys = []
				let new_word = []
				let new_word_idx = wordsearch.words.length
				for (let x=ax, y=ay; x!=bx+dx || y!=by+dy; x+=dx, y+=dy) {
					const word_cell = wordsearch_cmp.find(
						`.ws-cell[data-x="${x}"][data-y="${y}"]`
					)
					word_cell.attr('data-word-idx', new_word_idx)
					
					const char = word_cell.attr('data-char')
					wxys.push([char,x,y])
					new_word.push(char)
				}
				console.log(`INFO add endpoints as new word ${new_word.join('')}`)
				
				// add word to wordsearch model
				wordsearch.place_word(wxys, new_word.join(''), new_word.join(''))
				
				// refresh word-clue answers
				display_answers(wordsearch_cmp_id, wordsearch.words, wordsearch.clues)
				
				// clear endpoint_cells
				cell.attr('data-on', false)
				for (let ec of endpoint_cells) {
					ec.attr('data-on', false)
				}
				endpoint_cells = []
			}
			else {
				if (en == 1) {
					// ignore prev endpoint
					endpoint_cells[0].attr('data-on', false)
				}
				
				// set last clicked cell as first endpoint
				endpoint_cells = [cell]
				
				// activate cell input
				cell.find('.ws-cell-input')
				.focus()
				.select()
			}
		}
		else {
			if (en < 2) {
				// add to endpoint_cells
				endpoint_cells.push(cell)
				en++
			}
		
			let a = endpoint_cells[0]
			let b = en == 1
				// single char word
				? a
				// multi char word
				: endpoint_cells[1]
			
			// check endpoints against answers
			let ab = cells_to_endpoint_str(a,b)
		
			let word_idx = wordsearch.point_to_word_idx[ab]
			if (word_idx != undefined) {
				console.log(`DEBUG word ${word_idx}=${wordsearch.words[word_idx]} found`)
				a.attr('data-on',false)
				b.attr('data-on',false)
			
				// mark all word cells as found
				if (a === b) {
					a.attr('data-found',true)
				}
				else {
					let ax=parseInt(a.attr('data-x')), ay=parseInt(a.attr('data-y'))
					let bx=parseInt(b.attr('data-x')), by=parseInt(b.attr('data-y'))
					let dx=Math.sign(bx-ax), dy=Math.sign(by-ay)
			
					for (let x=ax,y=ay; x!=bx+dx || y!=by+dy; ) {
						// console.log(`.ws-cell[data-x="${x}"][data-y="${y}"]`)
						wordsearch_cmp.find(`.ws-cell[data-x="${x}"][data-y="${y}"]`)
						.attr('data-found',true)
				
						x += dx
						y += dy
					}
				}
			
				// reveal answer
				wordsearch_cmp.find(`.ws-answer[data-word-idx="${word_idx}"] > .ws-word`)
				.attr('data-found', true)
			}
			else if (en > 1) {
				// clear cells from attempt
				console.log(`DEBUG endpoints not a word`)
				for (let ec of endpoint_cells) {
					ec.attr('data-on', false)
				}
			}
		
			// clear endpoint_cells if len>=2 or single char word found
			if (en > 1 || word_idx != undefined) {
				endpoint_cells = []
			}
		}
	}
	else {
		// clear endpoint_cells
		endpoint_cells = []
	}
}

function on_cell_input_key(wordsearch_id, cell, event) {
	const key = event.code.toLowerCase()
	const shifted = event.shiftKey
	const arrow_key_prefix = 'arrow'
	
	function update_cell(random_char) {
		const injq = cell.find('.ws-cell-input')
		.blur()
		
		const wordsearch = wordsearch_global[wordsearch_id]
		
		if (random_char) {
			injq.val(wordsearch.random_cell())
		}
		
		// update cell char
		const char = injq.val()[0]
		cell.attr('data-char', char)
		cell.find('.ws-cell-content').html(char)
		
		let word_idx = cell.attr('data-word-idx')
		if (word_idx != '' && !isNaN(word_idx)) {
			word_idx = parseInt(word_idx)
			console.log(`WARNING remove answer ${wordsearch.words[word_idx]} on char overwrite`)
			// remove from wordsearch model
			wordsearch.forget_word(word_idx)
			
			// remove reference to word from html cell data attr
			const wordsearch_jq = $(`#${wordsearch_id}`)
			wordsearch_jq.find(`.ws-cell[data-word-idx="${word_idx}"]`)
			.removeAttr('data-word-idx')
			.attr('data-found', 'false')
			
			// remove from answers
			wordsearch_jq.find(`.ws-answer[data-word-idx="${word_idx}"]`)
			.remove()
		}
	}
	
	if (key.startsWith(arrow_key_prefix)) {
		const arrow = key.substring(arrow_key_prefix.length)
		// console.log(`DEBUG ws-cell-input arrow-key=${arrow}`)
		
		update_cell(shifted)
		
		// find next cell
		let x = parseInt(cell.attr('data-x'))
		let y = parseInt(cell.attr('data-y'))
		switch (arrow) {
			case 'up':
				y -= 1
				break
				
			case 'right':
				x += 1
				break
				
			case 'down':
				y += 1
				break
				
			case 'left':
				x -= 1
				break
		}
		
		// select next cell
		on_cell_click(
			wordsearch_id,
			$(`#${wordsearch_id}`).find(`.ws-cell[data-x="${x}"][data-y="${y}"]`),
			wordsearch_global[wordsearch_id],
			// mimic MouseEvent
			{
				shiftKey: false
			}
		)
	}
	else if (key == 'enter') {
		update_cell()
		
		// deselect current cell
		on_cell_click(
			wordsearch_id,
			cell,
			wordsearch_global[wordsearch_id],
			// mimic MouseEvent
			{
				shiftKey: false
			}
		)
	}
	else if (key == 'escape') {
		const injq = cell.find('.ws-cell-input')
		.blur()
		.val(cell.attr('data-char'))
		
		// deselect current cell
		on_cell_click(
			wordsearch_id,
			cell,
			wordsearch_global[wordsearch_id],
			// mimic MouseEvent
			{
				shiftKey: false
			}
		)
	}
}

/**
 * 
 * @param {String} wordsearch_id 
 * @param {String} word 
 * @param {String} clue 
 * 
 * @returns {Promise<JQuery>}
 */
function add_word_clue(wordsearch_id, word=undefined, clue=undefined) {
	console.log(`debug add ${word}=${clue} widgets to ${wordsearch_id}`)
	const wordsearch_jq = $(`#${wordsearch_id}`)

	let datetime_str = new Date().toISOString()
	let containerjq = wordsearch_jq.find('.word-clues')

	let rowjq = $(
		`<div class="row word-clue mt-1 gx-1" data-when="${datetime_str}">
			<div class="col">
				<input 
					type="text" placeholder="word" 
					class="word-clue-word form-control"
					${word === undefined ? '' : `value="${word}"`}
				/>
			</div>
			<div class="col">
				<input 
					type="text" placeholder="clue (optional)" 
					class="word-clue-clue form-control"
					${clue === undefined ? '' : `value="${clue}"`}
				/>
			</div>
			<div class="col-auto d-flex flex-column justify-content-center">
				<button 
					class="btn btn-danger word-clue-delete" 
					data-wordsearch-id="${wordsearch_id}"
					data-when="${datetime_str}"
					onclick="on_word_clue_delete_click(event)">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-dash-lg" viewBox="0 0 16 16">
						<path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/>
					</svg>
				</button>
			</div>
		</div>`
	)

	return containerjq.append(rowjq).promise()
	.then(function() {
		return rowjq
	})
}

/**
 * Handle word-clue delete button click.
 * 
 * @param {Object} event Click MouseEvent instance.
 */
function on_word_clue_delete_click(event) {
	let datetime_str = event.target.getAttribute('data-when')
	let wordsearch_cmp_id = event.target.getAttribute('data-wordsearch-id')
	// console.log(`DEBUG delete word-clue ${wordsearch_cmp_id}:${datetime_str}`)
	
	$(`#${wordsearch_cmp_id}`).find(`.word-clue[data-when="${datetime_str}"]`).remove()
}

/**
 * Handle alphabet option click.
 * 
 * @param {String} wordsearch_cmp_id
 * @param {Object} event Click MouseEvent instance.
 */
function on_alphabet_option_click(wordsearch_cmp_id, event) {
	let alphabet_option = event.target
	let alphabet_key = alphabet_option.getAttribute('data-alphabet-key')
	console.log(`info select alphabet ${alphabet_key}`)
	
	// update alphabet
	$(`#${wordsearch_cmp_id}`).find('.language').val(alphabet_key)
	
	load_charsets_prob_dists(wordsearch_cmp_id, alphabet_key)
}

function load_charsets_prob_dists(wordsearch_cmp_id, alphabet_key) {
	let wordsearch_jq = $(`#${wordsearch_cmp_id}`)
	
	// updates available charsets and prob dists lists
	WordsearchGenerator.get_alphabet(alphabet_key)
	.then(
		// pass
		(alphabet) => {
			let charsets = alphabet[WordsearchGenerator.KEY_CHARSET]
			if (charsets == undefined) {
				charsets = []
			}
			
			let prob_dists = alphabet[WordsearchGenerator.KEY_PROB_DIST]
			
			return Promise.resolve({
				charsets: charsets, 
				prob_dists: prob_dists
			})
		},
		// fail
		(err) => {
			console.log(`ERROR failed to resolve charsets, prob dists for ${alphabet_key}\n${err}`)
			return Promise.resolve({
				charsets: []
			})
		}
	)
	.then(({charsets, prob_dists}) => {
		// add default charset
		let csdefault = {}
		csdefault[WordsearchGenerator.KEY_CS_NAME] = WordsearchGenerator.CHARSET_DEFAULT
		csdefault[WordsearchGenerator.KEY_CS_DESC] = 'default character set'
		
		charsets.splice(0, 0, csdefault)
		console.log(`DEBUG loaded ${charsets.length} ${alphabet_key} charsets`)
		
		console.log(`DEBUG loaded ${prob_dists.length} ${alphabet_key} prob dists`)
		
		// update available charsets
		const charset_opt_temp = 
		`<div class="charset-option px-2">
			<span class="charset-name"></span>
			<span class="charset-description"></span>
		</div>`
		
		let charset_cont = wordsearch_jq.find('.charset-options').empty()
		for (let charset of charsets) {
			let charset_name = charset[WordsearchGenerator.KEY_CS_NAME]
			let charset_jq = $(charset_opt_temp)
			.attr('data-charset-name', charset_name)
			
			// handle prob dist assigned to charset
			let charset_pd = charset[WordsearchGenerator.KEY_PROB_DIST]
			if (charset_pd != undefined) {
				// charset has specified prob dist
				charset_pd = charset_pd[WordsearchGenerator.KEY_PD_NAME]
			}
			else if (charset_name != WordsearchGenerator.CHARSET_DEFAULT) {
				// charset has implied uniform prob dist
				charset_pd = WordsearchGenerator.PROB_DIST_UNIFORM
			}
			// else, charset is default and selects from alphabet[prob_dist]
			
			charset_jq.attr('data-prob-dist-name', charset_pd)
			
			charset_jq.find('.charset-name').html(charset_name)
			charset_jq.find('.charset-description').html(charset[WordsearchGenerator.KEY_CS_DESC])
			
			charset_cont.append(charset_jq)
			
			// handle click
			charset_jq.on('click', function(event) {
				on_charset_option_click(wordsearch_cmp_id, event)
			})
		}
		
		// select default charset
		wordsearch_jq.find('.charset')
		.val(charsets[0][WordsearchGenerator.KEY_CS_NAME])
		
		if (prob_dists == undefined || prob_dists.length == 0) {
			// select uniform prob dist and disable
			wordsearch_jq.find('.prob-dist')
			.val(WordsearchGenerator.PROB_DIST_UNIFORM)
			.attr('disabled', true)
		}
		else {
			// update available prob dists
			const pd_temp = 
			`<div class="prob-dist-option px-2">
				<span class="prob-dist-name"></span>
				<span class="prob-dist-description"></span>
			</div>`
			
			let pd_cont = wordsearch_jq.find('.prob-dist-options').empty()
			for (let pd of prob_dists) {
				let pd_jq = $(pd_temp)
				.attr('data-prob-dist-name', pd[WordsearchGenerator.KEY_PD_NAME])
			
				pd_jq.find('.prob-dist-name').html(pd[WordsearchGenerator.KEY_PD_NAME])
				pd_jq.find('.prob-dist-description').html(pd[WordsearchGenerator.KEY_PD_DESC])
			
				pd_cont.append(pd_jq)
			
				// handle click
				pd_jq.on('click', function(event) {
					on_prob_dist_option_click(wordsearch_cmp_id, event)
				})
			}
		
			// select uniform prob dist and enable
			wordsearch_jq.find('.prob-dist')
			.val(prob_dists[0][WordsearchGenerator.KEY_PD_NAME])
			.attr('disabled', false)
		}
	})
}

/**
 * Handle charset option click.
 *
 * @param {String} wordsearch_cmp_id
 * @param {Object} event Click MouseEvent instance.
 */
function on_charset_option_click(wordsearch_cmp_id, event) {
	let charset_option = event.target
	let charset_name = charset_option.getAttribute('data-charset-name')
	let wordsearch_jq = $(`#${wordsearch_cmp_id}`)
	
	// update charset val
	wordsearch_jq.find('.charset').val(charset_name)
	
	// update prob dist val
	let charset_pd = charset_option.getAttribute('data-prob-dist-name')
	if (charset_pd != null) {
		console.log(`DEBUG charset prob dist = ${charset_pd}`)
		wordsearch_jq.find('.prob-dist')
		.val(charset_pd)
		.attr('disabled', true)
	}
	else {
		wordsearch_jq.find('.prob-dist')
		.val(WordsearchGenerator.PROB_DIST_UNIFORM)
		.attr('disabled', false)
	}
}

/**
 * Handle prob dist option click.
 *
 * @param {String} wordsearch_cmp_id
 * @param {Object} event Click MouseEvent instance.
 */
function on_prob_dist_option_click(wordsearch_cmp_id, event) {
	let pd_option = event.target
	let pd_name = pd_option.getAttribute('data-prob-dist-name')
	
	// update prob dist val
	$(`#${wordsearch_cmp_id}`).find('.prob-dist').val(pd_name)
}

function cells_to_endpoint_str(a, b) {
	return (
		`${a.attr('data-x')},${a.attr('data-y')}` + 
		'-' +
		`${b.attr('data-x')},${b.attr('data-y')}`
	)
}

function is_on(jq, on_attr = 'data-on') {
	return jq.attr(on_attr) === 'true'
}

/**
 * Return rem in px.
 *
 * @param {Number} rem Number of root-ems (default is 1).
 *
 * @returns Pixel size of root font character width times given rem.
 * @type Number
 */
function rem_to_px(rem = 1) {
	let rem_px_str = $(document.documentElement).css('fontSize')
	console.log(`DEBUG rem in px = ${rem} * ${rem_px_str}`)
	return rem * parseFloat(rem_px_str)
}

function unescape_backslashes(str) {
	// parse \\. as \.
	// each item is [match, ...groups] w index property
	let escapes = str.matchAll(/\\(.)/g)
	
	let arr = [...str]
	let delta = 0
	for (let escape of escapes) {
		let char = ESCAPE_CHAR[escape[1]]
		// replace escaped escape char with escaped char
		arr.splice(escape.index + delta, 2, char)
		delta -= 1
	}
	
	return arr.join('')
}
