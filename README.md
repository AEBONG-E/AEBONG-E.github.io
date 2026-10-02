# AEBONG-E.github.io

임성훈(Java/Spring 백엔드 개발자)의 포트폴리오 사이트입니다.

**Site:** https://aebong-e.github.io

터미널 UI 스타일의 단일 페이지 포트폴리오로, 빌드 과정 없는 정적 사이트(HTML + CSS + vanilla JS)입니다.

## Features

- 슬래시 명령어 내비게이션 (`/about`, `/experience`, `/projects`, `/skills`, `/contact`)
- 하단 입력창에서 명령어 직접 입력 (`/` 키로 포커스, Tab 자동완성)
- 라이트/다크 테마 전환
- JavaScript 없이도 모든 내용 표시, `prefers-reduced-motion` 지원
- 인쇄 시 이력서 형태로 출력

## Structure

```
.
|-- index.html            # 전체 콘텐츠
|-- assets/
|   |-- css/style.css     # 테마, 레이아웃, 인쇄 스타일
|   |-- js/main.js        # 명령어 입력, 테마 전환 (점진적 향상)
|   `-- img/              # favicon, OG 이미지
`-- .nojekyll             # Jekyll 빌드 비활성화
```

## Local

```bash
python3 -m http.server 8000
# http://localhost:8000
```
