# 컴시간알리미 Notion 임베드 프록시

이 프록시 서버는 컴시간알리미 사이트를 Notion에 임베드할 수 있도록 만들어졌습니다.

## 로컬 실행 방법

1. 의존성 설치:
```bash
npm install
```

2. 서버 실행:
```bash
npm start
```

3. 브라우저에서 `http://localhost:3000` 접속

## Vercel 배포 방법 (수정된 구조)

이 프로젝트는 Vercel의 serverless function을 사용하도록 구조가 변경되었습니다.

### 방법 1: Vercel CLI 사용

1. Vercel CLI 설치:
```bash
npm i -g vercel
```

2. 프로젝트 디렉토리에서:
```bash
vercel
```

3. 프롬프트에 따라 설정 완료

### 주요 변경사항:
- `/api/proxy.js`: 프록시 기능을 담당하는 serverless function
- `/api/api.js`: API 라우팅을 담당하는 serverless function
- `/public/index.html`: 메인 페이지
- `vercel.json`: Vercel 배포 설정 파일

### 방법 2: GitHub 연동

1. GitHub에 리포지토리 생성 및 코드 푸시:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. [Vercel 대시보드](https://vercel.com/dashboard)에서:
   - "New Project" 클릭
   - GitHub 리포지토리 선택
   - "Deploy" 클릭

## Render 배포 방법

1. [Render](https://render.com) 계정 생성

2. 새 Web Service 생성:
   - GitHub 리포지토리 연결
   - Build Command: `npm install`
   - Start Command: `npm start`

3. 환경 변수 설정 (필요시):
   - `PORT`: 3000

## Notion에서 사용하기

1. 배포된 URL 확인 (예: `https://your-app.vercel.app`)

2. Notion 페이지에서:
   - `/embed` 입력
   - `https://your-app.vercel.app/proxy` 붙여넣기
   - Enter

## 주의사항

- 이 프록시는 교육/개발 목적으로만 사용하세요
- 원본 사이트의 이용약관을 준수해주세요
- 과도한 트래픽은 차단될 수 있습니다

## 문제 해결

### iconv-lite 오류 발생 시

한글 인코딩 처리를 위해 필요한 경우:
```bash
npm install iconv-lite
```

### CORS 오류

브라우저에서 직접 접근 시 CORS 오류가 발생할 수 있습니다. Notion 임베드로만 사용하세요.

## 라이선스

MIT