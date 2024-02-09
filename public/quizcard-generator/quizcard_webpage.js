const current_script = document.currentScript

const WP_HOST_URL = 'https://wordsearch.dreamhosters.com'
const DEPENDENCIES_URL = '/webpage_dependencies.html'
const QUIZGEN_COMPONENT_URL = '/quizcard-generator/quizcard_webcomponent.html?version=0.0.1'
const WORDSEARCH_LOG_URL = '/temp_js_logger.js'
const DEFAULT_QUIZGEN_CONTAINERS_SELECTOR = '.quizgen-container'
const QUIZGEN_CONTAINERS_PARENT_SELECTOR = `${DEFAULT_QUIZGEN_CONTAINERS_SELECTOR}s`

let quizcard_webpage_promise = new Promise(function(res, rej) {
    // update whether to use host in url
	let use_host_attr = current_script.getAttribute('data-use-host')
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
						caller_name: 'quizcard-webpage',
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
		})
    ])
    .then(res, rej)
})

let quizcard_component_promise = new Promise(function(res, rej) {
    let url = (
        USE_WP_HOST_URL
        ? `${WP_HOST_URL}${QUIZGEN_COMPONENT_URL}`
        : QUIZGEN_COMPONENT_URL
    )

    $.ajax({
		method: 'GET',
		url: url,
		dataType: 'html',
		cache: false,
		success: function(component_html) {
            console.log(`debug fetched quizcard component length ${component_html.length}`)
			res(component_html)
		},
		error: function(err) {
			console.log(`ERROR failed to get wordsearch web component at ${url}`)
			rej()
		}
	})
})

window.addEventListener('load', function(e) {
    quizcard_webpage_promise
    .then(
        () => {
            console.log('info quizcard-generator page load passed')
        },
        (err) => {
            if (err) {
                console.log(err)
            }

            document.getElementsByTagName('body')[0].appendChild(
                `<div class="wordsearch-component-error">
					Failed to fetch quizcard generator component dependencies
				</div>`
            )

            return Promise.reject()
        }
    )
    .then(add_quizcard_generator)
})

function add_quizcard_generator() {
    console.log('debug add_quizcard_generator()')

	quizcard_component_promise.then((quizgen_html) => {
		console.log('loaded quizcard generator component html')
		
		/**
		 * @type {HTMLElement}
		 */
        let quizgen = $(quizgen_html).get(0)

        // uniquely identify
		let quizgen_id = `qg-${new Date().getTime()}`
		quizgen.setAttribute('data-qg-id', quizgen_id)

        // append to container
        document.querySelector(DEFAULT_QUIZGEN_CONTAINERS_SELECTOR)
		.append(quizgen)

		// animate collapse icons
        quizgen.querySelectorAll('[data-bs-toggle="collapse"]')
		.forEach((collapser) => {
			collapser.addEventListener('click', quizcard_collapse_arrow_toggle)
		})
		
		// handle source text file upload
		let text_editor = quizgen.querySelector('textarea.quizgen-source-text-editor')
		quizgen.querySelector('.quizgen-source-file')
		.addEventListener('change', (change_event) => {
			quizcard_on_source_file_upload(change_event, text_editor)
		})

		// animate ordinal frequency button label
		let frequency_order_select = quizgen.querySelector('.quizgen-frequency-order-select')
		quizgen.querySelector('.quizgen-frequency-order-most')
		.addEventListener(
			'click', 
			(mouse_event) => quizcard_choose_frequency_order(mouse_event, frequency_order_select)
		)
		quizgen.querySelector('.quizgen-frequency-order-least')
		.addEventListener(
			'click', 
			(mouse_event) => quizcard_choose_frequency_order(mouse_event, frequency_order_select)
		)
		
		// react to frequency ordinal filter toggle
		quizgen.querySelector('.form-check-input')
		.addEventListener('change', function(change_event) {
			/**
			 * @type {HTMLInputElement}
			 */
			let checkbox = change_event.target
			console.log(`debug check box for ${checkbox.value} changed to ${checkbox.checked}`)
		})

		quizgen.querySelector('button.quizgen-generate-preview')
		.addEventListener('click', (_mouse_event) => {
			console.log(`debug generate-preview pressed`)
			quizcard_set_opts(quizgen_id, 3)
			.then(quizcard_generate)
		})
		quizgen.querySelector('button.quizgen-generate-full')
		.addEventListener('click', (_mouse_event) => {
			console.log(`debug generate-full pressed`)
			quizcard_set_opts(quizgen_id)
			.then(quizcard_generate)
		})
	})
}

/**
 * 
 * @param {number|undefined} limit
 */
