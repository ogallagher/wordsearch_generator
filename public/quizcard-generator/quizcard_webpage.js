const current_script = document.currentScript

const WP_HOST_URL = 'https://wordsearch.dreamhosters.com'
const DEPENDENCIES_URL = '/webpage_dependencies.html'
const QUIZGEN_COMPONENT_URL = '/quizcard-generator/quizcard_webcomponent.html?version=0.0.1'
const WORDSEARCH_LOG_URL = '/temp_js_logger.js'
const DEFAULT_QUIZGEN_CONTAINERS_SELECTOR = '.quizgen-container'
const QUIZGEN_CONTAINERS_PARENT_SELECTOR = `${DEFAULT_QUIZGEN_CONTAINERS_SELECTOR}s`
const quizgen_frequency_order = {
	FIRST: 'common',
	LAST: 'rare'
}
const QUIZGEN_ANKI_NOTES_DELIM = '\t'
const QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE = /\"\"/g
/**
 * Anki notes column indexes. 
 * Better would be to read them from the header metadata.
 */
const quizgen_anki_fields = {
	EUID: 0,
	TYPE: 1,
	TAGS: 2,
	TEXT: 3,
	CLOZES: 4,
	SOURCE_FILE: 5,
	SOURCE_LINE: 6,
	TRANSLATIONS: 7
}

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

		quizgen.querySelector('button.quizgen-generate-preview')
		.addEventListener('click', (_mouse_event) => {
			console.log(`debug generate-preview pressed`)
			quizcard_set_opts(quizgen_id, 3)
			.then((opts) => quizcard_generate(quizgen_id, opts))
		})
		quizgen.querySelector('button.quizgen-generate-full')
		.addEventListener('click', (_mouse_event) => {
			console.log(`debug generate-full pressed`)
			quizcard_set_opts(quizgen_id, undefined)
			.then((opts) => quizcard_generate(quizgen_id, opts))
		})
	})
}

function quizcard_opt_value_normalized(value) {
	return (
		value === '' 
		|| (Array.isArray(value) && (value.length === 0 || value[0] === ''))
		|| value === undefined || value === null 
		|| value === Number.NaN
	) ? undefined : value
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
			let file_name = quizcard_opt_value_normalized(file_input.files?.item(0)?.name)
			r_if(['input-file', file_name])
		}),
		new Promise((r_fc) => {
			/**
			 * @type {HTMLTextAreaElement}
			 */
			let text_editor = quizgen.querySelector('textarea.quizgen-source-text-editor')
			r_fc(['input-file-content', quizcard_opt_value_normalized(text_editor.value)])
		}),
		new Promise((r_ann) => {
			/**
			 * @type {HTMLInputElement}
			 */
			let name_input = quizgen.querySelector('input.quizgen-notes-name')
			r_ann(['anki-notes-name', quizcard_opt_value_normalized(name_input.value)])
		}),
		new Promise((r_ew) => {
			/**
			 * @type {HTMLTextAreaElement}
			 */
			let excludes_input = quizgen.querySelector('textarea.quizgen-word-excludes')
			let excludes = quizcard_opt_value_normalized(excludes_input.value)?.split('\n')
			r_ew(['exclude-word', excludes])
		}),
		new Promise((r_fm) => {
			/**
			 * @type {HTMLInputElement}
			 */
			let frequency_min_input = quizgen.querySelector('input.quizgen-frequency-min')
			let frequency_min = quizcard_opt_value_normalized(
				parseInt(frequency_min_input.value)
			)
			r_fm(['word-frequency-min', frequency_min])
		}),
		new Promise((r_ffl) => {
			/**
			 * @type {HTMLInputElement}
			 */
			let frequency_order_enable = quizgen.querySelector('input.quizgen-frequency-order-enable')
			let opt_key = 'word-frequency-first'

			if (frequency_order_enable.checked) {
				/**
				 * @type {HTMLElement}
				 */
				let frequency_order_label = quizgen.querySelector('.quizgen-frequency-order-select')
				let frequency_order = quizcard_opt_value_normalized(frequency_order_label.innerText.trim())
				opt_key = (
					frequency_order === quizgen_frequency_order.FIRST
					? 'word-frequency-first'
					: 'word-frequency-last'
				)
				/**
				 * @type {HTMLInputElement}
				 */
				let frequency_order_limiter = quizgen.querySelector('input.quizgen-frequency-order-limit')
				let frequency_order_limit = quizcard_opt_value_normalized(
					parseInt(frequency_order_limiter.value)
				)
				r_ffl([opt_key, frequency_order_limit])
			}
			else {
				r_ffl([opt_key, undefined])
			}
		}),
		new Promise((r_wlm) => {
			const length_min_input = quizgen.querySelector('input.quizgen-word-length-min')
			let length_min = quizcard_opt_value_normalized(
				parseInt(length_min_input.value)
			)
			r_wlm(['word-length-min', length_min])
		}),
		new Promise((r_t) => {
			const tags_input = quizgen.querySelector('textarea.quizgen-note-tags')
			let tags = quizcard_opt_value_normalized(
				tags_input.value?.split(',')
			)
			r_t(['tag', tags])
		})
	])
	.then((opt_entries) => {
		for (let [key, val] of opt_entries) {
			console.log(`debug opts[${key}] = ${JSON.stringify(val)}`)
			opts[key] = val
		}

		return opts
	})
}

