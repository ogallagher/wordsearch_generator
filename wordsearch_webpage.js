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
				on_wordsearch_input_file(description_json)
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
		$('.wordsearch-config').hide()
		
		// hide answers header
		$('#answers-header').css('visibility','hidden')
		
		// hide answers
		$('.ws-word').attr('data-found',false)
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

function set_wordsearch_is_random_subset(is_random) {
	wordsearch_is_random_subset = is_random
	
	// update button data
	$('#random-subset')
	.attr('data-on', is_random)
	.addClass(is_random ? 'btn-secondary' : 'btn-outline-secondary')
	.removeClass(is_random ? 'btn-outline-secondary' : 'btn-secondary')
	
	if (is_random) {
		$('#random-subset-count').prop('disabled', false)
	}
	else {
		$('#random-subset-count').prop('disabled', true)
	}
}

function on_wordsearch_input_file(wordsearch_json) {
	if (wordsearch_json != undefined) {
		let description = JSON.parse(wordsearch_json)
		let wordsearch = new WordsearchGenerator(
			description['language'],
			description['case'],
			description['size']
		)
		wordsearch.init_promise.then(() => {
			load_word_clues(wordsearch, description['words'])
			
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
			for (let i=0; i<subset_idx.length; i++) {
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
}

function display_wordsearch(wordsearch) {
	// console.log(`DEBUG final grid:\n${wordsearch.grid_string()}`)
	// console.log(`DEBUG clues:\n${wordsearch.clues.join('\n')}`)
	
	// clear endpoint_cells
	endpoint_cells = []
	
	let wel = $('.wordsearch')
	.html('')
	
	let y=0
	for (let row of wordsearch.grid) {
		let rel = $(`
			<div class="row flex-nowrap justify-content-center ws-row"></div>
		`)
		
		let x=0
		for (let cell of row) {
			let cel = $(
				`<div 
					class="col-auto ws-cell"
					data-x="${x}" data-y="${y}" data-word="${cell}"
					data-on="false">
					${cell}
				</div>`
			)
			
			cel.click(function() {
				on_cell_click($(this), wordsearch)
			})
			
			rel.append(cel)
			x++
		}
		
		wel.append(rel)
		y++
	}
	
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
	
	for (let i=0; i<words.length; i++) {
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

function is_on(jq) {
	return jq.attr('data-on') === 'true'
}
