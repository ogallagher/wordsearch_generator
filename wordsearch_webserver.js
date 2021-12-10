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
	import('cors')
])
.then(function(modules) {
	try {
		const express = modules[0].default
		const cors = modules[1].default
		
		// constants
		const port = process.env.PORT || 80
	
		// cross origin request origins
		const origins = [
			'http://localhost',	'http://127.0.0.1',		// local testing (same device)
		]
	
		const PUBLIC_DIR = script_dir()
		console.log(`DEBUG serving ${PUBLIC_DIR}/`)
		
		// server instance
		const server = express()

		// enable cross-origin requests for same origin html imports
		server.use(cors({
			origin: function(origin,callback) {
				if (origin != null && origins.indexOf(origin) == -1) {
					console.log(`cross origin request failed for ${origin}`)
					return callback(new Error('CORS for origin ' + origin + ' is not allowed access.'), false)
				}
				else {
					return callback(null,true)
				}
			}
		}))
	
		server.set('port', port)
	
		// serve website from public/
		server.use(express.static(PUBLIC_DIR))
	
		// route root path to wordsearch generator page
		server.get('/', function(req,res,next) {
			console.log(`routing root path to /wordsearch_generator.html`)
			res.sendFile(`./wordsearch_generator.html`, {
				root: PUBLIC_DIR
			})
		})
		
		// http server
		server.listen(server.get('port'), on_start)
	
		// methods
	
		function on_start() {
			console.log('server running')
		}
	}
	catch (err) {
		console.error(err)
		process.exit(1)
	}
})
.catch((err) => {
	console.error(err)
	console.error('make sure you run the `npm install` command to get needed node modules first')
	process.exit(1)
})

import { fileURLToPath as file_url_to_path } from 'url';
import { dirname } from 'path';

/**
 * Get parent directory of this script, being a nodejs module.
 * Derived from https://stackoverflow.com/a/62892482/10200417
 */
function script_dir() {
	let file = file_url_to_path(import.meta.url)
	let dir = dirname(file)
	
	return dir
}