/**
 * 
 * @param {{[key=string]: any}} opts
 */
function quizcard_generate(quizgen_id, opts) {
	const http_method = 'post'
	const content_type = 'application/json; charset=UTF-8'

	if (opts['limit'] !== undefined) {
		console.log('info submit preview request')

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
				console.log(`info fetched notes preview of ${res.anki_notes.length} notes`)
				console.log(`debug first note\n${res.anki_notes[0]}`)
				quizcard_result_preview(quizgen_id, res.anki_notes, res.anki_notes_header)
			},
			error: (err) => {
				console.log(`error ${err}`)
			}
		})
	}
	else {
		console.log('info submit generate request')

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
					quizgen_id,
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

function quizcard_result_download(quizgen_id, file_url, file_size, file_size_unit) {
	let quizgen = document.querySelector(`.quizgen-component[data-qg-id="${quizgen_id}"]`)

	// show download
	quizgen.querySelector('.quizgen-download').classList.remove('d-none')

	/**
	 * @type {HTMLAnchorElement}
	 */
	let anchor = quizgen.getElementsByClassName('quizgen-download-anchor')[0]
	anchor.href = file_url
	anchor.download = ''
	anchor.innerText = file_url

	quizgen.getElementsByClassName('quizgen-download-size')[0]
	.innerText = file_size
	
	quizgen.getElementsByClassName('quizgen-download-size-unit')[0]
	.innerText = file_size_unit
}

/**
 * Load Anki notes to webpage UI.
 * 
 * @param {string} quizgen_id Quizcard generator id.
 * @param {string[]} anki_notes Anki notes delim-separated-values rows.
 * @param {string} anki_notes_header Anki notes delim-separated-values header.
 */
function quizcard_result_preview(quizgen_id, anki_notes, anki_notes_header) {
	const quizgen = document.querySelector(`.quizgen-component[data-qg-id="${quizgen_id}"]`)
	/**
	 * @type {HTMLTextAreaElement}
	 */
	let notes_preview_textarea = quizgen.querySelector('textarea.quizgen-anki-notes-text')
	notes_preview_textarea.value = (
		anki_notes_header + '\n'
		+ (
			anki_notes
			.join('\n')
		)
	)

	// load first note into cards
	// TODO this split on delimiter ignores strings with delimiter inside them.
	let note_fields = anki_notes[0].split(QUIZGEN_ANKI_NOTES_DELIM)
	let clozes = note_fields[quizgen_anki_fields.CLOZES]
	if (clozes.startsWith('"')) {
		clozes = clozes.substring(1, clozes.length-1)
	}
	let text = note_fields[quizgen_anki_fields.TEXT]
	if (text.startsWith('"')) {
		text = text.substring(1, text.length-1)
	}

	/**
	 * @type {HTMLDialogElement}
	 */
	let note_card = quizgen.querySelector('.quizgen-anki-notes-card-front')
	/**
	 * @type {HTMLDivElement}
	 */
	let card_title = note_card.querySelector('.card-body > .card-title')
	card_title.innerText = text.replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"')
	/**
	 * @type {HTMLDivElement}
	 */
	let card_text = note_card.querySelector('.card-body > .card-text')
	card_text.innerHTML = clozes.replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"')
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