# 퀴즈 놀이터

넌센스 퀴즈 웹앱입니다. 546문제를 스테이지로 풀고, 어느 문제든 `/q/<id>/` 링크로 단톡방에 낼 수 있습니다. 링크를 붙여 넣으면 카톡 미리보기에 문제 카드가 뜹니다.

서버는 없고 정적 사이트(Netlify)입니다. 빌드 때 공유 문제마다 HTML과 카드 PNG를 만듭니다.

## 시작하기

Node 22가 필요합니다(`.nvmrc`).

```sh
npm ci
npm run dev          # http://localhost:5173 (문제 데이터·글꼴을 먼저 만든다. OG는 만들지 않음)
```

`npm run dev`로 `/q/<id>/`를 열면 인라인 문제 자료가 없어서 `nonsense.json`을 받아서 그립니다. 그래도 화면은 똑같습니다.

## 검사

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
```

## 빌드

```sh
SITE_ORIGIN=http://localhost:4173 npm run build
npm run preview      # http://localhost:4173/q/<id>/
```

`build`는 아래 단계를 차례로 돌립니다. 단계 하나만 다시 돌릴 수도 있습니다.

| 단계          | 하는 일                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `build:data`  | `data/nonsense.json` 검사, 공유 카드·등록부 검사, `public/data/quiz/` 생성 |
| `build:fonts` | Pretendard 글꼴을 `public/fonts/`로 복사                                   |
| `build:app`   | `tsc -b && vite build` → `dist/`                                           |
| `build:og`    | 등록부의 id마다 `dist/q/<id>/index.html`과 `dist/og/<id>-<해시>.png`       |
| `check:dist`  | 빌드 결과 검사(파일, OG 주소, `#q-data`)                                   |

`SITE_ORIGIN`은 환경 변수가 먼저이고, 없으면 `site.config.json`을 읽습니다. 둘 다 비었으면 `build:og`가 `OG_NO_ORIGIN`으로 실패합니다. 실패 메시지의 코드는 [docs/errors.md](docs/errors.md)에서 찾으세요.

## 문제 데이터

`data/nonsense.json` 한 파일입니다. 한 문제는 이렇게 생겼습니다.

```json
{
  "id": "23",
  "question": "지구가 제일 힘들었던 시기는?",
  "answer": "고생대",
  "hints": ["시대 이름이에요"],
  "shareable": true,
  "ogText": "카드에만 보일 짧은 문구(선택)",
  "allowAnswerInCard": false
}
```

공유 관련 필드는 셋입니다.

- `shareable`: 링크로 낼 수 있는 문제인지. 기본은 `false`. 지금은 546문제 모두 켜 두었습니다(새 문제도 `true`로 넣고 `npm run register-ids`).
- `ogText`: 카드에 보일 문구. 없으면 `question`. 56px 10자×3줄, 또는 48px 12자×4줄에 들어가야 합니다.
- `allowAnswerInCard`: 카드 문구에 정답이 들어가도 되는 문제만 `true`.

`ogText`와 `allowAnswerInCard`는 빌드에만 쓰고 앱에 보내는 데이터에서는 뺍니다.

`data/share/published-ids.json`은 공개한 id의 등록부입니다. 추가만 하고 손으로 고치지 않습니다. 각 id의 정답 해시가 들어 있어서, 공개한 문제의 정답이 바뀌면 빌드가 막힙니다.

## 작업 레시피

### 새 카드 공개하기

1. 문제에 `"shareable": true`를 넣습니다.
2. 카드를 미리 봅니다.
   ```sh
   npm run og:preview -- 23
   # .tmp/og/23.png
   ```
3. 등록하고 커밋합니다.
   ```sh
   npm run register-ids -- --dry-run
   # added: 23 (1) / unchanged: 21
   npm run register-ids
   git add data/nonsense.json data/share/published-ids.json
   git commit -m "Share question 23"
   ```

다시 돌려도 아무것도 바뀌지 않습니다(`added: (0)`).

### 카드 공유 멈추기

`"shareable": false`로 바꾸고 커밋합니다. 등록부에서는 지우지 않습니다. 예전 링크는 "쉬는 중" 화면이 되고 공통 카드가 뜹니다.

### 문구 오타 고치기

`question`, `hints`, `ogText`는 언제든 고쳐도 됩니다. 카드 이미지 내용이 바뀌면 파일 이름의 해시도 바뀌어서 메신저가 새 이미지를 가져옵니다(이미 붙여 넣은 미리보기는 그대로).

### 정답 고치기

공개한 문제의 정답은 바꿀 수 없습니다(`QD_ANSWER_CHANGED`). 새 id로 문제를 추가해 공개하고, 예전 id는 `"shareable": false`로 둡니다. 공백, 대소문자, 한글 조합 방식 차이는 같은 정답으로 봅니다.

### 카드에 글자가 안 들어갈 때

`QD_TEXT_FIT`이 나면 짧은 `ogText`를 넣고 `npm run og:preview -- <id>`로 확인합니다.

### 몇 문제만 OG 다시 만들기

```sh
SITE_ORIGIN=http://localhost:4173 npm run build:og -- --only 23,41
```

## 통계 (GoatCounter)

`site.config.json`의 `GOATCOUNTER_CODE`가 비어 있으면 통계를 보내지 않습니다. 스크립트는 고정 사본 `public/count.js`를 씁니다.

주소 끝에 붙이는 플래그:

- `?dev=1`: 이 브라우저를 집계에서 뺍니다(저장됨). 본인 폰에서 한 번 여세요.
- `?dev=0`: 다시 집계합니다.
- `?debug=analytics`: 보내지 않고 콘솔에 이벤트만 찍습니다.

핵심 지표는 `reshare_from_share / landing_from_share`입니다. 공유 링크로 들어온 사람이 그 문제를 다시 낸 비율입니다. 광고 차단기는 분자와 분모를 함께 줄입니다.

## 배포

배포는 git push → Netlify CI(`npm run build`)로만 합니다. 정식 사이트에는 끌어다 놓기나 CLI 배포를 쓰지 않습니다. 설정은 `netlify.toml`에 있습니다(Node 22, 캐시 헤더, SPA 재작성).

첫 배포 순서:

1. 공유할 문제를 골라 등록하고 커밋합니다(위 레시피).
2. GitHub 저장소를 만들고 push합니다.
3. Netlify에서 그 저장소로 사이트를 만듭니다. 사이트 이름이 정식 주소가 됩니다.
4. `site.config.json`의 `SITE_ORIGIN`에 정식 주소를 적고 커밋합니다. 첫 링크를 보낸 뒤에는 바꾸지 않습니다.
5. 배포가 끝나면 카드 이미지가 진짜 PNG인지 확인합니다. 없는 파일도 SPA 재작성 때문에 200 HTML이 오기 때문입니다.
   ```sh
   curl -sI https://<정식 주소>/og/<파일 이름>.png | grep -i content-type
   # content-type: image/png
   ```
6. 링크 하나를 카톡에 붙여 넣어 미리보기를 확인합니다.

deploy preview도 정식 `SITE_ORIGIN`을 쓰므로, 새로 추가한 id의 카드는 정식 배포 전까지 메신저에서 깨져 보입니다. preview 링크로는 카톡 미리보기를 시험하지 마세요.
