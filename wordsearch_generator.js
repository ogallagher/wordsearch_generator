/**
 * Owen Gallagher
 * 2021-11-27
 * 
 * Generate wordsearch in any language.
 */

// imports

const ENV_UNKNOWN = 'unknown'
const ENV_BACKEND = 'backend'
const ENV_FRONTEND = 'frontend'
let environment = ENV_UNKNOWN

const USE_WG_HOST_URL = true
const WG_HOST_URL = 'https://wordsearch.dreamhosters.com'

let fs
// directory where this file is
let parent_dir

let environment_promise = new Promise(function(resolve) {
	Promise.all([
		import('fs')
	])
	.then((modules) => {
		fs = modules[0].default
		parent_dir = __dirname
		environment = ENV_BACKEND
	})
	.catch(() => {
		fs = undefined
		parent_dir = '.'
		environment = ENV_FRONTEND
	})
	.finally(() => {
		console.log(`DEBUG wordsearch_generator.js env=${environment}, dir=${parent_dir}`)
		resolve()
	})
})

// class

const LANGUAGE_DEFAULT = 'en'
const CASE_LOWER = 'lower'
const CASE_UPPER = 'upper'
const CASE_DEFAULT = CASE_LOWER
const WIDTH_DEFAULT = 10
const WORD_CLUE_DELIM = ':'
const ALPHABET_FILE = 'alphabets.json'
const ALPHABET_PROB_DIST_DIR = 'alphabet_prob_dists'
const PROB_DIST_UNIFORM = 'uniform'

// alphabets.json keys

const KEY_COMMENT = '//comment'
const KEY_ALPHABET_ALIASES  = 'alphabet_aliases'
const KEY_RANGES = 'ranges'
const KEY_LOWER_RANGES = KEY_RANGES
const KEY_UPPER_RANGES = `upper_${KEY_RANGES}`
const KEY_DEFAULT_PD = 'default_prob_dist'
const KEY_PROB_DIST = 'prob_dist'
const KEY_SELECTED_PROB_DIST = 'selected_prob_dist'
const KEY_PD_NAME = 'name'
const KEY_PD_DESC = 'description'
const KEY_PD_FILE = 'filename'
const KEY_PD_DIR = 'dirname'

const KEY_COUNTS = 'counts'
const KEY_PROBABILITIES = 'probabilities'
const KEY_ACCUM_PROBABILITIES = 'accum_probabilities'

// wordsearch config keys

const KEY_LANGUAGE = 'language'
const KEY_CASE = 'case'
const KEY_SIZE = 'size'
const KEY_WORDS = 'words'
const KEY_RANDOM_SUBSET = 'random_subset'
const KEY_TITLE = 'title'

class WordsearchGenerator {
	/**
	 * Constructor.
	 *
	 * Instance vars:
	 * 		language
	 * 		alphabet_case
	 *		alphabet_case_key
	 * 		alphabet
	 * 		init_promise
	 *		title
	 *		grid
	 *		words
	 *		clues
	 *		word_cells
	 *		point_to_word_idx
	 *
	 * @param {String} language Language code string.
	 * @param {String} alphabet_case Alphabet case (upper, lower).
	 * @param {Number, Array} width Puzzle width/height (square), or array of width and height (rectangle).
	 * @param {Array} words Array of word[-clues], with word-clue delimiter WORD_CLUE_DELIM.
	 * @param {Number} random_subset How many words to select from the population for each wordsearch.
	 */
	constructor(language = LANGUAGE_DEFAULT, alphabet_case = CASE_DEFAULT, width = WIDTH_DEFAULT, words, random_subset, title) {
		this.language = language
		this.alphabet_case = alphabet_case

		let case_key
		switch (alphabet_case) {
			case CASE_UPPER:
				case_key = KEY_UPPER_RANGES
				break

			case CASE_LOWER:
			default:
				case_key = KEY_LOWER_RANGES
				break
		}
		this.alphabet_case_key = case_key

		this.title = title
		
		// convert width to width,height
		let height
		if (width instanceof Array) {
			let dimensions = width
			width = dimensions[0]
			height = dimensions[1]
		}
		else {
			height = width
		}
		
		this.grid = new Array(height)
		for (let y = 0; y < height; y++) {
			this.grid[y] = new Array(width)
		}
		
		this.words = []
		this.clues = []
		this.word_cells = new Array(height)
		for (let y = 0; y < height; y++) {
			this.word_cells[y] = new Array(width)
		}
		
		// maps coordinates to indeces in words
		this.point_to_word_idx = {}
		
		this.init_promise = WordsearchGenerator.get_alphabet(this.language, case_key)
		// load alphabet
		.then((alphabet) => {
			this.alphabet = alphabet
		})
		.then(
			// alphabet succeeds
			() => {
				// randomize cells
				this.randomize_cells()

				if (words != undefined) {
					// load words (and clues)
					this.add_word_clues(words, random_subset)
				}
				// else, delegate words load to driver
			},

			// alphabet fails
			(err) => {
				if (err) {
					console.log(`ERROR: ${err}`)
				}
				this.alphabet = undefined
			}
		)
	}

