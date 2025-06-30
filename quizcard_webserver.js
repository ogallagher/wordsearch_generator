const { AnkiNote } = require('./quizcard-generator/anki/anki_generator')
const { QuizCardGenerator, opt } = require('./quizcard-generator/quizcard_generator')
const { Express } = require('express')
const fs = require('fs/promises')
const md2html = require('./md2html')
const path = require('path')

const DIR = 'quizcard-generator'
const MAIN_PAGE = 'quizcard_generator.html'
const ANKI_DIR = `out/webserver/anki`

/**
 * 
 * @param {Express} server Existing server to which quizcard is added.
 * @param {string} public_dir Path to public assets directory.
 */
function main(server, public_dir) {
    const DELETE_EXPORTS = process.env.DELETE_EXPORTS || true
    const EXPORT_DELETE_DELAY_MIN = process.env.EXPORT_DELETE_DELAY_MIN || 1

    // compile quizgen markdown pages
    md2html.compile(
        path.join(DIR, 'readme.md'), 
        path.join(public_dir, 'out/webserver', DIR, 'readme.html')
    )
    // compile translated markdown pages
    for (let locale_path of [
        'spa/readme.md'
    ]) {
        fs.mkdir(
            path.join(public_dir, 'out/webserver', DIR, 'translations', path.dirname(locale_path)),
            { recursive: true }
        )
        .then(() => {
            md2html.compile(
                path.join(DIR, 'i18n', locale_path),
                path.join(
                    public_dir, 'out/webserver', DIR, 'translations',
                    path.dirname(locale_path), 
                    path.basename(locale_path, '.md') + '.html'
                )
            )
        })
    }
    

    // main page
    server.get(`/${DIR}`, function(_req, res) {
        console.log(`info quizgen root path to ${MAIN_PAGE}`)
        res.sendFile(`./${DIR}/${MAIN_PAGE}`, {
            root: public_dir
        })
    })

    // api/preview
    server.post(`/${DIR}/api/preview`, function(req, res) {
        console.log(`debug content-type header = ${req.headers['content-type']}`)
        generator(req.body)
        .then((anki_notes) => {
            res.json({
                anki_notes: anki_notes.map(
                    (note) => note.toString(
                        undefined, 
                        req.body[opt.OPT_TAG]?.join(AnkiNote.SEPARATOR)
                    )
                ),
                anki_notes_header: AnkiNote.header(
                    anki_notes.length,
                    undefined,
                    opt.clean_opts(req.body)
                )
            })
        })
    })

    // api/generate
    server.post(`/${DIR}/api/generate`, function(req, res) {
        /**
         * @type {opt.OptArgv}
         */
        const opts = req.body

        let notes_name = opts[opt.OPT_NOTES_NAME]
        if (notes_name === undefined) {
            notes_name = 'quizgen-anki-notes'
        }

        generator(opts)
        .then((anki_notes) => {
            // add unique suffix
            notes_name += '-' + new Date().toISOString().replace(/[:\s]/g, '-')
            console.log(`info anki notes name = ${notes_name}`)

            // create local anki notes file
            return AnkiNote.export(
                anki_notes,
                notes_name,
                `${public_dir}/${ANKI_DIR}`,
                undefined,
                opts[opt.OPT_TAG],
                opt.clean_opts(opts)
            )
        })
        .then((export_bytes) => {
            // send anki notes file for download
            const file_path = `/${ANKI_DIR}/${notes_name}.txt`
            res.json({
                file_path: file_path,
                file_size: export_bytes,
                file_size_unit: 'B',
                file_expiry: EXPORT_DELETE_DELAY_MIN,
                file_expiry_unit: 'minute'
            })

            if (DELETE_EXPORTS) {
                setTimeout(
                    () => delete_file(`${public_dir}${file_path}`),
                    // delete file after so many minutes
                    EXPORT_DELETE_DELAY_MIN * (1000 * 60)
                )
            }
            else {
                console.log(`info skip delete ${file_path} after send`)
            }
        })
    })
}
exports.main = main

/**
 * Instantiate a QuizCardGenerator given options provided by a web client.
 * 
 * @param {opt.OptArgv} opts
 * @param quizgen
 */
function generator(opts) {
    console.log(`debug generator(${JSON.stringify(
        opts, 
        (key, val) => {
            if (key === opt.OPT_INPUT_FILE_CONTENT) {
                // show reduced preview
                return val.substring(0, 1500) + '...'
            }
            else {
                return val
            }
        }, 
        2
    )})`)
    const input_file_path = opts[opt.OPT_INPUT_FILE]

    console.log('debug new quizgen instance')
    const qg = new QuizCardGenerator(
        opts[opt.OPT_INPUT_FILE_CONTENT],
        input_file_path,
        opts[opt.OPT_EXCLUDE_WORD]
        // and parse strings, regexp
        ?.map((exclude) => {
            if (exclude.startsWith('/') && exclude.endsWith('/')) {
                return new RegExp(exclude.slice(1, exclude.lastIndexOf('/')))
            }
            else {
                return exclude
            }
        }),
        opts[opt.OPT_SENTENCE_WORDS_MIN],
        opts[opt.OPT_SENTENCE_TOKENS_MAX]
    )

    AnkiNote.set_choices_max(opts[opt.OPT_CHOICES_MAX])

    return qg.finish_calculation
    .then(
        () => {
            console.log(`info calculations complete for ${input_file_path}`)
            // console.log(`debug sentences = ${qg.get_sentences().join(',')}`)

            return qg.generate_anki_notes(
                opts[opt.OPT_LIMIT],
                opts[opt.OPT_WORD_FREQUENCY_MIN], 
                opts[opt.OPT_WORD_LENGTH_MIN],
                opts[opt.OPT_WORD_FREQUENCY_ORDINAL_MAX],
                opts[opt.OPT_WORD_FREQUENCY_ORDINAL_MIN],
                opts[opt.OPT_PROLOGUE],
                opts[opt.OPT_EPILOGUE],
                opts[opt.OPT_CHOICE_VARIATION]
            )
        },
        (err) => {
            return Promise.reject(err)
        }
    )
}

/**
 * Delete a local file.
 * 
 * @param {string} file_path 
 * @returns {Promise<void>}
 */
function delete_file(file_path) {
    return fs.unlink(file_path)
    .then(
        () => {
            console.log(`debug deleted file ${file_path}`)
        },
        (err) => {
            console.log(`error failed to delete file ${file_path}. ${err}. ${err.stack}`)
        }
    )
}
