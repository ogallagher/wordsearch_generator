# Multilingual wordsearch generator

Generates custom wordsearch puzzles with multiple supported languages.

## Supported languages/alphabets

Note that in many cases I've _included_ an alphabet corresponding to a language I do not know,
having found it in [unicode documentation](https://unicode.org/charts/nameslist/) and selected
characters that seem generally valid for spelling. If you find mistakes with any alphabet, open an 
issue and we can fix them by modifying `alphabets.json`.

**Chinese/漢語 (zh)**

**Deutsch/German (de)**

**English (en)**

**Español/Spanish (es)**

**Français/French (fr)**

**ひらがな/Hiragana, Japanese (hiragana)**

**カタカナ/Katakana, Japanese (katakana)**

**한국어/Korean (ko)**

**Русский/Russian (ru)**

**Braille (braille-6, braille-8)**

**Chess (chess)**

**Domino (domino)**

## Showcase

### English

![english example](docs/img/wordsearch\_webpage\_en.png)

### Korean

![korean example](docs/img/wordsearch\_webpage\_ko.png)

### Spanish

![spanish example](docs/img/wordsearch\_webpage\_es.png)

### Chinese

![chinese example](docs/img/wordsearch\_webpage\_zh.png)

### Russian

![russian example](docs/img/wordsearch\_webpage\_ru.png)

### CLI, Korean

```
./wordsearch_cli.js    
create with file [f] or interactively [i]? f
wordsearch json description file: docs/examples/example_ko.json
INFO placed 사과 in 1 attempts
INFO placed 머리 in 1 attempts
INFO placed 가위 in 1 attempts
INFO placed 지름 in 2 attempts
INFO placed 까치 in 2 attempts

한국 단어찾기 예
---------


껪 쉘 뛋 퉐 렗 겸 쪾 헻
졍 쾾 랇 름 쳜 푤 턻 사
가 꼩 지 욊 쭞 먶 땜 과
쫖 위 뮥 춄 됩 퓿 암 닇
퐉 럷 헢 톼 꽲 띯 쳥 쁀
껁 샅 헞 뉘 머 리 툔 쬰
치 뮘 봵 콻 눟 궇 칃 폼
논 까 흭 쌂 쭁 딡 꼄 짨

clues:

과일 중 하나
head, 목 위에
scissors
diameter
이름이 ㄲ로 시작하는 새
```

## Use

### Webpage Component

Include the following in your `<head/>` tag:

```html
<script 
	src="https://wordsearch.dreamhosters.com/wordsearch_webpage.js" type="text/javascript"
	data-containers=".wordsearch-container">
</script>
```

The `data-containers` attribute is a way to customize the css selector used to identify container
tags in which each wordsearch generator will be loaded.

See `wordsearch_generator.html` for an example of how to insert a wordsearch generator dynamically
into an external webpage. The [public webserver](https://wordsearch.dreamhosters.com) should
allow the needed cross origin requests for the component to be provided.

Note that [jquery](https://jquery.com) is a dependency that must already be present in the 
parent webpage for the wordsearch generator component to work.

### Webpage Driver

To run the playable webpage version:

1. Install [nodejs](https://nodejs.org). If using a mac, I recommend doing so via [nvm](https://github.com/nvm-sh/nvm).

2. Download/clone this repository.

3. Run `node wordsearch_webserver.js` to launch the local webserver. Opening `wordsearch_generator.html` directly doesn't work because of inability to access other local files.

4. Visit [localhost](http://localhost) to see the wordsearch generator page.

To configure the wordsearch with a file, select **file**. 
See the `docs/examples/example_<language>.json` files
for examples. Once the wordsearch description file is ready, use the file input
to pick it.

To configure the wordsearch using the form, select **form** and fill out the
fields.

Note that for additional difficulty an answer can be broken into a word and a clue,
delimited with : in a description file (ex. `greeting:hello`), but providing
a separate clue is optional.

Also note that the webpage example `wordsearch_generator.html` has multiple generators to illustrate
the ability to have more than one in the same single page.

### Command Line

1. Install [nodejs](https://nodejs.org). If using a mac, I recommend doing so via [nvm](https://github.com/nvm-sh/nvm).

2. Download/clone this repository.

3. Run `node wordsearch_cli.js`.

4. Follow the prompts to generate a wordsearch. The output is not interactive/playable.

## Contents

This repository includes the core wordsearch generator class `WordsearchGenerator` in 
`wordsearch_generator.cjs`, as well two drivers showing usage in both backend and 
frontend environments:

1. A nodejs cli driver at `wordsearch_cli.js`.
2. A webserver driver at `wordsearch_webserver.js` that serves a webpage with the wordsearch generator included.

The `bin/` folder contains linux compatible relative symbolic links to those drivers and 
`alphabets.json` which can be added to the path and be used as quick cli tools. As in:

```bash
# add to path via bash profile
PATH=${PATH}:<wordsearch-bin-dir-path> >> ~/.bashrc
export PATH >> ~/.bashrc

source ~/.bashrc

# use cli scripts without specifying path
wordsearch-cli
```

## Develop

### Custom interface/environment

If you want to use the wordsearch generator in a different environment, include the `WordsearchGenerator`
class from `wordsearch_generator.js`, as well as `alphabets.json`