	/**
	 * Generate random content for a single cell.
	 * 
	 * The uniform probability distribution assigns a cumulative probability for each char code set
	 * in the selected case. The choice is done in two steps:
	 * 	1. select char code set
	 *	2. select char code from set
	 * 
	 * Custom probability distributions specify the probability for each character. The choice is
	 * done in two steps:
	 * 	1. select char index
	 * 	2. convert char index to (code-set, index-in-code-set)
	 * 
	 * @returns Random content for a single cell (a letter, character, or syllable), or {null} on 
	 * failure.
	 * @type String
	 */
	random_cell() {
		let pd_name = this.alphabet[KEY_SELECTED_PROB_DIST]
		let probabilities = this.alphabet[KEY_PROBABILITIES]
		let accum_probabilities = this.alphabet[KEY_ACCUM_PROBABILITIES]
		let code_sets = this.alphabet[this.alphabet_case_key]
		
		let p = Math.random()
		if (pd_name == PROB_DIST_UNIFORM) {
			// select code set index
			let ap = 0
			let code_set = undefined
			do {
				if (p < accum_probabilities[ap]) {
					code_set = code_sets[ap]
				}
				
				ap++
			} while (code_set === undefined && ap <= accum_probabilities.length)
			
			// select code index in set
			if (code_set !== undefined) {
				let code = code_set.length == 2 
					? Math.round(code_set[0] + (Math.random() * (code_set[1] - code_set[0]))) 
					: code_set[Math.floor(Math.random() * code_set.length)]
				
				return WordsearchGenerator.code_to_char(code)
			} 
			else {
				return null
			}
		}
		else {
			// select absolute code index
			let ap_idx = 0
			while (
				ap_idx < accum_probabilities.length && 
				// find index in accum_probabilities, skipping zeros
				(p > accum_probabilities[ap_idx] || probabilities[ap_idx] == 0)
			) {
				ap_idx++
			}
			// console.log(`DEBUG p=${p} --> abs_code_idx=${ap_idx}`)
			
			// convert to (code set, index in code set)
			let counts = this.alphabet[KEY_COUNTS]
			let cs_idx = 0
			
			// offset still beyond domain of current code set
			while (ap_idx >= counts[cs_idx]) {
				// ap_idx becomes offset from new base
				ap_idx -= counts[cs_idx]
				// step to new code set base
				cs_idx++
			}
			
			let code_set = code_sets[cs_idx]
			// console.log(`DEBUG abs_code_idx=${ap_idx} --> code_set_idx=${cs_idx}`)
			if (code_set !== undefined) {
				let code = code_set.length == 2
					? code_set[0] + ap_idx
					: code_set[ap_idx]
				// console.log(
				// 	`DEBUG code_set_idx=${cs_idx}, code_idx=${ap_idx} --> code=${code}`
				// )
				if (code !== undefined) {
					return WordsearchGenerator.code_to_char(code)
				}
				else {
					return null
				}
			}
			else {
				return null
			}
		}
	}

