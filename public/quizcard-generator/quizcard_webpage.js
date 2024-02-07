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
		
        let parent_selector = QUIZGEN_CONTAINERS_PARENT_SELECTOR
        let quizgen_jq = $(quizgen_html)
        console.log(quizgen_jq)

        // uniquely identify

        // append to container
        $(parent_selector).append(quizgen_jq)

        // etc
	})
}