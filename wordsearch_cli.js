#!node

/**
 * Owen Gallagher
 * 2021-11-27
 */

// node version

const NODE_VERSION = process.version
const NV_MAJOR = parseInt(NODE_VERSION.substring(1, NODE_VERSION.indexOf('.')))

// external imports

// module syntax
// import fs from 'fs'
// import rl from 'readline'

// common syntax
const fs = require('fs')
const rl = require('readline')
let temp_logger
try {
	temp_logger = require('temp_js_logger')
}
catch (import_err) {
	console.log('info skip missing module temp_js_logger')
}

// local imports

/* this doesn't work with NV_MAJOR < 14
import { 
	etc
} from './wordsearch_generator.cjs'
*/
const wg = require('./wordsearch_generator.js')
const WordsearchGenerator = wg.WordsearchGenerator
const WIDTH_DEFAULT = wg.WIDTH_DEFAULT
const WORD_CLUE_DELIM = wg.WORD_CLUE_DELIM
const KEY_LANGUAGE = wg.KEY_LANGUAGE
const KEY_CASE = wg.KEY_CASE
const KEY_SIZE = wg.KEY_SIZE
const KEY_WORDS = wg.KEY_WORDS
const KEY_RANDOM_SUBSET = wg.KEY_RANDOM_SUBSET
const KEY_SELECTED_PROB_DIST = wg.KEY_SELECTED_PROB_DIST
const KEY_PROB_DIST = wg.KEY_PROB_DIST
const PROB_DIST_UNIFORM = wg.PROB_DIST_UNIFORM
const KEY_PD_NAME = wg.KEY_PD_NAME
const KEY_PD_FILE = wg.KEY_PD_FILE
const KEY_CHARSET = wg.KEY_CHARSET

const DEFAULT_ALPHABET = 'en'

const cli = rl.createInterface({
	input: process.stdin,
	output: process.stdout
})
let word_count = 0
let word_clues

// init logging
temp_logger?.config({
	level: 'info',
	with_timestamp: false,
	caller_name: 'wordsearch_cli',
	with_lineno: true,
	parse_level_prefix: true,
	with_level: true,
	with_always_level_name: false,
	with_cli_colors: true
})

/**
 * CLI driver module wordsearch instance.
 * 
 * @type {wg.WordsearchGenerator}
 */
let wordsearch

const OPT_LOG_LEVEL = 'log-level'
const OPT_LOG_LEVEL_DEFAULT = 'info'

wg.environment_promise
.then(cli_args)
.then((argv) => {
	if (argv === undefined) {
		argv = {
			OPT_LOG_LEVEL: OPT_LOG_LEVEL_DEFAULT
		}
	}
	main(argv[OPT_LOG_LEVEL])
})

function main(log_level) {
	temp_logger?.set_level(log_level)

	cli.question('create with file (f) or interactively (i)? ', (input_mode) => {
		if (input_mode == 'f') {
			cli.question('wordsearch json description file: ', (input_file) => {
				cli.close()
				
				fs.readFile(input_file, function(err, input_json) {
					if (err) {
						console.log(`ERROR wordsearch description file ${input_file} not found`)
					}
					else {
						on_file_load(input_json)
					}
				})
			})
		}
		else {
			WordsearchGenerator.get_alphabet_aliases()
			.then(function(aliases) {
				alphabet_options = JSON.stringify(Object.keys(aliases), null, 1)
				
				cli.question(
					`\n${alphabet_options}\nwordsearch alphabet (default=${DEFAULT_ALPHABET}): `, 
					function(alphabet_key) {
						if (alphabet_key == '') {
							alphabet_key = DEFAULT_ALPHABET
						}
					
						case_key = 'lower'
					
						cli.question('wordsearch size (<size> or <width> <height>) ', function(size) {
							let width = WIDTH_DEFAULT
							let height = WIDTH_DEFAULT
							if (size != '') {
								size = size.split(/\D+/)
							
								width = parseInt(size[0])
								height = width
							
								if (size.length > 1) {
									// rectangle
									height = parseInt(size[1])
								}
							}
						
							console.log(`INFO size = ${width} ${height}`)
						
							wordsearch = new WordsearchGenerator(
								alphabet_key,
								case_key,
								[width, height]
							)
							
							wordsearch.init_promise
							.then(set_alphabet_charset)
							.then(set_alphabet_prob_dist)
							.then(() => {
								wordsearch.randomize_cells()
							})
							.then(on_alphabet_load)
						})
					}
				)
			})
		}
	})
}

