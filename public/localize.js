/**
 * Handle frontend localization (page translation).
 */

/**
 * Supported locales. 
 * Key is 3-char language code, value is language name.
 */
const locales = {
    'eng': 'English',
    'spa': 'Español'
}

const LOCALE_COOKIE = 'locale_lang'

function localize_select_language(opt_query_selector, label_query_selector) {
    console.log(`debug localize_select_language()`)
    /**
     * @type {NodeListOf<HTMLElement>}
     */
    let language_opts = document.querySelectorAll(opt_query_selector)
    language_opts.forEach((language_opt) => {
        language_opt.addEventListener('click', (mouse_event) => {
            /**
             * @type {HTMLElement}
             */
            let self = mouse_event.target
            /**
             * @type {string}
             */
            let locale_key = self.getAttribute('data-locale')
            console.log(`info select locale key=${locale_key}`)
            localize_set_language(locale_key, label_query_selector)
        })
    })

    // get saved language from cookie
    let locale_key = cookies_get(LOCALE_COOKIE)
    if (locale_key !== null) {
        console.log(`info select locale key=${locale_key} from cookie ${LOCALE_COOKIE}`)
        localize_set_language(locale_key, label_query_selector)
    }
}

function localize_set_language(locale_key, label_query_selector) {
    // update label
    /**
     * @type {HTMLElement}
     */
    let label = document.querySelector(label_query_selector)
    label.setAttribute('data-locale', locale_key)
    label.innerText = locales[locale_key]

    // update locale cookie
    cookies_set(LOCALE_COOKIE, locale_key)

    localize_on_language(locale_key)
}

/**
 * Locale language update handler.
 * 
 * @param {string} locale_key 
 */
function localize_on_language(locale_key) {
    console.log(`debug locale language handler not yet defined for ${locale_key}`)
}