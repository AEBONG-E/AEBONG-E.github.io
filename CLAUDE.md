# AEBONG-E.github.io

> 이 저장소 전용 지침이며 다른 지침 파일 없이도 완결되도록 작성한다.
> 주의: 이 파일은 GitHub Pages로 공개된다 (`/CLAUDE.md`). 개인정보, 내부 경로, 자격증명, 비공개 결정 내용을 적지 않는다.

임성훈의 개인 포트폴리오. 이력서 PDF를 바탕으로 한 단일 페이지 정적 사이트이며 https://aebong-e.github.io 로 배포된다.

## 작업 원칙

- 응답은 한국어 존댓말로 한다.
- 요청받지 않은 수정은 하지 않는다. 분석 요청에는 분석만 하고, 변경은 최소 범위로 한다.
- 문서, 코드 주석, 커밋 메시지에는 이모지/유니코드 기호를 쓰지 않는다 (ASCII 표기: `->`, `*`, `-`, `[OK]`, `[!]`).
- 모든 변경은 그 이유와 내용을 보고한다.

## Stack / 구조

- 빌드 없는 정적 사이트: HTML + CSS + vanilla JS. npm 의존성, 프레임워크, 빌드 도구를 승인 없이 추가하지 않는다.
- 외부 리소스는 Google Fonts(JetBrains Mono) 하나뿐이다. 폰트가 없어도 시스템 폰트로 대체된다.

| 파일 | 역할 |
|------|------|
| `index.html` | 전체 콘텐츠. 섹션: `#about` `#experience` `#projects` `#skills` `#contact` |
| `assets/css/style.css` | 테마 변수(다크/라이트), Claude/Codex CLI 스타일, 반응형, 인쇄 레이아웃 |
| `assets/js/main.js` | 명령어 입력/자동완성, 테마/스타일 전환, 섹션 타이핑 효과 (점진적 향상) |
| `assets/img/` | favicon, apple-touch-icon, OG 이미지(1200x630) |
| `.nojekyll` | Jekyll 비활성화. 삭제하지 않는다 |

## 콘텐츠 원칙

- 이력서에 있는 사실만 쓴다. 수치, 기간, 성과를 과장하거나 새로 만들지 않는다. 표현을 다듬으면 원문 대비표를 보고한다.
- 사용자가 준 텍스트는 문구를 바꾸지 않는다. 표기만 변환한다: 가운뎃점 -> `/` 또는 `,`, 누락된 화살표 -> `->`(HTML `-&gt;`), 곱셈 기호 -> `x`.
- 공개하지 않는다: 전화번호, 상세 주소, 생년/나이, 사진, 연봉, 학점, 고등학교, 퇴사사유.
- 재직/이전 회사의 내부 보안 이슈를 구체적으로 묘사하는 문구는 게시 전에 사용자에게 확인한다.
- 원문끼리 수치가 맞지 않으면 임의로 고치지 말고 보고한다.

## UI 불변 조건 (회귀 금지)

- JS 꺼짐에서도 모든 내용이 보여야 한다. 숨김은 JS가 붙이는 클래스(`tw-wait`, `tw-pending`)로만 한다.
- `prefers-reduced-motion`이면 타이핑/애니메이션 없이 즉시 표시한다.
- 섹션 타이핑은 텍스트 노드를 지웠다가 다시 채운다. 마크업을 바꾸면 "타이핑 완료 후 텍스트 == JS 끈 텍스트"를 확인한다.
- 375px(최소 320px)에서 가로 스크롤 없음. 텍스트 대비 4.5:1, 그래픽 3:1 이상 (두 테마 모두).
- 인쇄(`@media print`)는 흰 배경 이력서 형태. 터미널 장식, 입력창, 마스코트는 숨긴다.
- 콘텐츠 수정 시 클래스 구조(`.turn` `.prompt` `.tool` `.result` `.entry` `.metrics` `.list`)를 유지한다.

## 새 장치 준비 (최초 1회)

```bash
git clone https://github.com/AEBONG-E/AEBONG-E.github.io.git
cd AEBONG-E.github.io
git config user.email "108711069+AEBONG-E@users.noreply.github.com"   # 커밋 작성자 메일 (repo 로컬)
gh auth status                                                        # push 인증 확인
```

필요 도구: `git`, `python3`(로컬 서버), `node`(문법 검사), `gh`(인증/Pages 상태), 브라우저 자동화(Playwright 등, 검증용).

## 로컬 실행 / 검증

```bash
python3 -m http.server 8765 --bind 127.0.0.1   # http://127.0.0.1:8765/
node --check assets/js/main.js
```

배포 전 확인 (Playwright 등 브라우저 자동화 사용):
- 320/375/768/1280px 가로 스크롤, 콘솔 에러, 깨진 링크
- 다크/라이트, Claude/Codex 스타일, reduced-motion, JS 끔, 인쇄(PDF) 미리보기
- 공개 금지 항목 grep (위 "콘텐츠 원칙" 목록)
- 브라우저 캐시 때문에 수정이 안 보이면 쿼리스트링(`?v=n`)이나 no-cache로 다시 확인한다.

## Git / 배포

- 수정은 `main`에서 새 작업 브랜치를 만들어 `git worktree`로 격리해서 한다. 기존 작업 트리를 직접 고치지 않는다.
- merge와 push는 사용자 승인 후에만 한다. `main`에는 fast-forward merge 후 push한다. force push, `reset --hard` 금지.
- merge가 끝난 뒤에 worktree와 작업 브랜치를 정리한다 (`git worktree remove` -> `git branch -d`).
- GitHub Pages 소스는 `main` 브랜치 루트(`/`). push 후 1~2분 내 반영된다 (CDN 캐시 약 10분).
  빌드 확인: `gh api repos/AEBONG-E/AEBONG-E.github.io/pages/builds/latest --jq '.status + " " + .commit'`
- 커밋 메시지: `[Portfolio] <Prefix>: <요약>` (Prefix: Feat/Fix/Docs/Style/Refactor/Chore). 논리 단위로 작게 나눈다.
- 커밋 작성자는 GitHub noreply 주소만 쓴다. 커밋 전 `git config user.email`이 위 "새 장치 준비"의 값인지 확인한다.
- 아직 push하지 않은 브랜치에서 공개되면 안 되는 문구를 고쳤다면, 원문이 이력에 남지 않도록 커밋을 합친 뒤 push한다.
- 비대화형 환경에서 HTTPS push가 인증 오류로 실패하면 설정을 바꾸지 말고 일회성 helper를 쓴다:
  `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin main`
- 한글 경로 정규화 문제로 `git worktree remove <절대경로>`가 실패하면 저장소 루트에서 상대경로(`../<dir>`)로 실행한다.
- 다른 에이전트(Codex 등)와 동시에 작업하면 에이전트별로 별도 worktree/브랜치를 쓴다. 같은 트리를 공유하면 `git add .`/`commit -a`/restore/stash를 쓰지 않는다.

## Docs Index

| 문서 | 언제 읽는가 |
|------|------------|
| `README.md` | 사이트 기능과 디렉토리 구조를 외부 독자 관점에서 확인할 때 |
