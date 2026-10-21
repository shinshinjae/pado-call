# GitHub에 올리고 앱 확인하기

> 이 저장소(jaewansh/pado-call)의 데모 주소: https://shinshinjae.github.io/pado-call/

이 저장소는 빌드된 앱이 `docs/` 폴더에 들어 있어서, GitHub에 올린 뒤 **Pages 설정 한 번**이면 누구나 주소로 앱을 열 수 있습니다. 서버나 GitHub Actions 설정은 필요 없습니다.

## 1. 저장소 만들기 (방법 A·C를 쓸 때)

방법 B(GitHub Desktop)는 Desktop이 저장소를 만들어 주므로 이 단계를 건너뜁니다.

1. https://github.com 에 로그인 → 오른쪽 위 **+** → **New repository**
2. Repository name: `pado-call` (다른 이름도 됩니다. 앱은 상대 경로로 빌드되어 있어 이름과 상관없이 동작합니다)
3. **Public** 선택 — 무료 계정에서 GitHub Pages는 공개 저장소에서만 켤 수 있습니다
4. "Add a README file"은 **체크하지 않음** (이미 README가 있습니다) → **Create repository**

## 2. 파일 올리기 (셋 중 하나)

### 방법 A. 웹 브라우저로 끌어다 놓기 — 가장 쉬움

1. 받은 `pado-call.zip`의 압축을 풉니다.
2. 새 저장소 화면의 **uploading an existing file** 링크를 누릅니다.
3. 압축을 푼 `pado-call` 폴더 **안의** 항목(`docs`, `web`, `engine-py`, `image`, `README.md`, `GUIDE_GITHUB.md`, `.gitignore`)을 모두 선택해 업로드 영역에 끌어다 놓습니다. (Chrome·Edge에서는 폴더째 끌어다 놓으면 폴더 구조가 그대로 올라갑니다.)
4. 아래쪽 **Commit changes**를 누릅니다.

> 확인: 저장소 첫 화면에 `docs` 폴더가 바로 보이고, `docs/index.html`이 있어야 합니다. `pado-call/docs/...`처럼 한 단계 더 들어가 있으면 Pages가 찾지 못합니다.
> 한 번에 100개 파일까지 올릴 수 있습니다(이 저장소는 약 80개). `.gitignore`처럼 점으로 시작하는 파일이 안 보이면 빼고 올려도 앱 동작에는 영향이 없습니다.

### 방법 B. GitHub Desktop

1. https://desktop.github.com 설치 → GitHub 계정으로 로그인
2. **File → Add local repository** → 압축을 푼 `pado-call` 폴더 선택 → "create a repository" 안내가 나오면 **Create repository**
3. 왼쪽 아래 Summary에 `파도콜 MVP` 입력 → **Commit to main**
4. **Publish repository** → Name `pado-call`, "Keep this code private" **체크 해제** → Publish

### 방법 C. git 명령어

```bash
cd pado-call
git init
git add .
git commit -m "파도콜 MVP"
git branch -M main
git remote add origin https://github.com/<GitHub아이디>/pado-call.git
git push -u origin main
```

## 3. GitHub Pages 켜기

1. 저장소 → **Settings** → 왼쪽 메뉴 **Pages**
2. **Build and deployment → Source: Deploy from a branch**
3. **Branch: `main`**, 폴더: **`/docs`** → **Save**
4. 1~3분 뒤 같은 화면 위쪽에 **"Your site is live at https://&lt;GitHub아이디&gt;.github.io/pado-call/"** 가 나타납니다. 진행 상황은 저장소의 **Actions** 탭(pages build and deployment)에서도 볼 수 있습니다.

## 4. 앱 확인하기

| 무엇을 볼까 | 주소 |
|---|---|
| 관광객 앱 (공항 셔틀·지금 호출) | `https://<GitHub아이디>.github.io/pado-call/#/call` |
| 혼잡 예측 지도 | `…/pado-call/#/wave` |
| 내 여정 | `…/pado-call/#/trips` |
| 관제·예약 대시보드 | `…/pado-call/#/control` |
| 수리모형 설명 | `…/pado-call/#/model` |

- **언어**: 앱 오른쪽 위에서 바꾸거나 주소에 `?lang=en`(ko · en · ja · zhHans · zhHant)을 붙입니다. 예: `…/pado-call/?lang=ja#/wave`
- **시나리오**: PC에서는 오른쪽 "시연 설정", 휴대폰에서는 위쪽 "설정"에서 운영일(주말 · 크루즈 입항일 · 드론쇼 토요일)과 시각을 바꿉니다. 주소로도 지정할 수 있습니다: `?day=cruise&t=1300`
- **휴대폰**: 주소를 휴대폰 브라우저로 열고 공유 메뉴의 **홈 화면에 추가**를 누르면 앱처럼 실행됩니다. 발표 자료에는 주소를 QR 코드로 만들어 넣으면 심사위원이 바로 열어 볼 수 있습니다.
- 예약·호출 기록은 그 브라우저에만 저장됩니다(다른 사람에게 보이지 않음). 처음 상태로 보려면 주소에 `?fresh=1`을 붙입니다.

## 5. 고친 뒤 다시 올리기

```bash
cd web
npm install        # 처음 한 번
npm run build      # docs/ 폴더가 새로 만들어집니다
```

그다음 바뀐 파일을 다시 올립니다 — 방법 A는 `docs` 폴더(와 고친 소스)를 다시 끌어다 놓고 Commit, 방법 B는 Commit → **Push origin**, 방법 C는 `git add . && git commit -m "수정" && git push`. 1~2분 뒤 같은 주소에 반영됩니다.

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 404 페이지 | Pages 설정이 `main` / `/docs`인지, 저장소가 Public인지, 저장소 첫 화면에 `docs/index.html`이 있는지 확인하고 2~3분 기다립니다. |
| 화면이 하얗게만 보임 | 주소 끝에 `#/call`을 붙여 봅니다. 그래도 같으면 `docs` 폴더가 통째로 올라갔는지(`docs/assets/…js`) 확인합니다. |
| 고친 내용이 안 보임 | 배포가 끝났는지(Actions 탭) 확인한 뒤 새로 고침합니다. 그래도 같으면 Ctrl+Shift+R(맥: Cmd+Shift+R)을 누릅니다. |
| 웹 업로드 후 폴더가 사라짐 | 폴더를 끌어다 놓을 때 Chrome·Edge를 쓰거나, 방법 B·C로 올립니다. |

## 7. 공개 범위 참고

- 공개 저장소는 누구나 코드를 볼 수 있습니다. `web/src/engine/drt.ts`와 `engine-py/padocall/drt.py`에는 선행연구 [1]의 모형화 방법을 단순화한 일반형 대기시간 계산이 들어 있습니다([1]의 데이터·보정 결과는 없음). 논문 게재 전 공개가 부담되면 저장소를 Private으로 두고 Pages 대신 다른 방법으로 시연하거나(유료 요금제는 Private 저장소에서도 Pages 사용 가능), 공개 전에 팀에서 범위를 정하세요.
- 라이선스 파일은 넣지 않았습니다. 라이선스가 없으면 다른 사람은 코드를 볼 수만 있고 재사용 권한은 없습니다. 공개 범위가 정해지면 GitHub의 **Add file → Create new file → `LICENSE`** 에서 선택할 수 있습니다.
