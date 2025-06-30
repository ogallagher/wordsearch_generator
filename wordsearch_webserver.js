#!node

/*

Owen Gallagher <github.com/ogallagher>
2021-11-28

Wordsearch generator webserver.

*/

// import method instead of nodejs keyword is allowed to be placed outside
// the module's base scope, allowing for custom import error handling as shown
Promise.all([
	import('express'),
	import('cors'),
	import('dotenv'),
	import('fs'),
	import('path'),
	import('temp_js_logger').then(
		(temp_logger_module) => {
			// init logging
			temp_logger_module.config({
				level: 'debug',
				with_timestamp: false,
				caller_name: 'wordsearch_webserver',
				with_lineno: true,
				parse_level_prefix: true,
				with_level: true,
				with_always_level_name: false,
				with_cli_colors: true
			})
			.then(() => {
				return temp_logger_module.default
			})
		},
		(err) => {
			console.log(`error failed to import temp_js_logger. ${err}`)
			return undefined
		}
	),
	import('body-parser'),
	import('./quizcard-generator/quizcard_generator.js').then(
		(mod) => mod,
		(err) => {
			console.log(`error failed to import quizcard-generator. ${err}`)
			return undefined
		}
	),
	import('./md2html.js').then(
		(mod) => mod,
		(err) => {
			console.log(`error failed to import md2html. ${err}`)
			return undefined
		}
	)
])
.then(function(modules) {
	try {
		const express = modules[0].default
		const cors = modules[1].default
		const dotenv = modules[2].default
		const fs = modules[3].default
		const path = modules[4].default
		const body_parser = modules[6].default
		const quizgen = modules[7]
		const md2html = modules[8]
		
		// load .env into process.env
		dotenv.config()
	
		// constants
		const port = process.env.PORT || 80
		/**
		 * @type {string}
		 */
		const proxy_path_wordsearch = process.env.PROXY_SERVER_PATH_WORDSEARCH || '/wordsearch'

		let PUBLIC_DIR
		if (process.env.IS_DREAMHOST) {
			PUBLIC_DIR = './public'
		}
		else {
			// module syntax
			// PUBLIC_DIR = script_dir()
		
			PUBLIC_DIR = `${__dirname}/public`
		}
		console.log(`DEBUG serving ${PUBLIC_DIR}/`)
	
		const EX_CFG_FILES_DIR = 'example_cfg_files'
	
		// server instance
		const server = express()
	
		// enable cross-origin requests for same origin html imports
		server.use(cors({
			// allow all origins
			origin: '*'
		}))

		// enable POST requests
		server.use(body_parser.json({
			strict: true,
			limit: '10MB'
		}))
	
		server.set('port', port)

		// handle proxy server of public/		
		if (proxy_path_wordsearch !== '') {
			let proxy_path = proxy_path_wordsearch
			console.log(`INFO create reference to public dir under proxy path ${proxy_path}`)
			// remove absolute path syntax leading slash
			proxy_path = proxy_path.substring(1)
			if (!fs.existsSync(proxy_path)) {
				fs.mkdirSync(proxy_path, {recursive: true})
			}
			try {
				fs.symlinkSync(PUBLIC_DIR, path.join(proxy_path, path.basename(PUBLIC_DIR)), 'dir')
			}
			catch (err) {
				console.log(`INFO skip symlink. ${err}`)
			}
		}
		// serve website from public/
		server.use(express.static(
			(
				proxy_path_wordsearch === '' 
				? `${PUBLIC_DIR}`
				: path.join(proxy_path_wordsearch.substring(1), path.basename(PUBLIC_DIR))
			)
		))
	
		// route root path to wordsearch generator page
		server.get('/', function(req,res,next) {
			console.log(`INFO routing root path to /wordsearch_generator.html`)
			res.sendFile(`./wordsearch_generator.html`, {
				root: PUBLIC_DIR
			})
		})
	
		// route api calls
		server.get('/api/list_ex_cfg_files', function(req, res) {
			list_ex_cfg_files()
			.then((result) => {
				res.json(result)
			})
		})
	
		server.get('/api/ex_cfg_file', function(req, res) {
			let file_path = path.join(PUBLIC_DIR, EX_CFG_FILES_DIR, req.query.filename)
			fs.readFile(file_path, 'utf8', function(err, data) {
				if (err) {
					console.log(`ERROR failed to get cfg file ${file_path}`)
					console.log(err)
					res.json({
						error: err
					})
				}
				else {
					console.log(`DEBUG read ex cfg file of length ${data.length}`)
					res.json({
						file: data
					})
				}
			})
		})

		// compile markdown pages
		if (md2html !== undefined) {
			fs.mkdir(
				path.join(PUBLIC_DIR, 'out/webserver/wordsearch-generator'),
				{ recursive: true },
				() => {
					const readme_html_path = path.join(PUBLIC_DIR, 'out/webserver/wordsearch-generator', 'readme.html')
					md2html.compile(
						path.join('.', 'readme.md'),
						readme_html_path,
						// handle proxy server of public/docs
						(proxy_path_wordsearch === '' ? undefined : [
							['docs/img', `${proxy_path_wordsearch}/docs/img`]
						])
					)
				}
			)

			// compile translated markdown pages
		}

		// serve quizcard generator page
		if (quizgen !== undefined) {
			console.log('info serving quizcard-generator')
			import('./quizcard_webserver.js')
			.then((quizcard_server) => quizcard_server.main(server, PUBLIC_DIR))
		}
		else {
			console.log('info quizcard-generator not available')
		}
	
		// http server
		server.listen(server.get('port'), on_start)
		
		// methods
	
		function on_start() {
			console.log('INFO server running')
		}
	
		function list_ex_cfg_files() {
			console.log(`INFO listing example config files`)
		
			// Function to get current filenames
			// in directory with specific extension
			let ex_cfg_files_dir = path.join(PUBLIC_DIR, EX_CFG_FILES_DIR)
		
			return new Promise(function(resolve, reject) {
				fs.readdir(ex_cfg_files_dir, function(err, files) {
					if (err) {
						console.log(`ERROR failed to list files in ${ex_cfg_files_dir}`)
						console.log(err)
						reject({
							error: err
						})
					}
					else {
						console.log(`INFO found ${files.length} example files`)
						let ex_cfg_files = files
						.map(function(file) {
							if (path.extname(file) == '.json') {
								console.log(`DEBUG\t${file}`)
								return file
							}
						})
						.filter(file => file != undefined)
					
						resolve(ex_cfg_files)
					}
				})
			})
		}
	}
	catch (err) {
		console.error(err.stack)
		process.exit(1)
	}
})
.catch((err) => {
	console.error(err)
	console.error('ERROR make sure you run the `npm install` command to get needed node modules first')
	process.exit(1)
})

// module syntax
/*
import { fileURLToPath as file_url_to_path } from 'url';
import { dirname } from 'path';

/**
 * Get parent directory of this script, being a nodejs module.
 * Derived from https://stackoverflow.com/a/62892482/10200417
 * /
function script_dir() {
	let file = file_url_to_path(import.meta.url)
	let dir = dirname(file)
	
	return dir
}
*/

