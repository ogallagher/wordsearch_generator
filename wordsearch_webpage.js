/**
 * Owen Gallagher
 * 2021-11-30
 */

const INPUT_FILE = 0
const INPUT_FORM = 1
let wordsearch_input_type
let wordsearch_is_random_subset
let wordsearch_global

let endpoint_cells = []

window.onload = function(e) {
	set_wordsearch_input_type(INPUT_FILE)
	set_wordsearch_is_random_subset(false)
	
	// handle input choice
	$('#wordsearch-input-file').click(function() {
		set_wordsearch_input_type(INPUT_FILE)
	})
	$('#wordsearch-input-form').click(function() {
		set_wordsearch_input_type(INPUT_FORM)
	})
	
	// handle alphabet choices list
	let langs_jq = $('.languages')
	
	// show on focus
	$('#language')
	.on('focusin', function() {
		// show alphabets
		langs_jq.show()
	})
	.on('focusout', function(event) {
		// potentially allow a language option to accept a click event before disappearing
		setTimeout(() => {
			langs_jq.hide()
		}, 100)
	})
	
	WordsearchGenerator.get_alphabet_aliases()
	.then(function(alphabets) {
		const alphabet_option_template = 
		`<div class="language-option px-2">
			<span class="alphabet-key"></span>
			<span class="alphabet-aliases"></span>
		</div>`
		
		// display alphabets in list
		for (let alphabet_key in alphabets) {
			// console.log(`debug loaded alphabet:\b${JSON.stringify(alphabet_key)}`)
			let alphabet_jq = $(alphabet_option_template)
			.attr('data-alphabet-key', alphabet_key)
			
			alphabet_jq.find('.alphabet-key').html(alphabet_key)
			alphabet_jq.find('.alphabet-aliases').html(alphabets[alphabet_key].join(' '))
			
			langs_jq.append(alphabet_jq)
			
			// handle alphabet click
			alphabet_jq.on('click', on_alphabet_option_click)
		}
	})
	
	// handle description file upload
	let description_json
	$('.wordsearch-file').on('change', function() {
		let filereader = new FileReader()
		filereader.onload = function() {
			description_json = filereader.result
			on_wordsearch_input_file(description_json)
		}
		filereader.readAsText($(this).prop('files')[0])
	})
	
	// handle reload button
	$('.wordsearch-reload').click(function() {
		switch (wordsearch_input_type) {
			case INPUT_FILE:
				let config = JSON.parse(description_json)
				
				// use random subset count input if enabled
				if (wordsearch_is_random_subset) {
					let ui_subset_length = $('#random-subset-count').val()
					if (ui_subset_length !== '') {
						ui_subset_length = parseInt(ui_subset_length)
						// console.log(`DEBUG ui subset length = ${ui_subset_length}`)
						config['random_subset'] = ui_subset_length
					}
				}
				
				on_wordsearch_input_file(config)
				break
			
			case INPUT_FORM:
				on_wordsearch_input_form()
				break
		}
	})
	
	// handle word-clue add button click
	$('#add-word-clue').click(function() {
		let datetime_str = new Date().toISOString()
		let containerjq = $('#word-clues')
		let rowjq = $(
			`<div class="row word-clue mt-1 gx-1" data-when="${datetime_str}">
				<div class="col">
					<input type="text" placeholder="word" class="word-clue-word form-control"/>
				</div>
				<div class="col">
					<input type="text" placeholder="clue (optional)" class="word-clue-clue form-control"/>
				</div>
				<div class="col-auto d-flex flex-column justify-content-center">
					<button 
						class="btn btn-danger word-clue-delete" data-when="${datetime_str}"
						onclick="on_word_clue_delete_click(event)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-dash-lg" viewBox="0 0 16 16">
							<path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/>
						</svg>
					</button>
				</div>
			</div>`
		)
		containerjq.append(rowjq)
	})
	
	// handle random subset button click
	$('#random-subset').click(function() {
		set_wordsearch_is_random_subset(!is_on($(this)))
	})
	
	// handle print button
	$('.wordsearch-print').click(function() {
		// clean wordsearch
		$('.wordsearch').addClass('printable')
		
		// hide config
		$('.wordsearch-config').addClass('printable')
		
		// hide answers header
		$('#answers-header').addClass('printable')
		
		// hide answers
		$('.ws-word').addClass('printable')
		
		// show print-only
		$('.printscreen-only').addClass('printable')
	})
	
	// handle screen button
	$('.wordsearch-screen').click(function() {
		// mark wordsearch
		$('.wordsearch').removeClass('printable')
		
		// show config
		$('.wordsearch-config').removeClass('printable')
		
		// show answers header
		$('#answers-header').removeClass('printable')
		
		// show answers
		$('.ws-word').removeClass('printable')
		
		// hide print-only
		$('.printscreen-only').removeClass('printable')
	})
	
	// handle export config button
	$('.wordsearch-export-config').click(function() {
		if (wordsearch_global != undefined) {
			let wordsearch_json_encoded = btoa(unescape(encodeURIComponent(
				JSON.stringify(wordsearch_global.export_config())
			)))
			console.log(`DEBUG encoded export = ${wordsearch_json_encoded}`)
			
			$('.wordsearch-export-link')
			.prop('href',`data:application/json;base64,${wordsearch_json_encoded}`)
			.prop('download',`wordsearch_cfg_${new Date().toISOString()}.json`)
			[0].click()
		}
	})
}