function quizcard_set_opts(quizgen_id, limit) {
	/**
	 * Options to be passed to the quizcard generator via the intermediate webserver API.
	 */
	let opts = {
		'input-file': undefined,
		'input-file-content': undefined,
		'anki-notes-name': undefined,
		'exclude-word': undefined,
		'word-frequency-min': undefined,
		'word-frequency-first': undefined,
		'word-frequency-last': undefined,
		'word-length-min': undefined,
		'tag': undefined,
		'limit': limit
	}

	/**
	 * @type {HTMLElement}
	 */
	const quizgen = document.querySelector(`.quizgen-component[data-qg-id="${quizgen_id}"]`)
	
	return Promise.all([
		new Promise((r_if) => {
			/**
			 * @type {HTMLInputElement}
			 */
			let file_input = quizgen.querySelector('input.quizgen-source-file')
			r_if(['input-file', file_input.files[0].name])
		}),
		new Promise((r_fc) => {
			/**
			 * @type {HTMLTextAreaElement}
			 */
			let text_editor = quizgen.querySelector('textarea.quizgen-source-text-editor')
			r_fc(['input-file-content', text_editor.value])
		}),
		new Promise((r_ann) => {
			/**
			 * @type {HTMLInputElement}
			 */
			let name_input = quizgen.querySelector('input.quizgen-notes-name')
			r_ann(['anki-notes-name', name_input.value])
		}),
		new Promise((r_ew) => {
			/**
			 * @type {HTMLTextAreaElement}
			 */
			let excludes_input = quizgen.querySelector('textarea.quizgen-word-excludes')
			r_ew(['exclude-word', excludes_input.value.split('\n')])
		}),
		new Promise((r_fm) => {

			r_fm(['word-frequency-min', undefined])
		}),
		new Promise((r_ffl) => {

			r_ffl(['word-frequency-first', undefined])
		}),
		new Promise((r_wlm) => {

			r_wlm(['word-frequency-last', undefined])
		}),
		new Promise((r_t) => {

			r_t(['tag', undefined])
		})
	])
	.then((opt_entries) => {
		for (let [key, val] of opt_entries) {
			opts[key] = val
		}

		return opts
	})
}

/**
 * 
 * @param {{[key=string]: any}} opts
 */
function quizcard_generate(opts) {
	const http_method = 'post'
	const content_type = 'application/json; charset=UTF-8'

	if (opts['limit'] === undefined) {
		// preview gets first 2 notes
		$.ajax({
			type: http_method,
			url: '/quizcard-generator/api/preview',
			data: JSON.stringify(opts),
			contentType: content_type,
			/**
			 * 
			 * @param {{
			 * 	anki_notes: string[],
			 * 	anki_notes_header: string
			 * }} res 
			 */
			success: (res) => {
				console.log(JSON.stringify(res))
			},
			error: (err) => {
				console.log(`error ${err}`)
			}
		})
	}
	else {
		// generate gets download url
		$.ajax({
			type: http_method,
			url: '/quizcard-generator/api/generate',
			data: JSON.stringify(opts),
			contentType: content_type,
			/**
			 * 
			 * @param {{
			 * 	file_path: string,
			 * 	file_size: number,
			 * 	file_size_unit: string,
			 * 	file_expiry: number,
			 * 	file_expiry_unit: string
			 * }} res 
			 */
			success: (res) => {
				console.log(`info generate result = ${JSON.stringify(res, undefined, 2)}`)
				quizcard_result_download(
					res.file_path,
					res.file_size,
					res.file_size_unit
				)
			},
			error: (err) => {
				console.log(`error ${err}`)
			}
		})
	}
}

function quizcard_result_download(file_url, file_size, file_size_unit) {
	document.getElementsByClassName('quizgen-download')[0]
	.classList.remove('d-none')

	/**
	 * @type {HTMLAnchorElement}
	 */
	let anchor = document.getElementsByClassName('quizgen-download-anchor')[0]
	anchor.href = file_url
	anchor.download = ''
	anchor.innerText = file_url

	document.getElementsByClassName('quizgen-download-size')[0]
	.innerText = file_size
	
	document.getElementsByClassName('quizgen-download-size-unit')[0]
	.innerText = file_size_unit
}

/**
 * Animate the arrow for a collapse control with a bootstrap icon arrow indicator.
 * @param {MouseEvent} mouse_event 
 */
function quizcard_collapse_arrow_toggle(mouse_event) {
	console.log(`debug collapse arrow container clicked ${mouse_event.target.tagName}`)

	let collapsed = mouse_event.target.classList.contains('collapsed')

	Array.from(mouse_event.target.children).forEach((arrow_sibling) => {
		if (arrow_sibling.classList.contains('collapse-arrow')) {
			if (!collapsed) {
				// close to open
				console.log('debug collapse arrow open')
				arrow_sibling.classList.remove('bi-caret-left')
				arrow_sibling.classList.add('bi-caret-down')
			}
			else {
				// open to close
				console.log('debug collapse arrow close')
				arrow_sibling.classList.remove('bi-caret-down')
				arrow_sibling.classList.add('bi-caret-left')
			}
		}
		else {
			TempLogger.CONSOLE_METHOD['log'](arrow_sibling.classList)
		}
	})
}

/**
 * @param {HTMLTextAreaElement} text_editor
 * @param {InputEvent} change_event 
 */
function quizcard_on_source_file_upload(change_event, text_editor) {
	/**
	 * @type {HTMLInputElement}
	 */
	let file_input = change_event.target
	console.log(`info source file input changed tag=${file_input.tagName}`)

	let filereader = new FileReader()
	filereader.onload = function() {
		console.log(`info source file read complete. write to text editor`)
		text_editor.value = filereader.result
		text_editor.disabled = false
	}
	
	filereader.readAsText(file_input.files[0])
}

/**
 * 
 * @param {MouseEvent} mouse_event 
 * @param {HTMLElement} order_label 
 */
function quizcard_choose_frequency_order(mouse_event, order_label) {
	let frequency_order = mouse_event.target.innerText
	console.log(`info word frequency order ${frequency_order}`)
	order_label.innerText = frequency_order
}