const { AnkiNote } = require('./quizcard-generator/anki/anki_generator')
const { 
    OPT_INPUT_FILE, 
    OPT_EXCLUDE_WORD, 
    OPT_LIMIT, 
    OPT_WORD_FREQUENCY_MIN, 
    OPT_WORD_LENGTH_MIN, 
    OPT_WORD_FREQUENCY_ORDINAL_MAX, OPT_WORD_FREQUENCY_ORDINAL_MIN, 
    OPT_NOTES_NAME,
    OPT_TAG
} = require('./quizcard-generator/quizcard_cli')
const { QuizCardGenerator } = require('./quizcard-generator/quizcard_generator')
const { Express } = require('express')

const DIR = 'quizcard-generator'
const MAIN_PAGE = 'quizcard_generator.html'
const EXPORTS_DIR = `./quizcard-generator/out/webserver`

/**
 * 
 * @param {Express} server Existing server to which quizcard is added.
 * @param {string} public_dir
 */
function main(server, public_dir) {
    // main page
    server.get(`/${DIR}`, function(_req, res) {
        console.log(`info quizgen root path to ${MAIN_PAGE}`)
        res.sendFile(`./${DIR}/${MAIN_PAGE}`, {
            root: public_dir
        })
    })

    // api/preview
    server.post(`/${DIR}/api/preview`, function(req, res) {
        generator(req.body)
        .then((anki_notes) => {

        })
    })

    // api/generate
    server.post(`/${DIR}/api/generate`, function(req, res) {
        generator(req.body)
        .then((anki_notes) => {
            AnkiNote.export(
                anki_notes,
                req.body[OPT_NOTES_NAME],
                EXPORTS_DIR,
                undefined,
                req.body[OPT_TAG]
            )
        })
    })
}
exports.main = main

/**
 * Instantiate a QuizCardGenerator given options provided by a web client.
 * 
 * @param opts
 * @param quizgen
 */
function generator(opts) {
    const input_file_path = opts[OPT_INPUT_FILE]

    const qg = new QuizCardGenerator(
        opts[`${OPT_INPUT_FILE}-content`],
        input_file_path,
        opts[OPT_EXCLUDE_WORD]
    )

    return qg.finish_calculation
    .then(
        () => {
            console.log(`info calculations complete for ${input_file_path}`)
            return qg.generate_anki_notes(
                opts[OPT_LIMIT],
                opts[OPT_WORD_FREQUENCY_MIN], 
                opts[OPT_WORD_LENGTH_MIN],
                opts[OPT_WORD_FREQUENCY_ORDINAL_MAX],
                opts[OPT_WORD_FREQUENCY_ORDINAL_MIN]
            )
        },
        (err) => {
            return Promise.reject(err)
        }
    )
}