	/**
	 * Fill in random content for all cells in grid.
	 */
	randomize_cells() {
		let height = this.grid.length
		let width = height > 0
			? this.grid[0].length
			: 0
		
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				this.grid[y][x] = this.random_cell()
			}
		}
	}

	/**
	 * Return string showing grid contents.
	 */
	grid_string(indent = '') {
		let grid_rows = new Array(this.grid.length)

		for (let y = 0; y < this.grid.length; y++) {
			grid_rows[y] = `${indent}${this.grid[y].join(' ')}`
		}

		return grid_rows.join('\n')
	}

	/**
	 * Load words and clues in bulk.
	 *
	 * @param {Array} word_clues Array of word or word-clue strings.
	 * @param {Number} subset_length .
	 *
	 * @returns passes (placed words) and fails (skipped words).
	 * @type Object
	 */
	add_word_clues(word_clues, subset_length, max_attempts) {
		if (subset_length != undefined) {
			// get random subset of words and clues
			if (subset_length < word_clues.length && subset_length > 0) {
				// set of word-clue indeces
				let subset_idx = new Set()
				while (subset_idx.size < subset_length) {
					subset_idx.add(Math.floor(Math.random() * word_clues.length))
				}

				// convert to array
				subset_idx = new Array(...subset_idx)
				// convert to word-clues subset
				let subset = new Array(subset_length)
				for (let i = 0; i < subset_idx.length; i++) {
					subset[i] = word_clues[subset_idx[i]]
				}

				// assign to word_clues
				word_clues = subset
			}
		}

		// add word-clues
		let fails = [],
			passes = []
		for (let word_clue of word_clues) {
			let array = word_clue.split(WORD_CLUE_DELIM)

			let word = array[0]
			let clue = (array.length == 2) ? array[1] : word

			if (word.length <= this.grid.length) {
				if (this.add_word_clue(word, clue, max_attempts)) {
					passes.push(word)
				} else {
					fails.push(word)
				}
			} else {
				fails.push(word)
			}
		}

		return {
			passes: passes,
			fails: fails
		}
	}

	/**
	 * Add a new word and corresponding clue to the word search.
	 * 
	 * @param {String} word Word.
	 * @param {String} clue Clue.
	 */
	add_word_clue(word, clue, max_attempts = 20) {
		let word_arr = WordsearchGenerator.string_to_array(word)
		
		if (Math.random() < 0.5) {
			word_arr.reverse()
		}
		
		let height = this.grid.length
		let width = this.grid[0].length
		let free_width = width - word_arr.length + 1
		let free_height = height - word_arr.length + 1
		console.log(`DEBUG ${word} free dimensions = ${free_width} ${free_height}`)
		
		let attempt = 0
		let placed = false
		while (!placed && attempt < max_attempts) {
			// select direction
			let direction = Math.random()
			let wxys = new Array(word_arr.length)
			
			// place word in grid
			if (direction < 1/3 && free_width > 0) {
				// horizontal
				console.log(`DEBUG attempt to place ${word} horizontal`)
				let y = Math.floor(Math.random() * height)
				let x = Math.floor(Math.random() * free_width)
				
				let xc, yc = y, w, no_collide = true
				for (let c = 0; c < word_arr.length && no_collide; c++) {
					w = word_arr[c]
					xc = x + c

					no_collide = this.try_character(w, xc, yc)
					wxys[c] = [w, xc, yc]
				}

				if (no_collide) {
					this.place_word(wxys, word, clue)
					placed = true
				}
			} 
			else if (direction < 2/3 && free_height > 0) {
				// vertical
				console.log(`DEBUG attempt to place ${word} vertical`)
				let y = Math.floor(Math.random() * free_height)
				let x = Math.floor(Math.random() * width)
				
				let xc = x, yc, w, no_collide = true
				for (let c = 0; c < word_arr.length && no_collide; c++) {
					w = word_arr[c]
					yc = y + c

					no_collide = this.try_character(w, xc, yc)
					wxys[c] = [w, xc, yc]
				}

				if (no_collide) {
					this.place_word(wxys, word, clue)
					placed = true
				}
			} 
			else if (free_width > 0 && free_height > 0) {
				if (Math.random() < 0.5) {
					// down right (up left)
					console.log(`DEBUG attempt to place ${word} down-right`)
					let y = Math.floor(Math.random() * free_height)
					let x = Math.floor(Math.random() * free_width)
					
					let xc, yc, w, no_collide = true
					for (let c = 0; c < word_arr.length && no_collide; c++) {
						w = word_arr[c]
						xc = x + c
						yc = y + c

						no_collide = this.try_character(w, xc, yc)
						wxys[c] = [w, xc, yc]
					}

					if (no_collide) {
						this.place_word(wxys, word, clue)
						placed = true
					}
				} 
				else {
					// down left (up right)
					console.log(`DEBUG attempt to place ${word} down-left`)
					let y = Math.floor(Math.random() * free_height)
					let x = width - Math.floor(Math.random() * free_width) - 1
					
					let xc, yc, w, no_collide = true
					for (let c = 0; c < word_arr.length && no_collide; c++) {
						w = word_arr[c]
						xc = x - c
						yc = y + c

						no_collide = this.try_character(w, xc, yc)
						wxys[c] = [w, xc, yc]
					}

					if (no_collide) {
						this.place_word(wxys, word, clue)
						placed = true
					}
				}
			}
			else {
				console.log(`DEBUG direction ${Math.round(direction*10)/10} impossible; skip attempt`)
			}

			attempt++
		}

		if (placed) {
			console.log(`INFO placed ${word} in ${attempt} attempts`)
		}
		return placed
	}
	
	try_character(w, xc, yc) {
		if (this.word_cells[yc][xc] && this.word_cells[yc][xc] != w) {
			// this.grid[yc][xc] = '*'
			return false
		} else {
			return true
		}
	}
	
	place_word(wxys, word, clue) {
		// add word to grid and word_cells
		let w, x, y
		for (let wxy of wxys) {
			w = wxy[0]
			x = wxy[1]
			y = wxy[2]

			this.grid[y][x] = w
			this.word_cells[y][x] = w
		}

		// add word and clue to lists
		let word_idx = this.words.length
		this.words.push(word)
		this.clues.push(clue)

		// add word index to point_to_word_idx for detecting answers
		let n = wxys.length - 1
		let ab = `${wxys[0][1]},${wxys[0][2]}-${wxys[n][1]},${wxys[n][2]}`
		let ba = `${wxys[n][1]},${wxys[n][2]}-${wxys[0][1]},${wxys[0][2]}`
		this.point_to_word_idx[ab] = word_idx
		this.point_to_word_idx[ba] = word_idx
	}

	export_config() {
		let config = {}

		config[KEY_LANGUAGE] = this.language

		config[KEY_SIZE] = this.grid.length

		config[KEY_CASE] = this.alphabet_case

		if (this.title !== undefined) {
			config[KEY_TITLE] = this.title
		}

		let words = new Array(this.words.length)
		for (let i = 0; i < words.length; i++) {
			words[i] = `${this.words[i]}:${this.clues[i]}`
		}
		config[KEY_WORDS] = words

		return config
	}
	
	/**
	 * Select the probability distribution to use when randomizing wordsearch cells.
	 * 
	 * @param String pd_name The prob dist name/key to be selected from 
	 * this.language[KEY_PROB_DIST].
	 * 
	 * @returns Promise resolves undefined.
	 * @type Promise
	 */
	set_probability_distribution(pd_name) {
		let self = this
		
		return new Promise(function(resolve) {
			// set default if not specified
			pd_name = (pd_name == '') ? PROB_DIST_UNIFORM : pd_name
			
			if (pd_name == PROB_DIST_UNIFORM) {
				console.log('INFO use uniform default probability dist')
				resolve()
			}
			else {
				let prob_dist = self.alphabet[KEY_PROB_DIST].find((pd) => pd[KEY_PD_NAME] == pd_name)
				if (prob_dist == undefined) {
					console.log(`WARNING failed to find prob dist ${pd_name}; using default`)
					resolve()
				}
				else {
					// set defaults when not present
					if (prob_dist[KEY_PD_DIR] == null) {
						prob_dist[KEY_PD_DIR] = ALPHABET_PROB_DIST_DIR
					}
					
					console.log(
						`INFO use probability dist ${
							pd_name
						} --> ${
							prob_dist[KEY_PD_DIR]
						}/${
							prob_dist[KEY_PD_FILE]
						}`
					)
					
					// update selected prob dist
					self.alphabet[KEY_SELECTED_PROB_DIST] = prob_dist[KEY_PD_NAME]
					
					// update alphabet individual and cumulative probabilities
					WordsearchGenerator.load_alphabet_probability_dist_file(
						prob_dist[KEY_PD_FILE],
						prob_dist[KEY_PD_DIR]
					)
					.catch(function() {
						console.log(`ERROR failed to read prob dist file ${prob_dist[KEY_PD_FILE]}`)
					})
					.then(function(pd) {
						// update probabilities
						self.alphabet[KEY_PROBABILITIES] = pd[KEY_PROBABILITIES]
						self.alphabet[KEY_ACCUM_PROBABILITIES] = pd[KEY_ACCUM_PROBABILITIES]
					})
					.finally(resolve)
				}
			}
		})
	}

	// static methods
	
	/**
	 * Get alphabet aliases as a plain object.
	 *
	 * @param {String} path Path to alphabets file.
	 *
	 * @returns Resolve alphabet aliases, or reject on failure.
	 * @type Promise
	 */
	static get_alphabet_aliases(path = ALPHABET_FILE) {
		if (USE_WG_HOST_URL && environment == ENV_FRONTEND) {
			path = `${WG_HOST_URL}/${path}`
			console.log(`DEBUG alphabet file path w host = ${path}`)
		}
		
		return new Promise(function(resolve, reject) {
			environment_promise
			.then(() => {
				return WordsearchGenerator.load_alphabets_file(path)
			})
			.then((alphabets) => {
				let aliases = alphabets[KEY_ALPHABET_ALIASES]
				
				// remove comments
				delete aliases[KEY_COMMENT]
				
				resolve(aliases)
			})
			.catch(() => {
				console.log(`ERROR unable to get alphabet aliases`)
				reject()
			})
		})
	}
	
	/**
	 * Get alphabet description given the language code.
	 * 
	 * @param {String} language Language code.
	 * @param {String} path Path to alphabets file.
	 * 
	 * @returns Promise: resolve alphabet description, or reject if the language is not supported.
	 * @type Object
	 */
	static get_alphabet(language, case_key = CASE_DEFAULT, path = ALPHABET_FILE) {
		if (USE_WG_HOST_URL && environment == ENV_FRONTEND) {
			path = `${WG_HOST_URL}/${path}`
			console.log(`DEBUG alphabet file path w host = ${path}`)
		}
		
		return new Promise(function(resolve, reject) {	
			WordsearchGenerator.load_alphabets_file(path)
			.catch(reject)
			.then((alphabets) => {
				let lang_aliases = alphabets[KEY_ALPHABET_ALIASES]
				
				// remove comments
				delete lang_aliases[KEY_COMMENT]
				
				let alphabet = null
				
				if (language in lang_aliases) {
					alphabet = alphabets[language]
				}
				else {
					let a = 0
					let lang_alias_keys = Object.keys(lang_aliases)
					
					while (alphabet == null && a < lang_alias_keys.length) {
						if (lang_aliases[lang_alias_keys[a]].indexOf(language.toLowerCase()) !== -1) {
							alphabet = alphabets[lang_alias_keys[a]]
						}
						else {
							console.log(`DEBUG ${language} not in ${lang_aliases[lang_alias_keys[a]]}`)
						}
						a++
					}
				}
				
				if (alphabet != null) {
					WordsearchGenerator.load_alphabet(
						alphabet, 
						case_key, 
						path,
						alphabets[KEY_DEFAULT_PD]
					)
					.then(resolve)
					.catch(reject)
				}
				else {
					console.log(`ERROR alphabet not found for language ${language}`)
					reject()
				}
			})
		})
	}
	
	/**
	 * Load alphabets file into a plain object. Note this depends on environment_promise.
	 *
	 * @param {String} path Path to the alphabets file.
	 *
	 * @returns Promise resolving a plain object describing character sets per language, or rejecting
	 * undefined on failure.
	 * @type Promise
	 */
	static load_alphabets_file(path = ALPHABET_FILE) {
		return new Promise(function(resolve, reject) {
			if (environment == ENV_FRONTEND) {
				// load with ajax
				$.ajax({
					method: 'GET',
					url: path,
					dataType: 'json',
					success: function(alphabets) {
						resolve(alphabets)
					},
					error: function(err) {
						console.log(`ERROR failed to get alphabets file ${path}`)
						console.log(err)
						reject()
					}
				})
			} 
			else if (environment == ENV_BACKEND) {
				// load with nodejs fs module
				fs.readFile(`${parent_dir}/${path}`, function(err, alphabets_json) {
					if (err) {
						console.log(`ERROR alphabets file not found at ${path}`)
						console.log(err)
						reject()
					} 
					else {
						resolve(JSON.parse(alphabets_json))
					}
				})
			} 
			else {
				console.log(`ERROR unable to load alphabets file in unknown env ${environment}`)
				reject()
			}
		})
	}
	
	/**
	 * Load alphabet probability distribution file into an array. Note this depends on
	 * environment_promise.
	 *
	 * @param {String} file Probability distribution filename.
	 * @param {String} dir Relative path to parent directory (without final /).
	 * 
	 * @returns Resolves an an object with an array of normalized probabilities, each element 
	 * corresponding to a character in the target alphabet, and an array of cumulative
	 * probabilities. Rejects undefined on failure.
	 * @type Promise
	 */
	static load_alphabet_probability_dist_file(file, dir = ALPHABET_PROB_DIST_DIR) {
		return new Promise(function(resolve, reject) {
			if (environment == ENV_FRONTEND) {
				// load with ajax
				let path = `${dir}/${file}`
				$.ajax({
					method: 'GET',
					url: path,
					dataType: 'text',
					success: function(prob_dist_txt) {
						// parse as array
						WordsearchGenerator.parse_alphabet_probability_dist_str(prob_dist_txt)
						.then(resolve)
						.catch(reject)
					},
					error: function(err) {
						console.log(`ERROR failed to get alphabet probability distribution file ${path}`)
						console.log(err)
						reject()
					}
				})
			}
			else if (environment == ENV_BACKEND) {
				// load with nodejs fs module
				let path = `${parent_dir}/${dir}/${file}`
				fs.readFile(path, 'utf8', function(err, prob_dist_txt) {
					if (err) {
						console.log(`ERROR probability distribution file not found at ${path}`)
						console.log(err)
						reject()
					}
					else {
						// parse as array
						WordsearchGenerator.parse_alphabet_probability_dist_str(prob_dist_txt)
						.then(resolve)
						.catch(reject)
					}
				})
			}
			else {
				console.log(`ERROR unable to load alphabet probability distribution file in unknown env ${environment}`)
				reject()
			}
		})
	}
	
	/**
	 * Called by {get_alphabet}.
	 */
	static load_alphabet(alphabet, case_key, path, default_prob_dist) {
		return new Promise(function(resolve, reject) {
			if (alphabet != undefined) {
				// calculate uniform probability distribution
				let ranges = alphabet[case_key]
				let count_total = 0
				let counts = []
				
				// count ranges
				// determine relative size of each corresponding set to determine probability
				for (let rset of ranges) {
					let count
					
					if (rset.length == 2) {
						// defined as min,max
						count = rset[1] - rset[0] + 1
					} 
					else {
						// defined as explicit collection a,b,...,z
						count = rset.length
					}
					
					counts.push(count)
					count_total += count
				}

				alphabet[KEY_COUNTS] = counts
				
				let probabilities = counts.map((c) => {
					return c / count_total
				})
				
				alphabet[KEY_PROBABILITIES] = probabilities
				
				let accum_prob = 0
				let accum_probabilities = new Array(probabilities.length)
				for (let i = 0; i < accum_probabilities.length; i++) {
					accum_prob += probabilities[i]
					accum_probabilities[i] = accum_prob
				}
				alphabet[KEY_ACCUM_PROBABILITIES] = accum_probabilities
				
				// add uniform probability distribution to options
				if (!(KEY_PROB_DIST in alphabet)) {
					alphabet[KEY_PROB_DIST] = []
				}
				alphabet[KEY_PROB_DIST].splice(0, 0, default_prob_dist)
				
				// select uniform probability distribution
				alphabet[KEY_SELECTED_PROB_DIST] = PROB_DIST_UNIFORM
				
				resolve(alphabet)
			} 
			else {
				console.log(`ERROR alphabet not found for language ${language}`)
				reject()
			}
		})
	}
	
	/**
	 * Parse alphabet probability distribution file content string as array of numbers.
	 * Called by load_alphabet_probability_dist_file.
	 * TODO don't normalize and instead include sum as part of return value.
	 * 
	 * @param {String} txt Text file content string.
	 * @param {Number} min Minimum probability for any character. If otherwise the probability
	 * of a given character is too small for Number precision, artificially set it to min.
	 *
	 * @returns Object[KEY_PROBABILITIES] array of normalized probabilities, one item per character 
	 * in the alphabet, and Object[KEY_ACCUM_PROBABILITIES] array of cumulative probabilities.
	 * Rejects undefined on failure.
	 * @type Object
	 */
	static parse_alphabet_probability_dist_str(txt, min=0) {
		return new Promise(function(resolve, reject) {
			try {
				let res = {}
				
				// parse
				let sum = 0
				let char_probs = txt.split('\n')
				// convert to floats and update sum
				.map(function(prob_str) {
					let prob = parseFloat(prob_str)
					if (!isNaN(prob)) {
						sum += prob
						return prob
					}
					else {
						return undefined
					}
				})
				// remove bad vals
				.filter(cp => cp != undefined)
				
				console.log(`DEBUG ${char_probs.length} char probs accumulate to ${sum}`)
				
				// normalize
				char_probs = char_probs.map(function(prob) {
					let norm = prob/sum
					return norm > 0 ? norm : min
				})
				
				console.log(`DEBUG normalized alphabet prob dist ${sum} --> 1`)
				res[KEY_PROBABILITIES] = char_probs
				
				// find cumulative
				sum = 0
				let char_probs_accum = char_probs.map(function(prob) {
					sum += prob
					return sum
				})
				res[KEY_ACCUM_PROBABILITIES] = char_probs_accum
				
				resolve(res)
			}
			catch (err) {
				console.log(`ERROR failed to parse prob dist string\n${txt}`)
				console.log(err)
				
				reject()
			}
		})
	}

	/**
	 * Create WordsearchGenerator from config json file.
	 *
	 * @param {String|Object} config_json Config json contents.
	 *
	 * @returns A {WordsearchGenerator} instance.
	 * @type WordsearchGenerator
	 */
	static import_config(config_json) {
		// config is js object, parse json if necessary
		let config = typeof config_json === 'string' || config_json instanceof Buffer ?
			JSON.parse(config_json) :
			config_json
		
		let wordsearch = new WordsearchGenerator(
			config[KEY_LANGUAGE],
			config[KEY_CASE],
			config[KEY_SIZE],
			config[KEY_WORDS],
			config[KEY_RANDOM_SUBSET],
			config[KEY_TITLE]
		)

		return wordsearch
	}

	/**
	 * Convert character to unicode value.
	 *
	 * @param {String} char Character.
	 *
	 * @returns Unicode value.
	 * @type Number
	 */
	static char_to_code(char) {
		return char.codePointAt(0)
	}

	/**
	 * Convert unicode value to character.
	 *
	 * @param {Number} code Unicode value.
	 *
	 * @returns Character string.
	 * @type String
	 */
	static code_to_char(code) {
		return String.fromCodePoint(code)
	}
	
	/**
	 * Convert string (including unicode with surrogate chars) to char array.
	 * If this breaks for characters w higher byte counts, try alternatives mentioned
	 * at https://github.com/ogallagher/wordsearch_generator/issues/27.
	 *
	 * @param {String} str Describe this parameter
	 *
	 * @returns Char array.
	 * @type Array
	 */
	static string_to_array(str) {
		let arr = []
		
		for (let i=0; i < str.length; i++) {
			let char = WordsearchGenerator.whole_char_at(str,i)
			if (char !== false) {
				arr.push(char)
			}
			// else, skip subchar
		}
		
		return arr
	}
	
	/**
	 * Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt#getting_whole_characters
	 *
	 * @param {String} str .
	 * @param {Number} i .
	 *
	 * @returns The character, or {false} if index is a surrogate character.
	 * @type String|Boolean
	 */
	static whole_char_at(str, i) {
		var code = str.charCodeAt(i)
		
		if (Number.isNaN(code)) {
			return '' // Position not found
		}
		if (code < 0xD800 || code > 0xDFFF) {
			return str.charAt(i)
		}

		// High surrogate (could change last hex to 0xDB7F to treat high private
		// surrogates as single characters)
		if (0xD800 <= code && code <= 0xDBFF) {
			if (str.length <= (i + 1)) {
				throw 'High surrogate without following low surrogate'
			}
			var next = str.charCodeAt(i + 1)
			if (0xDC00 > next || next > 0xDFFF) {
				throw 'High surrogate without following low surrogate';
			}
			return str.charAt(i) + str.charAt(i + 1)
		}
		// Low surrogate (0xDC00 <= code && code <= 0xDFFF)
		if (i === 0) {
			throw 'Low surrogate without preceding high surrogate'
		}
		var prev = str.charCodeAt(i - 1)

		// (could change last hex to 0xDB7F to treat high private
		// surrogates as single characters)
		if (0xD800 > prev || prev > 0xDBFF) {
			throw 'Low surrogate without preceding high surrogate'
		}
		// We can pass over low surrogates now as the second component
		// in a pair which we have already processed
		return false
	}
}

