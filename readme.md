# Multilingual wordsearch generator

Generates custom wordsearch puzzles with multiple supported languages.

[demo 2021-01-29](https://user-images.githubusercontent.com/17031438/151677759-e20610bc-27a1-4e9b-8029-b17aa9e7fe03.mp4)

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

**עִבְרִית/Hebrew (he)**

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
914.INFO: use default charset from ranges
856.INFO: use probability dist dictionary --> alphabet_prob_dists/ko_prob_dist.txt
639.INFO: placed 토끼 in 1 attempts
639.INFO: placed 고양이 in 1 attempts
639.INFO: placed 다람쥐 in 1 attempts
639.INFO: placed 고래 in 1 attempts
639.INFO: placed 물고기 in 1 attempts
639.INFO: placed 코끼리 in 1 attempts
639.INFO: placed 여우 in 1 attempts
639.INFO: placed 사슴 in 1 attempts
639.INFO: placed 돼지 in 1 attempts
639.INFO: placed 고슴도치 in 1 attempts
639.INFO: placed 강아지 in 1 attempts
639.INFO: placed 도마뱀 in 1 attempts
639.INFO: placed 개미 in 1 attempts
639.INFO: placed 개구리 in 1 attempts
639.INFO: placed 거북이 in 1 attempts
639.INFO: placed 오징어 in 1 attempts

한국어 단어찾기 예시 - 동물
----------------


에 비 는 오 서 스 환 고 있 에 을 법 리 늘 치 치 생 크 방 이 도 이 경 벌 를
미 외 는 쓰 설 으 다 이 양 관 사 서 다 이 고 도 대 주 스 오 징 어 관 성 으
개 김 통 활 로 읽 하 단 류 이 지 유 개 임 대 슴 관 있 무 진 합 지 일 그 선
일 의 일 먼 러 야 는 치 장 내 라 고 구 을 이 고 급 촉 보 년 는 고 기 기 라
할 심 닐 혁 만 그 데 는 일 라 함 지 리 결 기 고 의 으 색 고 하 이 화 것 고
것 의 성 작 사 최 화 게 향 정 매 선 부 다 인 로 체 와 외 로 세 한 우 련 요
제 된 회 수 금 는 축 표 우 난 습 서 가 년 당 비 운 문 이 판 대 결 여 이 아
기 우 또 에 이 준 선 는 를 다 각 역 들 으 어 민 못 피 은 이 랜 원 부 무 국
사 끼 토 관 는 는 농 소 면 의 가 상 일 자 승 고 는 로 코 끼 리 언 나 될 는
공 어 가 러 다 트 도 이 본 가 는 재 하 니 열 사 래 호 의 말 및 의 들 은 다
자 시 정 난 되 을 지 적 린 관 는 한 묻 조 부 언 품 너 태 위 여 필 국 기 기
요 니 이 정 국 삼 프 사 중 분 엇 분 기 이 되 않 은 이 전 날 의 다 갖 구 밀
한 다 수 는 반 량 는 시 고 정 이 범 서 가 및 증 바 투 로 힐 심 종 사 해 업
는 작 습 개 가 체 기 합 요 답 가 개 강 아 지 근 농 대 에 들 미 작 를 있 우
쟁 웠 서 손 장 원 고 엔 런 지 문 는 동 로 질 료 원 이 었 다 원 가 회 험 시
북 몸 다 씨 동 정 물 를 나 이 돼 공 다 무 를 이 는 형 체 밖 다 첫 해 이 국
않 고 출 노 담 모 들 으 다 민 중 로 접 기 위 람 획 히 계 전 인 수 베 올 만
여 교 는 나 사 적 하 속 린 와 스 을 민 두 신 거 드 자 기 변 회 이 지 다 면
어 연 자 믿 료 구 이 을 위 덴 소 자 제 포 차 북 은 명 망 양 석 자 이 학 스
이 욱 느 분 는 식 갖 을 의 학 를 영 다 을 같 이 었 신 발 다 제 자 물 제 수
에 의 다 단 진 라 씨 슴 하 것 학 수 직 가 해 넘 때 그 의 일 찼 서 용 로 화
지 것 북 수 뱀 마 도 사 프 향 및 를 의 미 도 레 북 성 것 그 전 카 다 자 식
을 수 사 선 정 승 의 로 화 학 는 야 점 후 행 한 야 모 로 과 에 로 람 다 한
그 료 만 독 범 는 송 잘 핵 포 두 에 람 은 경 의 된 학 상 다 로 진 쥐 이 실
오 해 폐 방 서 발 자 에 도 나 서 산 말 마 있 악 거 도 세 곡 전 외 리 동 고

clues:

rabbit
cat
squirrel
whale
fish
elephant
fox
deer
pig
hedgehog
puppy
lizard
ant
frog
turtle
squid
```

## Use

### Webpage Component

Include the following in your `<head/>` tag:

```html
<script 
	src="https://wordsearch.dreamhosters.com/wordsearch_webpage.js" type="text/javascript"
	data-containers=".wordsearch-container"
	data-use-host="true">
</script>
```

The `data-containers` attribute is a way to customize the css selector used to identify container
tags in which each wordsearch generator will be loaded.

The `data-use-host` attribute (default="true") should only `false` when hosting a (modified) copy 
of this script within the same webserver that hosts the parent webpage.

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

3. Install dependencies

```bash
# in project directory
cd <wordsearch-generator-root>

# install dependencies
npm install

# fetch sources from git submodules (to be migrated to npm dependencies)
git submodule init
git submodule update
```

4. Run `node wordsearch_cli.js`.

5. Follow the prompts to generate a wordsearch. The output is not interactive/playable.

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

## Wordsearch generator config file

A wordsearch generator instance can be configured via JSON file (see `docs/examples/*.json`).
Below is a list of supported attributes.

### `language`

The language/alphabet to use. Must be a string equal to one of the alphabet name keys or alias
values in `alphabets.json:alphabet_aliases`.

### `case`

If the language has upper and lower case letters, this is used to specify which (`upper` or `lower`).

### `random_subset`

Treats the provided words list as a population from which to pick a random sample for each
generated wordsearch, this parameter specifying the sample size.

### `size`

If a single integer, this specifies the square width and height of the wordsearch.

If an array of 2 integers, this specifies the rectangular width and height of the wordsearch.

### `title`

Wordsearch title.

### `words`

If an array of strings, each string is either a word or a delimited word-clue pair.

If a string, it is a path to a separate delimiter-separated-values (DSV) words file.

### `words_delim`

This can be used to customize the delimiter used to separate words and clues. This applies
to both the embedded words list and the external DSV words file approaches.

## Develop

### Custom interface/environment

If you want to use the wordsearch generator in a different environment, include the `WordsearchGenerator`
class from `wordsearch_generator.js`, as well as `alphabets.json`

## Credits

Webpage icons from [icons.getbootstrap.com](https://icons.getbootstrap.com).

See `alphabets.json` and referenced files for alphabet charset and probability distribution credits.
