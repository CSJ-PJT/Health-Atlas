# Android Health Connect 네이티브 앱 설정 가이드

이 프로젝트는 React + Capacitor + Health Connect SDK를 사용한 하이브리드 앱입니다.

## 필수 요구사항

- Node.js 18 이상
- Android Studio (최신 버전 권장)
- JDK 17 이상
- Git

## 1단계: 프로젝트 클론 및 의존성 설치

```bash
# GitHub에서 프로젝트 클론
git clone <your-repo-url>
cd <project-directory>

# Node.js 의존성 설치
npm install

# Capacitor CLI 설치 (글로벌)
npm install -g @capacitor/cli
```

## 2단계: Capacitor Android 플랫폼 추가

```bash
# Android 플랫폼 추가
npx cap add android

# 빌드 및 동기화
npm run build
npx cap sync
```

## 3단계: Android Studio에서 프로젝트 열기

```bash
# Android Studio에서 프로젝트 열기
npx cap open android
```

또는 Android Studio를 직접 실행하고 `android` 폴더를 엽니다.

## 4단계: Health Connect SDK 설정

### 4.1 build.gradle 파일 확인

프로젝트에 이미 Health Connect SDK가 추가되어 있는지 확인합니다:

`android/app/build.gradle` 파일에 다음이 포함되어 있어야 합니다:

```gradle
dependencies {
    // ... 기존 의존성들
    
    // Health Connect SDK
    implementation "androidx.health.connect:connect-client:1.1.0-alpha07"
}
```

### 4.2 AndroidManifest.xml 확인

`android/app/src/main/AndroidManifest.xml` 파일에 Health Connect 권한이 포함되어 있는지 확인합니다.

### 4.3 HealthConnectPlugin.java 확인

`android/app/src/main/java/com/danchon/healthsync/HealthConnectPlugin.java` 파일이 생성되어 있는지 확인합니다.

## 5단계: MainActivity에 플러그인 등록

`android/app/src/main/java/com/danchon/healthsync/MainActivity.java` 파일을 편집합니다:

```java
package com.danchon.healthsync;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // HealthConnectPlugin 등록
        registerPlugin(HealthConnectPlugin.class);
    }
}
```

## 6단계: Gradle 동기화 및 빌드

Android Studio에서:

1. **File > Sync Project with Gradle Files** 클릭
2. 동기화가 완료될 때까지 대기
3. **Build > Make Project** 클릭하여 프로젝트 빌드

## 7단계: 에뮬레이터 또는 실제 기기에서 실행

### 에뮬레이터 사용:

1. Android Studio에서 **Tools > Device Manager** 열기
2. 새 가상 기기 생성 (API 34 이상 권장)
3. **Health Connect 지원 확인**: 에뮬레이터 설정에서 Google APIs 포함된 시스템 이미지 선택
4. **Run** 버튼 클릭

### 실제 기기 사용:

1. 개발자 옵션 및 USB 디버깅 활성화
2. USB로 기기 연결
3. Android Studio에서 기기 선택 후 **Run** 클릭
4. **중요**: 실제 기기에서는 Google Play Store에서 Health Connect 앱을 설치해야 합니다

## 8단계: Health Connect 앱 설치 (실제 기기)

실제 Android 기기에서 테스트하는 경우:

1. Google Play Store 열기
2. "Health Connect" 검색
3. 설치
4. 앱 실행 후 초기 설정 완료

## 9단계: 앱 테스트

1. 앱 실행
2. "건강 데이터 동기화" 권한 요청 대화상자 확인
3. "권한 허용" 클릭
4. Health Connect 권한 화면에서 모든 권한 활성화
5. 홈 화면으로 돌아가서 "수동 동기화" 버튼 클릭
6. 건강 데이터가 표시되는지 확인

## 실시간 개발 (Hot Reload)

개발 중에는 다음 명령어로 실시간 업데이트를 사용할 수 있습니다:

```bash
# 터미널에서 개발 서버 실행
npm run dev

# 다른 터미널에서 Capacitor 동기화 (코드 변경 시)
npx cap sync
```

## 문제 해결

### Health Connect 권한이 작동하지 않는 경우:

1. AndroidManifest.xml에 모든 권한이 선언되어 있는지 확인
2. 기기/에뮬레이터에 Health Connect 앱이 설치되어 있는지 확인
3. 앱 재시작

### 빌드 오류:

```bash
# Gradle 캐시 정리
cd android
./gradlew clean

# 다시 빌드
./gradlew build
```

### 플러그인 인식 안 됨:

```bash
# Capacitor 재동기화
npx cap sync android

# Android Studio에서 Gradle 재동기화
```

## 프로덕션 빌드

프로덕션용 APK/AAB 생성:

```bash
# React 프로젝트 빌드
npm run build

# Capacitor 동기화
npx cap sync

# Android Studio에서:
# Build > Generate Signed Bundle / APK
```

## 추가 리소스

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Health Connect 개발자 가이드](https://developer.android.com/health-and-fitness/guides/health-connect)
- [Android Studio 공식 문서](https://developer.android.com/studio)

## 보안 고려사항

- 프로덕션 환경에서는 코드 난독화 (ProGuard/R8) 활성화
- API 키와 민감한 정보는 환경 변수로 관리
- Health Connect 데이터는 암호화하여 전송
- 사용자 동의 없이 건강 데이터 수집 금지

## 명령어 요약

```bash
# 초기 설정
git clone <repo-url>
cd <project-directory>
npm install
npx cap add android
npm run build
npx cap sync

# Android Studio에서 열기
npx cap open android

# 개발 중 (코드 변경 후)
npm run build
npx cap sync

# 또는 라이브 리로드
npm run dev
# (별도 터미널) npx cap sync
```

이제 Android Studio에서 앱을 실행하고 Health Connect와 완전히 통합된 네이티브 기능을 테스트할 수 있습니다!
