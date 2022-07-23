/*

Owen Gallagher <github.com/ogallagher>
2021-01-22

*/

const EX_CFG_FILE_CMP_PATH = '/ex_cfg_file_webcomponent.html'
const EX_CFG_FILES_PATH = '/api/list_ex_cfg_files'
const EX_CFG_FILE_PATH = '/api/ex_cfg_file'

// fetch example config files list
let ex_cfg_files_fetch_promise = new Promise(function(resolve, reject) {
	let url = USE_WP_HOST_URL
		? `${WP_HOST_URL}${EX_CFG_FILES_PATH}`
		: EX_CFG_FILES_PATH
	console.log(`DEBUG fetch ex cfg files list at ${url}`)
	
	$.ajax({
		method: 'GET',
		url: url,
		dataType: 'json',
		success: function(ex_cfg_files) {
			console.log(`DEBUG fetched ex cfg files:\n${ex_cfg_files.join('\n')}`)
			resolve(ex_cfg_files)
		},
		error: function(err) {
			console.log(`ERROR failed to list ex cfg files at ${url}`)
			reject()
		}
	})
})

// load example cfg file chooser component
let ex_cfg_file_cmp_promise = new Promise(function(resolve, reject) {
	let url = USE_WP_HOST_URL
		? `${WP_HOST_URL}${EX_CFG_FILE_CMP_PATH}`
		: EX_CFG_FILE_CMP_PATH
	console.log(`DEBUG fetch ex cfg file cmp at ${url}`)
	
	$.ajax({
		method: 'GET',
		url: url,
		dataType: 'html',
		success: function(component_html) {
			resolve(component_html)
		},
		error: function(err) {
			console.log(`ERROR failed to get ex cfg file chooser component at ${url}`)
			reject()
		}
	})
})

function load_cfg_file(file) {
	return new Promise(function(resolve, reject) {
		let url = USE_WP_HOST_URL
			? `${WP_HOST_URL}${EX_CFG_FILE_PATH}`
			: `${EX_CFG_FILE_PATH}`
		
		$.ajax({
			method: 'GET',
			url: url,
			dataType: 'json',
			data: {
				filename: file
			},
			success: function(res) {
				if (res.error != undefined) {
					console.log(`ERROR failed to load ex cfg file\n${res.error}`)
					reject()
				}
				else {
					resolve(res.file)
				}
			},
			error: function(err) {
				console.log(`ERROR failed to load example config file at ${url}`)
				reject()
			}
		})
	})
}

function set_use_ex_cfg(use_ex_cfg, wordsearch_id) {
	let wordsearch_cont_jq = $(`#${wordsearch_id}`)
	let file_opts_jq = wordsearch_cont_jq.find('.ex-cfg-file-options')
	
	if (use_ex_cfg) {
		// show file options
		file_opts_jq.removeClass('d-none')
	}
	else {
		// hide file options
		file_opts_jq.addClass('d-none')
	}
	
	wordsearch_cont_jq.find('.ex-cfg-file-button')
	.attr('data-on', use_ex_cfg)
}

function ex_cfg_file_main(wordsearch_component) {
	// defined in wordsearch_webpage.js
	wordsearch_webpage_promise
	.then(() => {
		return Promise.all([
			ex_cfg_files_fetch_promise,
			ex_cfg_file_cmp_promise
		])
	})
	.catch(() => {
		console.log('ERROR failed to load example config file chooser')
	})
	// add example config file selector to each wordsearch generator
	.then(function(cff_cfc) {
		let cfg_files = cff_cfc[0]
		let cmp_html = cff_cfc[1]
		console.log(`DEBUG loaded ex cfg file component of length ${cmp_html.length}`)
	
		// convert to jq elements
		let cmp_jq = $(cmp_html)
	
		let wordsearch_containers_selector = 
			$('#wordsearch-webpage-component-driver').attr('data-containers')
		if (wordsearch_containers_selector == undefined) {
			wordsearch_containers_selector = DEFAULT_WORDSEARCH_CONTAINERS_SELECTOR
		}
		
		if (wordsearch_component == undefined) {
			wordsearch_component = $('.wordsearch-component')
		}
		
		wordsearch_component.each(function(idx) {
			console.log(`DEBUG load example config file chooser ${idx}`)
		
			// select component
			let ex_cfg_file_jq = cmp_jq.find('.ex-cfg-file-component').clone()
		
			let wordsearch_jq = $(this)
			let wordsearch_id = wordsearch_jq.attr('id')
		
			// reference wordsearch id
			ex_cfg_file_jq.attr('data-wordsearch-id', wordsearch_id)
		
			// load ex config file options
			let file_opt_temp = cmp_jq.find('.ex-cfg-file-option')
			let file_opts_jq = ex_cfg_file_jq.find('.ex-cfg-file-options')
			for (let cfg_file of cfg_files) {
				let file_opt_jq = file_opt_temp.clone()
			
				file_opt_jq.find('.ex-cfg-file-name').html(cfg_file)
			
				// handle cfg file option select
				file_opt_jq.on('click', function() {
					load_cfg_file(cfg_file)
					.catch(() => {
						console.log('ERROR unable to use ex config file')
					})
					.then(function(cfg_file_str) {					
						// load wordsearch from file
						wordsearch_description_json[wordsearch_id] = cfg_file_str
						on_wordsearch_config_file(wordsearch_id, wordsearch_description_json[wordsearch_id])
					
						// update use_ex_cfg
						set_use_ex_cfg(false, wordsearch_id)
					})
				})
			
				file_opts_jq.append(file_opt_jq)
			}
		
			// handle control
			ex_cfg_file_jq.find('.ex-cfg-file-button')
			.on('click', function() {
				set_use_ex_cfg(!is_on($(this)), wordsearch_id)
			})
		
			// insert after local cfg file chooser
			wordsearch_jq.find('.wordsearch-file')
			.after(ex_cfg_file_jq)
		})
	})
}

ex_cfg_file_main()
