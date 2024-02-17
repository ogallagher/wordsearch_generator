const current_script = document.currentScript

let USE_WP_HOST_URL = false
const WP_HOST_URL = 'https://wordsearch.dreamhosters.com'
const DEPENDENCIES_URL = '/webpage_dependencies.html'
const QUIZGEN_COMPONENT_URL = '/quizcard-generator/quizcard_webcomponent.html?version=0.0.2'
const HEADER_COMPONENT_URL = '/header_webcomponent.html'
const WORDSEARCH_LOG_URL = '/temp_js_logger.js'
const DEFAULT_QUIZGEN_CONTAINERS_SELECTOR = '.quizgen-container'
const QUIZGEN_CONTAINERS_PARENT_SELECTOR = `${DEFAULT_QUIZGEN_CONTAINERS_SELECTOR}s`
const quizgen_frequency_order = {
	FIRST: 'common',
	LAST: 'rare'
}
const QUIZGEN_ANKI_NOTES_DELIM = '\t'
const QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE = /\"\"/g
const QUIZGEN_ANKI_CLOZE_PLACEHOLDER = /\{\{c(\d+)::([^}]+)\}\}/g
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
	TRANSLATIONS: 7,
	PROLOGUE: 8,
	EPILOGUE: 9
}
/* global dsv */

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
		}),

		// header nav bar
		new Promise(function(resolve_nav, reject_nav) {
			let url = USE_WP_HOST_URL
				? `${WP_HOST_URL}${HEADER_COMPONENT_URL}`
				: HEADER_COMPONENT_URL
			
			$.ajax({
				method: 'GET',
				url: url,
				dataType: 'html',
				success: function(header_html) {
					console.log(`debug loaded header html of length ${header_html.length}`)
					document.body.querySelector('header.shared-header').innerHTML = header_html
					resolve_nav()
				},
				error: function(err) {
					console.log(`error failed to get header at ${url}. ${err}`)
					reject_nav()
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

		// ordinal frequency checkbox effect
		quizgen.querySelector('input.quizgen-frequency-order-enable').addEventListener(
			'change',
			/**
			 * @param {InputEvent} change_event 
			 */
			(change_event) => {
				if (change_event.target.checked) {
					console.log('debug enable ordinal frequency filters')
					quizgen.querySelector('input.quizgen-frequency-order-limit').removeAttribute('disabled')
					quizgen.querySelector('button.quizgen-frequency-order-percent').removeAttribute('disabled')
					quizgen.querySelector('.quizgen-frequency-order-select').removeAttribute('disabled')
				}
				else {
					console.log('debug disable ordinal frequency filters')
					quizgen.querySelector('input.quizgen-frequency-order-limit').setAttribute('disabled', true)
					quizgen.querySelector('button.quizgen-frequency-order-percent').setAttribute('disabled', true)
					quizgen.querySelector('.quizgen-frequency-order-select').setAttribute('disabled', true)
				}
			}
		)

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
		// animate ordinal frequency percentage toggle
		quizgen.querySelector('button.quizgen-frequency-order-percent')
		.addEventListener(
			'click', 
			/**
			 * 
			 * @param {MouseEvent} mouse_event 
			 */
			(mouse_event) => {
				/**
				 * @type {HTMLButtonElement}
				 */
				const percent_btn = mouse_event.target
				/**
				 * @type {boolean}
				 */
				const data_percent = percent_btn.getAttribute('data-percent') === 'true'
				const percent_icon = percent_btn.querySelector('i.bi')
				if (data_percent) {
					// switch to number
					console.log('debug frequency order percent')
					percent_icon.classList.remove('bi-percent')
					percent_icon.classList.add('bi-hash')
				}
				else {
					// switch to percent
					console.log('debug frequency order number')
					percent_icon.classList.remove('bi-hash')
					percent_icon.classList.add('bi-percent')
				}

				percent_btn.setAttribute('data-percent', (!data_percent) ? 'true' : 'false')
			}
		)

		// sentence length limits checkbox effect
		quizgen.querySelector('input.quizgen-sentence-limits-enable').addEventListener(
			'change',
			/**
			 * @param {InputEvent} change_event
			 */
			(change_event) => {
				if (change_event.target.checked) {
					console.log('debug enable sentence length filters')
					quizgen.querySelector('input.quizgen-sentence-word-min').removeAttribute('disabled')
					quizgen.querySelector('input.quizgen-sentence-token-max').removeAttribute('disabled')
				}
				else {
					console.log('debug enable sentence length filters')
					quizgen.querySelector('input.quizgen-sentence-word-min').setAttribute('disabled', true)
					quizgen.querySelector('input.quizgen-sentence-token-max').setAttribute('disabled', true)
				}
			}
		)
		
		// preview and generate
		quizgen.querySelector('button.quizgen-generate-preview')
		.addEventListener('click', (_mouse_event) => {
			console.log(`debug generate-preview pressed`)
			const preview_limit = quizcard_opt_value_normalized(
				quizgen.querySelector('input.quizgen-preview-limit').value
			)
			quizcard_set_opts(quizgen_id, preview_limit || 3)
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
	let value_or_undefined = (
		value === '' 
		|| (Array.isArray(value) && (value.length === 0 || value[0] === ''))
		|| value === undefined || value === null 
		|| value === Number.NaN
	) ? undefined : value

	if (Array.isArray(value_or_undefined)) {
		return value_or_undefined.map(v => {
			if (typeof v === 'string') {
				return v.trim()
			}
			else {
				return v
			}
		})
	}
	else {
		return value_or_undefined
	}
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
		'sentence-length-min': undefined,
		'sentence-length-max': undefined,
		'tag': undefined,
		'limit': parseInt(limit),
		'choices': undefined,
		'choice-randomness': undefined,
		'prologue': undefined,
		'epilogue': undefined
	}

	/**
	 * @type {HTMLElement}
	 */
	const quizgen = document.querySelector(`.quizgen-component[data-qg-id="${quizgen_id}"]`)
	let sentence_limit_enable = quizgen.querySelector('input.quizgen-sentence-limits-enable')
	
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
				let frequency_order_percent = quizcard_opt_value_normalized(
					quizgen.querySelector('button.quizgen-frequency-order-percent')
					.getAttribute('data-percent') === 'true'
				)
				let frequency_order_limit = quizcard_opt_value_normalized(
					parseInt(frequency_order_limiter.value)
				)
				r_ffl([
					opt_key, 
					frequency_order_percent ? `${frequency_order_limit}%` : frequency_order_limit
				])
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
		new Promise((r_smin) => {
			if (sentence_limit_enable.checked) {
				const sentence_min_input = quizgen.querySelector('input.quizgen-sentence-word-min')
				r_smin(['sentence-length-min', quizcard_opt_value_normalized(parseInt(sentence_min_input.value))])
			}
			else {
				
				r_smin(['sentence-length-min', undefined])
			}
		}),
		new Promise((r_smax) => {
			if (sentence_limit_enable.checked) {
				const sentence_max_input = quizgen.querySelector('input.quizgen-sentence-token-max')
				r_smax(['sentence-length-max', quizcard_opt_value_normalized(parseInt(sentence_max_input.value))])
			}
			else {
				r_smax(['sentence-length-max', undefined])
			}
		}),
		new Promise((r_t) => {
			const tags_input = quizgen.querySelector('textarea.quizgen-note-tags')
			let tags = quizcard_opt_value_normalized(
				tags_input.value?.split(',')
			)
			r_t(['tag', tags])
		}),
		new Promise((r_cc) => {
			/**
			 * @type {HTMLInputElement}
			 */
			const count_input = quizgen.querySelector('input.quizgen-choice-count')
			r_cc(['choices', quizcard_opt_value_normalized(parseInt(count_input.value))])
		}),
		new Promise((r_cv) => {
			/**
			 * @type {HTMLInputElement}
			 */
			const variation_input = quizgen.querySelector('input.quizgen-choice-variation')

			r_cv(['choice-randomness', quizcard_opt_value_normalized(variation_input.value)])
		}),
		new Promise((r_pro) => {
			/**
			 * @type {HTMLInputElement}
			 */
			const prologue_input = quizgen.querySelector('input.quizgen-prologue-length')
			r_pro(['prologue', quizcard_opt_value_normalized(parseInt(prologue_input.value))])
		}),
		new Promise((r_epi) => {
			/**
			 * @type {HTMLInputElement}
			 */
			const epilogue_input = quizgen.querySelector('input.quizgen-epilogue-length')
			r_epi(['epilogue', quizcard_opt_value_normalized(parseInt(epilogue_input.value))])
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
	if (opts['input-file-content'] === undefined) {
		console.log(`error cannot generate from empty source text`)
		return
	}
	else if (opts['input-file-content'].split(/\s+/g).length < 3) {
		console.log(`error source text should include at least 3 words`)
		return
	}

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
				console.log(`error failed to generate notes preview ${JSON.stringify(err)}`)
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
					res.file_size_unit,
					res.file_expiry,
					res.file_expiry_unit
				)
			},
			error: (err) => {
				console.log(`error failed to generate notes file ${err}`)
			}
		})
	}
}

function quizcard_result_download(quizgen_id, file_url, file_size, file_size_unit, file_expiry, file_expiry_unit) {
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

	quizgen.getElementsByClassName('quizgen-download-expiry')[0].innerText = file_expiry
	quizgen.getElementsByClassName('quizgen-download-expiry-unit')[0].innerText = file_expiry_unit
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
	
	/**
	 * @type {HTMLButtonElement}
	 */
	let card_dealer = quizgen.querySelector('.quizgen-anki-cards button.quizgen-anki-card-random-front')
	card_dealer.onclick = (_mouse_event) => {
		quizcard_note_card_preview(quizgen_id, anki_notes)
	}
	// load first card
	card_dealer.click()
}

function quizcard_note_card_preview(quizgen_id, anki_notes, note_idx) {
	const quizgen = document.querySelector(`.quizgen-component[data-qg-id="${quizgen_id}"]`)

	// update note number
	/**
	 * @type {HTMLInputElement}
	 */
	let note_number_label = quizgen.querySelector('.quizgen-anki-cards input.quizgen-anki-note-idx-front')
	if (note_idx === undefined) {
		note_idx = Math.round(Math.random() * (anki_notes.length-1))

		if (note_idx + 1 === note_number_label.value) {
			note_idx = (note_idx + 1) % anki_notes.length
		}
	}
	note_number_label.value = note_idx + 1

	/**
	 * @type {HTMLDialogElement}
	 */
	let note_card = quizgen.querySelector('.quizgen-anki-notes-card-front')
	/**
	 * @type {HTMLDivElement}
	 */
	let card_title = note_card.querySelector('.card-body > .card-title')
	/**
	 * @type {HTMLDivElement}
	 */
	let card_text = note_card.querySelector('.card-body > .card-text')
	if (anki_notes[note_idx] === undefined) {
		card_title.innerText = '<empty note>'
		card_text.innerText = ''
		return
	}
	/**
	 * @type {string[]}
	 */
	let note_fields = d3.dsvFormat(QUIZGEN_ANKI_NOTES_DELIM).parseRows(anki_notes[note_idx])[0]
	let text = note_fields[quizgen_anki_fields.TEXT].replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"')
	/**
	 * @type {HTMLDivElement}
	 */
	let clozes = $(note_fields[quizgen_anki_fields.CLOZES].replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"'))[0]
	let prologue = note_fields[quizgen_anki_fields.PROLOGUE].replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"')
	let epilogue = note_fields[quizgen_anki_fields.EPILOGUE].replace(QUIZGEN_ANKI_NOTES_DQUOTE_ESCAPE, '"')
	
	// convert text into markup and replace cloze placeholder syntax {{cX::word}} 
	// with <span class="quizgen-cloze" data-cloze="X">word</span>.
	let text_div = document.createElement('span')
	text_div.innerHTML = text.replace(
		QUIZGEN_ANKI_CLOZE_PLACEHOLDER, 
		(_substr, c_idx, c_word) => {
			return `<span class="quizgen-cloze" data-cloze="${c_idx}">${c_word}</span>`
		}
	)
	let prologue_div = document.createElement('span')
	prologue_div.classList.add('quizgen-text-neighbor', 'quizgen-prologue')
	if (prologue.length === 0) {
		prologue_div.classList.add('d-none')
	}
	prologue_div.innerText = prologue + ' '
	let epilogue_div = document.createElement('span')
	epilogue_div.classList.add('quizgen-text-neighbor', 'quizgen-epilogue')
	epilogue_div.innerText = ' ' + epilogue
	if (epilogue.length === 0) {
		epilogue_div.classList.add('d-none')
	}

	card_title.replaceChildren(prologue_div, text_div, epilogue_div)
	
	let choices = clozes.getElementsByClassName('choice')
	// this cloze card rendering logic essentially imitates what's already done in the front card template
	if (choices.length === 0) {
		clozes.innerHTML = `<b>No testable words found.</b>`
	}
	else {
		// activate random choice
		let active_choice_idx = Math.round(Math.random() * (choices.length-1))

		// update choice number label
		let active_choice_label = quizgen.querySelector('.quizgen-anki-cards input.quizgen-anki-cloze-idx-front')
		if (active_choice_idx + 1 === active_choice_label.value) {
			active_choice_idx = (active_choice_idx + 1) % choices.length
		}
		active_choice_label.value = active_choice_idx + 1

		let choice = choices[active_choice_idx]
		console.log(`info activate choice ${active_choice_idx}+1 ${choice.outerHTML}`)
		choice.classList.add('active')

		let cloze = text_div.querySelector(`.quizgen-cloze[data-cloze="${active_choice_idx+1}"]`)
		cloze.innerText = '[...]'
		cloze.classList.add('active')		
	}
	card_text.replaceChildren(clozes)
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