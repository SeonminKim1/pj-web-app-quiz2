# 빌드 오류 코드

빌드 스크립트는 실패를 한 번에 모두 모아서 아래 형식으로 출력하고 종료 코드 1로 끝냅니다.

```
<코드> <어디>: <무엇이 틀렸나> → Fix: <할 일> (docs/errors.md#<코드>)
```

어느 단계에서 났는지는 코드 앞부분으로 압니다.

| 앞부분        | 단계                  | 명령                                             |
| ------------- | --------------------- | ------------------------------------------------ |
| `quiz_data_*` | 문제 데이터 검사      | `npm run build:data`, `npm run quiz-data:check`  |
| `QD_`         | 공유 카드·등록부 검사 | `npm run build:data`, `npm run register-ids`     |
| `OG_`         | OG 페이지·카드 이미지 | `npm run build:og`, `npm run og:preview -- <id>` |
| `DIST_`       | 빌드 결과 검사        | `npm run check:dist`                             |

## quiz_data_invalid

주제 파일(`data/nonsense.json`, `data/mbti.json`)의 형식이 틀렸습니다. 필드 타입, id 형식(숫자 문자열), 중복 id, 모르는 필드가 여기에 걸립니다. MBTI는 정답이 유형 4글자(`ISTJ`)가 아니거나, 카테고리마다 16문제·16유형 한 번씩이 아니어도 걸립니다. 출력 아래 `- ` 줄에 문제 위치가 하나씩 나옵니다. 그 줄대로 고치고 `npm run quiz-data:check`로 다시 확인하세요.

## qd_unregistered

`shareable: true`인 문제가 그 주제의 등록부(넌센스 `data/share/published-ids.json`, MBTI `data/share/mbti-published-ids.json`)에 없습니다.

```sh
npm run register-ids
git add data/share/
```

## qd_answer_changed

이미 공개한 문제(등록부에 있는 id)의 정답이 바뀌었습니다. 친구들이 받은 링크의 결과 비교가 틀어지므로 허용하지 않습니다.

- 실수였다면 예전 정답으로 되돌리세요.
- 정말 정답을 바꿔야 한다면: 새 id로 문제를 추가하고(`shareable: true`), 예전 id는 `shareable: false`로 둡니다. 예전 링크는 "쉬는 중" 화면이 됩니다.
- 등록부(`data/share/*published-ids.json`)를 손으로 고치지 마세요.

공백, 대소문자, 한글 조합 방식(NFC/NFD) 차이는 같은 정답으로 봅니다.

## qd_answer_in_card

카드에 보이는 글(`ogText`가 있으면 그것, 없으면 `question`)에 정답이 그대로 들어 있습니다. 카톡 미리보기에서 정답이 보이게 됩니다.

- `ogText`로 카드 문구를 따로 적거나,
- 정말 괜찮은 경우(말장난이라 정답이 보여도 되는 문제)만 `"allowAnswerInCard": true`를 넣으세요.

## qd_text_fit

카드 문구가 안전 영역에 들어가지 않습니다. 56px에서는 한 줄 10자 × 3줄, 48px에서는 12자 × 4줄까지 들어갑니다. 출력에 실제 문구와 한도가 나옵니다. 더 짧은 `ogText`를 넣으세요.

## qd_registry_shape

등록부(`data/share/published-ids.json`, `data/share/mbti-published-ids.json`)가 JSON 배열이 아니거나, 항목에 `id`·`answerKey`(16자리 16진수)·`firstPublished`(YYYY-MM-DD)가 없습니다. 같은 id가 두 번 있거나 id가 숫자 오름차순이 아니어도 여기에 걸립니다. 손으로 고쳤다면 `git checkout <그 등록부>`로 되돌린 뒤 `npm run register-ids`를 쓰세요.

## qd_registry_shrunk

직전 커밋의 등록부에 있던 id가 사라졌습니다. 등록부는 추가만 합니다(이미 보낸 링크가 깨지지 않게). 공유를 멈추려면 id를 지우지 말고 문제에 `shareable: false`를 두세요.

## og_no_origin

사이트 주소가 비어 있습니다. OG 태그의 이미지 주소는 절대 URL이어야 합니다.

- 정식: `site.config.json`의 `SITE_ORIGIN`에 `https://이름.netlify.app`처럼 적습니다.
- 로컬: `SITE_ORIGIN=http://localhost:4173 npm run build`

환경 변수 `SITE_ORIGIN`이 있으면 그것을 먼저 씁니다.

## og_bad_origin

주소 형식이 틀렸습니다. `https://`로 시작하고, 경로와 끝 슬래시가 없어야 합니다(`https://quiz.example`). 로컬에서만 `http://localhost:<포트>`를 허용합니다. Netlify 정식 빌드(`CONTEXT=production`)에서는 `check:dist`가 `https://`만 허용합니다.

## og_font_missing

Pretendard OTF 파일을 찾지 못했습니다. `npm ci`로 다시 설치하세요. 글꼴은 `node_modules/pretendard/dist/public/static/`에서 읽습니다.

## og_render

카드 그리기에 실패했습니다. 메시지에 단계(layout/svg/png)가 나오고, 전체 스택은 `.tmp/og-error-<id>.log`에 있습니다. 한 장만 다시 그려 보세요. `<id>` 자리는 문제 키입니다(넌센스 `23`, MBTI `m12`).

```sh
npm run og:preview -- <id>   # → .tmp/og/<id>.png
```

## dist_asset_missing

HTML이 부르는 파일(스크립트, CSS, OG 이미지)이 `dist`에 없거나, 등록부의 id에 페이지가 없거나, `dist/sw.js`나 manifest의 아이콘이 없습니다. 단계를 하나만 다시 돌렸다면 `npm run build`로 처음부터 다시 만드세요.

## dist_foreign_origin

`og:url`, `og:image`, `canonical`이 정식 주소 아래가 아닙니다. 대개 `SITE_ORIGIN`을 바꾸고 `build:og`를 다시 돌리지 않은 경우입니다.

## dist_qdata_missing

공유 중인 문제 페이지에 `#q-data`가 없거나, 다시 읽은 값이 원래 문제 자료와 다릅니다(이스케이프 문제). `npm run build:og`를 다시 돌리고, 계속되면 `scripts/og/pages.ts`의 `jsonForScript`를 확인하세요.

## dist_share_param

빌드된 HTML 안에 `from=` 공유 파라미터가 들어 있습니다. 누군가의 닉네임이 모든 사람에게 보이게 되므로, 링크를 HTML에 박아 넣은 코드를 찾아 고치세요.