function cli_args() {
	return new Promise(function(res) {
		import('yargs/yargs')
		.then((yargs_module) => {
			import('yargs/helpers')
			.then((helpers_module) => {
				const argv = yargs_module.default(
					helpers_module.hideBin(process.argv)
				)
				.usage('Launches the wordsearch generator via CLI driver.')

				.alias('help', 'h')

				.describe(OPT_LOG_LEVEL, 'logging level')
				.alias(OPT_LOG_LEVEL, 'l')
				.choices(OPT_LOG_LEVEL, ['debug', 'info', 'warning', 'error'])
				.default(OPT_LOG_LEVEL, OPT_LOG_LEVEL_DEFAULT)

				.alias('version', 'v')

				.parse()

				res(argv)
			})
		})
		.catch((err) => {
			console.log('warning cli args not supported without yargs dependency. ' + err)
			console.log('debug yargs error stack: ' + err.stack)
			res(undefined)
		})
	})
}

function set_alphabet_prob_dist() {
	return new Promise(function(resolve) {
		// only select from prob dists if charset doesn't define one itself
		if (wordsearch.get_selected_prob_dist() == PROB_DIST_UNIFORM) {
			prob_dists = wordsearch.alphabet[KEY_PROB_DIST]
		
			cli.question(
				`select a probability distribution\n${
					JSON.stringify(prob_dists,null,2)
				}\ndistribution name (default=uniform): `,
				(pd_name) => {
					wordsearch.set_probability_distribution(pd_name)
					.then(resolve)
				}
			)
		}
		else {
			resolve()
		}
	})
}

function set_alphabet_charset() {
	return new Promise(function(resolve) {
		charsets = wordsearch.alphabet[KEY_CHARSET]
		if (charsets == undefined) {
			charsets = []
		}
		
		// add default as visible option
		charsets.splice(0, 0, 'default')
		
		cli.question(
			`select a charset\n${
				JSON.stringify(charsets, null, 2)
			}\ncharset (default=default): `,
			(charset_name) => {
				wordsearch.set_charset(charset_name)
				.then(resolve)
			}
		)
	})
}

function on_alphabet_load() {
	cli.question('add words with file (f) or interactively (i)? ', function(input_mode) {
		input_mode = input_mode == '' ? 'f' : input_mode
		
		if (input_mode == 'f') {
			cli.question(`word-clue delimiter (default=${WORD_CLUE_DELIM}) `, function(delim) {
				delim = delim == '' ? WORD_CLUE_DELIM : delim
				
				cli.question('words dsv file: ', function(words_file_path) {
					cli.close()
					
					wordsearch.add_word_clues(
						words_file_path, 
						wordsearch.random_subset, 
						undefined, 
						delim
					)
					.then(print_wordsearch)
				})
			})
		}
		else {
			cli.question('how many words? ', (word_count_str) => {
				word_count_str = word_count_str == '' ? '0' : word_count_str
				word_count = 0
				word_clues = new Array(parseInt(word_count_str))
		
				if (word_clues.length > 0) {
					console.log(`ALWAYS word${WORD_CLUE_DELIM}clue`)
					next_word_clue()
					.then(() => {
						cli.close()
						return load_word_clues(word_clues)
					})
					.then(print_wordsearch)
				}
				else {
					cli.close()
					print_wordsearch()
				}
			})
		}
	})
}

async function on_file_load(input_json) {
	wordsearch = await WordsearchGenerator.import_config(input_json)
	await wordsearch.init_promise
	print_wordsearch()
}

function next_word_clue() {
	return new Promise(function(resolve) {
		cli.question(`${word_count+1} = `, (word_clue) => {
			word_clues[word_count++] = word_clue
			
			if (word_count < word_clues.length) {
				// console.log(`${word_count} < ${word_clues.length}`)
				next_word_clue()
				.then(resolve)
			}
			else {
				resolve()
			}
		})
	})
}

function load_word_clues(word_clues, clue_delim=WORD_CLUE_DELIM) {
	const long_dimension = Math.max(wordsearch.width, wordsearch.height)

	for (let word_clue of word_clues) {
		let array = word_clue.split(clue_delim)
		
		let word = array[0]
		let clue = word
		if (array.length == 2) {
			clue = array[1]
		}
		
		if (word.length <= long_dimension) {
			if (!wordsearch.add_word_clue(word,clue)) {
				console.log(`ERROR failed to find a place for ${word}`)
			}
		}
		else {
			console.log(`ERROR ${word} length ${word.length} longer than board long dimension ${long_dimension}`)
		}
	}
	
	return Promise.resolve()
}

function print_wordsearch() {
	const cli_print = (
		temp_logger !== undefined
		? temp_logger.TempLogger.CONSOLE_METHOD['log']
		: console.log
	)

	if (wordsearch.title !== undefined) {
		cli_print(`\n${
			wordsearch.title
		}\n${
			new Array(wordsearch.title.length).fill('-').join('')
		}\n`)
	}
	
	cli_print(`\n${wordsearch.grid_string()}\n`)
	
	cli_print(`clues:\n\n${wordsearch.clues.join('\n')}\n`)
}
