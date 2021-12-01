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

```
node test_driver_cli.js 
create with file [f] or interactively [i]? f
wordsearch json description file: example_ko.json
INFO placed 사과 in 1 attempts
INFO placed 머리 in 1 attempts
INFO placed 가위 in 1 attempts
INFO placed 지름 in 1 attempts
INFO placed 까치 in 1 attempts
final grid:
랉 쬶 지 퍹 쉂 룹 겡 뒅
툗 꼵 뛑 름 뽍 뗞 벘 뤀
쩢 뛑 뤃 붂 얛 위 졊 뢵
뜗 좮 땩 둩 뿤 가 봝 윕
귄 깓 콠 릶 컺 쵫 뫖 꿡
몘 놖 까 먷 쥆 리 냯 퓅
녥 큐 치 캷 과 머 듨 귱
턪 뜗 몲 사 샹 죢 뱳 쪮
clues:
과일 중 하나
head, 목 위에
scissors
diameter
이름이 ㄲ로 시작하는 새
```

## Use

To run the playable webpage version:

1. Install [nodejs](https://nodejs.org). If using a mac, I recommend doing so via [nvm](https://github.com/nvm-sh/nvm).

2. Download/clone this repository.

3. Run `node test_driver_webserver.js` to launch the local webserver. Opening `wordsearch_generator.html` directly doesn't work because of inability to access other local files.

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

## Contents

This repository includes the core wordsearch generator class `WordsearchGenerator` in `wordsearch_generator.cjs`,
as well two drivers showing usage in both backend and frontend environments:

1. A nodejs cli driver at `test_driver_cli.js`.
2. A webserver driver that serves a webpage with the wordsearch generator included.

## Develop

### Custom interface/environment

If you want to use the wordsearch generator in a different environment, include the `WordsearchGenerator`
class from `wordsearch_generator.cjs`, as well as `alphabets.json`
