/*

Owen Gallagher <github.com/ogallagher>
2021-01-22

*/

const EX_CFG_FILE_CMP_PATH = '/ex_cfg_file_webcomponent.html'
const EX_CFG_FILES_PATH = '/api/list_ex_cfg_files'

// fetch example config files list
let ex_cfg_files_fetch_promise = new Promise(function(resolve, reject) {
	let url = USE_WP_HOST_URL
		? `${WP_HOST_URL}${EX_CFG_FILES_PATH}`
		: EX_CFG_FILES_PATH
	
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

Promise.all([
	// defined in wordsearch_webpage.js
	wordsearch_webpage_promise,
	ex_cfg_files_fetch_promise,
	ex_cfg_file_cmp_promise
])
.catch(() => {
	console.log('ERROR failed to load example config file chooser')
})
// add example config file selector to each wordsearch generator
.then(function(ww_cff_cfc) {
	let cfg_files = ww_cff_cfc[1]
	let cmp_html = ww_cff_cfc[2]
	console.log(`DEBUG loaded ex cfg file component of length ${cmp_html.length}`)
	
	// convert to jq elements
	let cmp_jq = $(cmp_html)
	
	let wordsearch_containers_selector = 
		$('#wordsearch-webpage-component-driver').attr('data-containers')
	if (wordsearch_containers_selector == undefined) {
		wordsearch_containers_selector = DEFAULT_WORDSEARCH_CONTAINERS_SELECTOR
	}
	
	$('.wordsearch-component').each(function(idx) {
		console.log(`DEBUG load example config file chooser ${idx}`)
		
		// select component
		let ex_cfg_file_jq = cmp_jq.find('.ex-cfg-file-component').clone()
		
		let wordsearch_jq = $(this)
		
		// reference wordsearch id
		ex_cfg_file_jq.attr('data-wordsearch-id', wordsearch_jq.attr('id'))
		
		// load ex config file options
		let file_opt_temp = cmp_jq.find('.ex-cfg-file-option')
		let file_opts_jq = ex_cfg_file_jq.find('.ex-cfg-file-options')
		for (let cfg_file of cfg_files) {
			let file_opt_jq = file_opt_temp.clone()
			
			file_opt_jq.find('.ex-cfg-file-name').html(cfg_file)
			
			file_opts_jq.append(file_opt_jq)
		}
		
		// handle control
		ex_cfg_file_jq.find('.ex-cfg-file-button')
		.on('click', function() {
			
		})
		
		// insert after local cfg file chooser
		wordsearch_jq.find('.wordsearch-file')
		.after(ex_cfg_file_jq)
	})
})