function set_wordsearch_input_type(input_type) {
	wordsearch_input_type = input_type
	
	switch (input_type) {
		case INPUT_FILE:
			$('#wordsearch-input-file').removeClass('btn-outline-secondary').addClass('btn-secondary')
			$('#wordsearch-input-form').removeClass('btn-secondary').addClass('btn-outline-secondary')
			$('.wordsearch-file').show()
			$('.wordsearch-form').hide()
			break
			
		case INPUT_FORM:
			$('#wordsearch-input-file').removeClass('btn-secondary').addClass('btn-outline-secondary')
			$('#wordsearch-input-form').removeClass('btn-outline-secondary').addClass('btn-secondary')
			$('.wordsearch-file').hide()
			$('.wordsearch-form').show()
			break
	}
}

function set_wordsearch_is_random_subset(is_random, subset_length) {
	wordsearch_is_random_subset = is_random
	
	// update button data
	$('#random-subset')
	.attr('data-on', is_random)
	.addClass(is_random ? 'btn-secondary' : 'btn-outline-secondary')
	.removeClass(is_random ? 'btn-outline-secondary' : 'btn-secondary')
	
	// update count input
	if (is_random) {
		$('#random-subset-count')
		.prop('disabled', false)
		.val(subset_length)
	}
	else {
		$('#random-subset-count').prop('disabled', true)
	}
}

function on_wordsearch_input_file(wordsearch_json) {
	if (wordsearch_json != undefined) {
		let description = typeof wordsearch_json === 'string' 
			? JSON.parse(wordsearch_json)
			: wordsearch_json
		
		let random_subset = description['random_subset']
		
		let wordsearch = new WordsearchGenerator(
			description['language'],
			description['case'],
			description['size'],
			description['words'],
			random_subset,
			description['title']
		)
		
		if (random_subset != undefined) {
			set_wordsearch_is_random_subset(true, random_subset)
		}
		
		wordsearch.init_promise
		/*
		// load word-clues via driver
		.then(() => {
			return load_word_clues(wordsearch, description['words'])
		})
		*/
		.then(() => {
			display_wordsearch(wordsearch)
		})
	}
	else {
		console.log('ERROR wordsearch description not defined')
	}
}

