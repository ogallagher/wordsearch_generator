# Multilingual wordsearch generator

Generates custom wordsearch puzzles with multiple supported languages.

## Supported languages

**English (en)**

**Español/Spanish (es)**

**한국어/Korean (ko)**

## Showcase

![english example](docs/img/wordsearch\_webpage\_en.png)

![korean example](docs/img/wordsearch\_webpage\_ko.png)

![spanish example](docs/img/wordsearch\_webpage\_es.png)

## Use

To run the playable webpage version:

1. Install [nodejs](https://nodejs.org). If using a mac, I recommend doing so via [nvm](https://github.com/nvm-sh/nvm).

2. Download/clone this repository.

3. Run `node test_driver_webserver.js` to launch the local webserver. Opening `wordsearch_generator.html` directly doesn't work because of inability to access other local files.

4. Visit [localhost](http://localhost) to see the wordsearch generator page.

To configure the wordsearch with a file, select **file** 
and see the `example_<language>.json` files
for examples. Once the wordsearch description file is ready, use the file input
to pick it.

To configure the wordsearch using the form, select **form** and fill out the
fields.

Note that for additional difficulty an answer can be broken into a word and a clue,
delimited with : in a description file (ex. `greeting:hello`), but providing
a separate clue is optional.

## Contents

This repository includes the core wordsearch generator class `WordsearchGenerator` in `wordsearch_generator.cjs`,
as well two drivers showing usage in both backend and frontend environments:

1. A nodejs cli driver at `test_driver_cli.js`.
2. A webserver driver that serves a webpage with the wordsearch generator included.

## Develop

### Custom interface/environment

If you want to use the wordsearch generator in a different environment, include the `WordsearchGenerator`
class from `wordsearch_generator.cjs`, as well as `alphabets.json`