if (typeof exports != 'undefined') {
	// export WordsearchGenerator class
	exports.WordsearchGenerator = WordsearchGenerator
	
	// export useful constants
	exports.environment_promise = environment_promise
	
	exports.WIDTH_DEFAULT = WIDTH_DEFAULT
	exports.WORD_CLUE_DELIM = WORD_CLUE_DELIM
	exports.KEY_LANGUAGE = KEY_LANGUAGE
	exports.KEY_CASE = KEY_CASE
	exports.KEY_PROB_DIST = KEY_PROB_DIST
	exports.KEY_PD_NAME = KEY_PD_NAME
	exports.KEY_PD_DESC = KEY_PD_DESC
	exports.KEY_PD_FILE = KEY_PD_FILE
	exports.KEY_PD_DIR = KEY_PD_DIR
	
	exports.KEY_SIZE = KEY_SIZE
	exports.KEY_WORDS = KEY_WORDS
	exports.KEY_RANDOM_SUBSET = KEY_RANDOM_SUBSET
	exports.KEY_TITLE = KEY_TITLE
	
	// console.log(`DEBUG ${exports}`)
} 
else {
	// export scoped constants as class vars
	WordsearchGenerator.environment_promise = environment_promise
	
	WordsearchGenerator.WIDTH_DEFAULT = WIDTH_DEFAULT
	WordsearchGenerator.WORD_CLUE_DELIM = WORD_CLUE_DELIM
	WordsearchGenerator.KEY_LANGUAGE = KEY_LANGUAGE
	WordsearchGenerator.KEY_CASE = KEY_CASE
	WordsearchGenerator.KEY_PROB_DIST = KEY_PROB_DIST
	WordsearchGenerator.KEY_PD_NAME = KEY_PD_NAME
	WordsearchGenerator.KEY_PD_DESC = KEY_PD_DESC
	WordsearchGenerator.KEY_PD_FILE = KEY_PD_FILE
	WordsearchGenerator.KEY_PD_DIR = KEY_PD_DIR
	
	WordsearchGenerator.KEY_SIZE = KEY_SIZE
	WordsearchGenerator.KEY_WORDS = KEY_WORDS
	WordsearchGenerator.KEY_RANDOM_SUBSET = KEY_RANDOM_SUBSET
	WordsearchGenerator.KEY_TITLE = KEY_TITLE

	// console.log(`DEBUG no exports`)
}
