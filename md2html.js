/**
 * Compile markdown to html components that can be included in webpages.
 */

const ShowdownConverter = require('showdown').Converter
const fs = require('fs/promises')
const path = require('path')

// markdown-html converter
const md_html_converter = new ShowdownConverter({
    omitExtraWLInCodeBlocks: true,
    customizedHeaderId: true,
    ghCompatibleHeaderId: true,
    tables: true,
    tasklists: true,
    completeHTMLDocument: false
})

/**
 * Compile markdown source file to html file.
 * 
 * @param {string} md_path Source file path.
 * @param {string} html_path? Dest file path. Default is same as source, with `.html` extension.
 */
function compile(md_path, html_path) {
    if (html_path === undefined) {
        html_path = path.join(path.dirname(md_path), path.basename(md_path, '.md'), '.html')
    }

    console.log(`info compile ${md_path} to ${html_path}`)

    return fs.readFile(md_path, {encoding: 'utf-8'})
    .then(
        (md_content) => {
            console.log(`debug loaded markdown of length ${md_content.length} from ${md_path}`)
            try {
                let html_content = md_html_converter.makeHtml(md_content)
                
                return fs.writeFile(html_path, html_content, {encoding: 'utf-8'})
                .then(
                    () => {
                        return Promise.resolve(
                            `info wrote html of length ${html_content.length} to ${html_path}`
                        )
                    },
                    (err) => {
                        return Promise.reject(`error failed to write to ${html_path}. ${err}`)
                    }
                )
            }
            catch (err) {
                return Promise.reject(`error failed to compile ${md_path}. ${err}`)
            }
        },
        (err) => {
            return Promise.reject(`error failed to load ${md_path}. ${err}`)
        }
    )
}
exports.compile = compile
