# 안드로이드 앱(플레이스토어)

웹사이트(https://quiz-noriteo.netlify.app)를 그대로 여는 TWA(Trusted Web Activity) 앱입니다. [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)으로 만듭니다.

- 패키지 이름: `com.quiznoriteo.app` (한 번 올리면 바꿀 수 없음)
- 앱 화면은 웹사이트 그대로라서, 웹을 고쳐 `main`에 push하면 앱에도 바로 반영됩니다. 앱을 다시 올리는 건 아이콘·이름·색 같은 `twa-manifest.json` 설정을 바꿀 때뿐입니다.
- 진행 상황은 그 휴대폰의 크롬 저장소에 남습니다. 같은 폰의 크롬으로 사이트를 열어도 같은 진행이 보입니다.

## 이 폴더

| 파일                              | 내용                                                                  | 커밋  |
| --------------------------------- | --------------------------------------------------------------------- | ----- |
| `twa-manifest.json`               | Bubblewrap 설정(패키지 이름, 주소, 색, 아이콘, 버전)                  | 함    |
| `store/listing.md`                | 스토어 등록 문구, 데이터 보안 답변                                    | 함    |
| `store/play-icon-512.png`         | 스토어 아이콘(`npx tsx scripts/app-icon.ts`가 만듦)                   | 함    |
| `store/feature-graphic.png`       | 그래픽 이미지 1024×500                                                | 함    |
| `store/screenshots/`              | 휴대폰 스크린샷 1080×1920                                             | 함    |
| (없음)                            | 업로드 서명 키는 저장소 밖 `~/keystores/quiz-noriteo.keystore`에 둔다 | 안 함 |
| 그 밖(`app/`, `*.aab`, gradle 등) | Bubblewrap이 만드는 생성물                                            | 안 함 |

## 처음 올리기

### 0. 준비

- Google Play 개발자 계정(등록비 25달러, 한 번). 개인 계정이면 신원 확인이 필요합니다.
- Node 22, `npm i -g @bubblewrap/cli`. 처음 실행하면 JDK 17과 Android SDK를 받을지 묻습니다(받게 두면 됩니다).
- 개인정보처리방침이 배포돼 있어야 합니다: https://quiz-noriteo.netlify.app/privacy

### 1. 서명 키 만들기(한 번)

```sh
mkdir -p ~/keystores && chmod 700 ~/keystores
keytool -genkeypair -v -keystore ~/keystores/quiz-noriteo.keystore -alias android \
  -keyalg RSA -keysize 2048 -validity 10000
```

키는 저장소 밖에 둡니다. 비밀번호와 키 파일은 비밀번호 관리자 등에 백업합니다. 이 키는 "업로드 키"이고, 실제 배포 서명은 Google Play가 따로 관리합니다(Play 앱 서명). 업로드 키를 잃어버리면 Play Console에서 재설정을 요청해야 합니다.

### 2. 앱 묶음(AAB) 만들기

```sh
cd android
bubblewrap update   # twa-manifest.json으로 안드로이드 프로젝트를 (다시) 만든다
bubblewrap build --signingKeyPath ~/keystores/quiz-noriteo.keystore   # → app-release-bundle.aab (스토어용), app-release-signed.apk (기기 테스트용)
# --signingKeyPath는 꼭 붙인다: twa-manifest.json의 signingKey.path("~/…")는 JSON이라 ~가 풀리지 않는다.
```

폰을 USB로 연결했다면 `bubblewrap install`로 APK를 바로 깔아 볼 수 있습니다.

### 3. Play Console에 앱 만들기

1. 앱 만들기: 이름 `게임 놀이터`, 기본 언어 한국어, 게임, 무료.
2. 테스트 → 비공개 테스트(또는 내부 테스트)에 `app-release-bundle.aab`를 올립니다. Play 앱 서명은 기본값(사용)으로 둡니다.
3. 스토어 등록정보: `store/listing.md`의 문구와 `store/`의 이미지를 넣습니다.
4. 앱 콘텐츠: 개인정보처리방침 주소, 광고 없음, 콘텐츠 등급 설문, 타깃층, 데이터 보안(`store/listing.md` 참고).

**개인 개발자 계정은 프로덕션 출시 전에 비공개 테스트를 테스터 12명 이상, 14일 이상 돌려야 합니다.** 친구·가족을 테스터로 미리 모아 두세요.

### 4. 주소창 없애기(Digital Asset Links)

앱이 이 사이트의 주인임을 증명해야 앱 위쪽에 주소창이 나오지 않습니다.

1. Play Console → 테스트 및 출시 → 앱 무결성 → 앱 서명에서 **앱 서명 키 인증서**의 SHA-256 지문을 복사합니다.
2. 지문을 등록하고 파일을 만듭니다.
   ```sh
   cd android
   bubblewrap fingerprint add <SHA-256 지문>
   bubblewrap fingerprint generateAssetLinks   # → assetlinks.json
   ```
3. 만든 파일을 `public/.well-known/assetlinks.json`으로 옮겨 커밋하고 push합니다.
4. https://quiz-noriteo.netlify.app/.well-known/assetlinks.json 이 열리는지 확인하고, 앱을 지웠다 다시 깔아 주소창이 사라졌는지 봅니다.

## 앱 다시 올리기

`twa-manifest.json`을 고친 뒤 `appVersionCode`를 1 올리고(`appVersionName`도 맞춰서) 2단계부터 다시 합니다.