function on_wordsearch_input_form() {
	try {
		// load initial config
		let wordsearch = new WordsearchGenerator(
			$('#language').val().trim().toLowerCase(),
			$('#case').val().trim().toLowerCase(),
			parseInt($('#size').val().trim())
		)
		
		wordsearch.init_promise.then(() => {
			let word_clues = []
			
			$('.word-clue').each(function(idx) {
				// read word and clue from row
				let rowjq = $(this)
				
				let word = rowjq.find('.word-clue-word').val()
				let clue = rowjq.find('.word-clue-clue').val()
				if (word !== '') {
					if (clue === '') {
						clue = word
					}
				
					word_clues.push(`${word}:${clue}`)
				}
			})
			.promise().done(() => {
				load_word_clues(wordsearch, word_clues)
				
				display_wordsearch(wordsearch)
			})
		})
	}
	catch (err) {
		console.log(err)
		console.log(`ERROR wordsearch config is invalid: ${err}`)
	}
}

function load_word_clues(wordsearch, word_clues, clue_delim=':') {
	if (wordsearch_is_random_subset) {
		let subset_count_jq = $('#random-subset-count')
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
		$('#random-subset-count').val('')
	}
	
	for (let word_clue of word_clues) {
		let array = word_clue.split(clue_delim)
		
		let word = array[0]
		let clue = word
		if (array.length == 2) {
			clue = array[1]
		}
		
		if (word.length <= wordsearch.grid.length) {
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

function display_wordsearch(wordsearch) {
	// console.log(`DEBUG final grid:\n${wordsearch.grid_string()}`)
	// console.log(`DEBUG clues:\n${wordsearch.clues.join('\n')}`)
	
	// clear endpoint_cells
	endpoint_cells = []
	
	// wordsearch element
	let wel = $('.wordsearch')
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
				`<td 
					class="ws-cell d-flex flex-column justify-content-center"
					data-x="${x}" data-y="${y}" data-word="${cell}"
					data-on="false">
					<div>${cell}</div>
				</td>`
			)
			
			cel.click(function() {
				on_cell_click($(this), wordsearch)
			})
			
			rel.append(cel)
			x++
		}
		
		tel.append(rel)
		y++
	}
	
	wel.append(tel)
	
	display_answers(wordsearch.words, wordsearch.clues)
	
	// enable print view
	$('.wordsearch-print').prop('disabled', false)
	
	// update wordsearch reference
	wordsearch_global = wordsearch
}

function print_wordsearch() {
	
}

function display_answers(words, clues) {
	// show answer word-clues
	let answersjq = $('.answers').html('')
	
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

function on_cell_click(cell, wordsearch) {
	// console.log(
	// 	`DEBUG cell ${cell.attr('data-x')},${cell.attr('data-y')}=${
	// 		cell.attr('data-word')
	// 	} clicked`
	// )
	
	let cell_is_on = !is_on(cell)
	cell.attr('data-on', cell_is_on)
	
	if (cell_is_on) {
		let en = endpoint_cells.length
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
		
		// check endpoints
		let ab = 
			`${a.attr('data-x')},${a.attr('data-y')}-`
			+ `${b.attr('data-x')},${b.attr('data-y')}`
		
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
					$(`.ws-cell[data-x="${x}"][data-y="${y}"]`)
					.attr('data-found',true)
				
					x += dx
					y += dy
				}
			}
			
			// reveal answer
			$(`.ws-answer[data-word-idx="${word_idx}"] > .ws-word`)
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
	else {
		// clear endpoint_cells
		endpoint_cells = []
	}
}

/**
 * Handle word-clue delete button click.
 * 
 * @param {Object} event Click MouseEvent instance.
 */
function on_word_clue_delete_click(event) {
	let datetime_str = event.target.getAttribute('data-when')
	$(`.word-clue[data-when="${datetime_str}"]`).remove()
}

function on_alphabet_option_click(event) {
	let alphabet_option = event.target
	let alphabet_key = alphabet_option.getAttribute('data-alphabet-key')
	console.log(`info select alphabet ${alphabet_key}`)
	
	$('#language').val(alphabet_key)
}

function is_on(jq) {
	return jq.attr('data-on') === 'true'
}
