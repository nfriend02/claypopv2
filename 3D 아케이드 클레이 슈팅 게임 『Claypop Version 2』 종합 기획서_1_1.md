# 🎯 3D 아케이드 클레이 슈팅 게임: 『Claypop Version 2』 종합 기획서 (v1.1)

---

## 1. 게임 개요 (Game Overview)

* **프로젝트명**: Claypop Version 2 (클레이팝 버전 2)
* **장르**: 코믹 3D 아케이드 클레이 슈팅 미니게임 (3D Comic Arcade Clay Shooting)
* **전체 분위기 및 디자인 컨셉**: **'코믹 퍼니 3D 애니메이션(픽사/드림웍스 풍 카툰 렌더링)'** 스타일. 1960년대 미국 텍사스 서부 시골 농장의 유쾌하고 활기찬 바이브.
* **타겟 플랫폼**: 웹 브라우저 기반 완벽 반응형 크로스 플랫폼
  * **모바일 가로화면(Landscape)**: 최우선 기준 표준 화면
  * **모바일 세로화면(Portrait)**: 한 손/양손 세로 파지 최적화 전용 레이아웃 별도 세팅
  * **데스크톱 화면(Desktop)**: 마우스 및 키보드 환경에 최적화된 전용 UX 별도 세팅
* **핵심 게임 루프**: 양쪽에서 랜덤하게 튀어나와 곡선/부메랑 궤적으로 날아가는 클레이(Clay) 타겟을 주인공이 이동하며 리드 샷(Lead Shot)으로 조준·격추하는 쾌감 중심 아케이드 슈팅.

---

## 2. 조작 인터페이스 및 최상의 게이머 UX 설계 (Controls & Zero-Occlusion UX)

### 2.1. 모바일 가로화면 (Landscape) 조작부 정밀 규격 (0 ~ 10 비율 좌표계)
모바일 가로화면의 왼쪽 끝을 `0`, 오른쪽 끝을 `10`으로 설정할 때, 양손 엄지가 자연스럽게 닿는 위치에 맞춰 조작 아이콘을 정밀 배치합니다.

```
[모바일 가로화면(0 ~ 10 비율) 조작부 및 상단 소멸 존 배치도]
+-----------------------------------------------------------------------+
| [좌측상단 흡수존(1.0)]     (클레이 비행 및 사격 골든 존)    [우측상단 흡수존(9.0)] |
|                                                                       |
|                     +---+                                             |
|                     | ▲ | (상: 폭 1.0W, 높이 1.0H)                     |
|      _.-""-._   +-----+-----+                                         |
|    .'   조준  '. |  ◀  |  ▶  | (좌/우: 폭 1.5W, 높이 1.0H, 중앙 밀착)   |
|   /   부채꼴   \ +-----+-----+                                         |
|  |____터치패드___|    | ▼ | (하: 폭 1.0W, 높이 1.0H)                     |
|                     +---+                                             |
+-----------------------^---------------------------^-------------------+
0                      3.2                         6.8                 10
                (왼손 엄지 조준/발사)         (오른손 엄지 슬라이드 이동)
```

#### ① 왼손 엄지 조작부: 부채꼴 반원형 터치 버튼 (위치: `3.2`)
* **배치 위치**: 가로화면 좌측 끝(`0`) 기준 **`3.2`** 지점에 부채꼴 반원 터치 버튼의 중심축을 배치합니다.
* **조준 (Touch & Rub)**: 부채꼴 반원 위를 왼손 엄지로 터치한 채 상하좌우로 문지르면(Rub/Drag), 그 방향과 변위량에 비례하여 게임 속 **'총구(the muzzle of shotgun)'**와 조준선(Crosshair)이 상하좌우로 부드럽게 움직입니다.
* **발사 (Release to Fire)**: 조준 상태에서 **왼손 엄지를 터치 화면에서 떼는 즉시(Touch End)**, 총구에서 강렬한 총구 화염(Muzzle Flash) 불꽃이 터지며 산탄 총알이 발사됩니다.

#### ② 오른손 엄지 조작부: 십자형(상하좌우) 슬라이드 화살표 버튼 (위치: `6.8`)
* **배치 위치**: 가로화면 좌측 끝(`0`) 기준 **`6.8`** 지점에 상하좌우 화살표 터치 버튼 세트의 중심축을 배치합니다.
* **기하학적 형태 및 비율 규격**:
  * **좌/우 버튼 중앙 밀착**: `좌(◀)` 버튼과 `우(▶)` 버튼이 정중앙에서 서로 빈틈없이 맞닿아 붙어 있습니다.
  * **상/하 버튼 상하 밀착**: `상(▲)` 버튼과 `하(▼)` 버튼은 맞붙어 있는 좌우 버튼의 바로 위와 아래 중앙에 각각 붙어서 배치됩니다.
  * **크기 비율**: **좌우 버튼의 횡길이(가로 폭)만 상하 버튼 가로 폭의 `1.5배`**로 제작합니다. **모든 상하좌우 4개 버튼의 세로 높이(Height)는 `1.0배`로 동일**합니다.
* **조작 방식 (Click-free Slide/Hover)**: 버튼을 일일이 떼었다 누르는 클릭 없이, 오른손 엄지를 화살표 버튼들 위로 **문지르기만 해도(Touch Move / Slide)** 엄지가 닿아 있는 방향(대각선 경계 포함)으로 주인공 캐릭터가 게임 속에서 즉각 상하좌우 이동합니다.

### 2.2. 모바일 세로화면(Portrait) 및 데스크톱(Desktop) 반응형 최적 세팅
세 가지 화면 환경(`모바일 가로`, `모바일 세로`, `데스크톱`)을 CSS 미디어쿼리와 `window.innerWidth / innerHeight` 비율 감지로 완전히 분리하여 각각 다른 전용 UX로 세팅합니다.

| 구분 | 모바일 가로화면 (Landscape) | 모바일 세로화면 (Portrait) | 데스크톱 화면 (Desktop) |
| :--- | :--- | :--- | :--- |
| **카메라 화각(FOV)** | 와이드 화각 (`FOV 60°`) | 상하 확장 화각 (`FOV 75°`, 비행 궤적 상단 배치) | 시네마틱 와이드 (`FOV 55°`, 고해상도 텍스처) |
| **총구 조준 및 발사** | `3.2` 위치 부채꼴 터치패드 문지르기 후 떼서 발사 | 하단 좌측(`2.8`) 부채꼴 패드 문지르기 후 떼서 발사 | 화면 하단 부채꼴 반원 패드 위를 **마우스로 클릭한 채 움직이면 총구가 이동**, **마우스 클릭을 떼면(Mouse Up)** 현재 위치에서 불꽃과 함께 발사 |
| **캐릭터 이동** | `6.8` 위치 상하좌우 화살표 슬라이드 | 하단 우측(`7.2`) 상하좌우 화살표 슬라이드 | 우측 하단 화살표 위 마우스 호버/드래그 **또는 키보드 `WASD` / 방향키** 동시 지원 |

---

### 2.3. [핵심 UX 개선] 시야 가림 방지(Zero-Occlusion) 및 1초 후 양측 상단 축소·소멸 시스템
지난 프로젝트에서 게임 속 알림 메시지, 콤보 텍스트, 스테이지 설명 등이 주인공 캐릭터나 날아오는 타겟(NPC/클레이)을 몇 초씩 가려 게임 플레이를 방해했던 문제를 원천 해결하기 위해 **모든 인게임 UI/메시지에 강제 적용되는 UX 프로토콜**입니다.

1. **캐릭터 & 타겟 보호 구역(Golden Zone) 침범 금지**
   * 화면 중앙 사격 구역(Y축 `20% ~ 75%`)과 주인공 캐릭터 주변 반경에는 어떤 고정형 팝업창이나 불투명 배너도 배치하지 않습니다.
   * 모든 안내/판정 텍스트는 터치 이벤트를 통과시키는 `pointer-events: none` 속성을 기본 부여합니다.
2. **메시지 표시 1.0초 후 양 사이드 상단 순차 축소·소멸 규칙 (1-Second Hold & Corner Shrink)**
   * 게임 중 발생하는 모든 메시지(예: `"STAGE START!"`, `"PERFECT LEAD SHOT! +300"`, `"WAVE WARNING! 파도를 피하세요!"`, `"COMBO x5!"` 등)는 화면에 등장한 시점부터 **정확히 `1.0초(1000ms)` 동안만 반투명(`opacity: 0.9`) 상태로 표시**됩니다.
   * **1.0초가 경과하는 즉시**, 해당 메시지는 **`0.4초(400ms)` 동안 크기가 `Scale 1.0 → 0.25`로 작아지면서 화면의 좌측 상단(`X: 1.0, Y: 0.8`) 또는 우측 상단(`X: 9.0, Y: 0.8`) 스코어/로그 트레이로 빨려 들어가듯 이동하며 완전히 사라집니다(`opacity: 0`).**
   * **양 사이드 교차(Sequential Alternating) 처리**: 메시지가 연속으로 2개 이상 발생할 경우, 홀수 번째(1, 3, 5...) 메시지는 **좌측 상단**으로, 짝수 번째(2, 4, 6...) 메시지는 **우측 상단**으로 0.15초 시차를 두고 순차적으로 축소 이동하여 서로 겹치지 않게 소멸시킵니다.

```javascript
// [구현 필수 코드 규격] 메시지 1초 표시 후 양 사이드 상단으로 순차 축소 소멸하는 함수
let msgCounter = 0;
function spawnNonBlockingNotice(scene, text, type = 'info') {
  msgCounter++;
  const isLeft = (msgCounter % 2 === 1); // 홀수는 좌측 상단, 짝수는 우측 상단으로 교차 분배
  const targetX = isLeft ? scene.scale.width * 0.10 : scene.scale.width * 0.90;
  const targetY = scene.scale.height * 0.08;

  const label = scene.add.text(scene.scale.width * 0.5, scene.scale.height * 0.28, text, {
    fontFamily: 'Impact, Pretendard, sans-serif',
    fontSize: '32px',
    color: '#FFE600',
    stroke: '#3B1700',
    strokeThickness: 6
  }).setOrigin(0.5).setAlpha(0.92).setDepth(999);

  // 1단계: 1.0초(1000ms) 동안만 유지 후, 양 사이드 상단으로 축소 이동하며 소멸
  scene.tweens.add({
    targets: label,
    delay: 1000,          // 정확히 1초 뒤 이동 시작
    x: targetX,           // 좌/우 상단 코너 좌표
    y: targetY,
    scaleX: 0.22,         // 22% 크기로 축소
    scaleY: 0.22,
    alpha: 0,             // 투명하게 소멸
    duration: 400,        // 0.4초 동안 부드럽게 흡수
    ease: 'Cubic.easeIn',
    onComplete: () => label.destroy()
  });
}
```

---

## 3. 타겟(Clay) 비행 시스템 및 명중(Lead Shot) 판정 알고리즘

### 3.1. 타겟(Clay) 종류 및 사이즈 규격
* **타겟 모양 (3종 + 랜덤, 게임 세팅에서 4가지 옵션 중 선택 가능)**:
  1. **원반 모양 (Standard Disc)**: 양쪽에서 튀어나와 반대편으로 깔끔한 포물선 곡선을 그리며 날아가는 기본 타겟.
  2. **부메랑 모양 (Boomerang Clay)**: 화면 한쪽에서 튀어나와 중앙~반대편까지 날아갔다가, 정점에서 회전하며 **출발했던 방향이나 예상치 못한 곡선으로 되돌아가는(Return Curve) 고난도 타겟**.
  3. **UFO 모양 (Zig-Zag UFO Clay)**: 비행 중 상하로 꿈틀거리거나 순간 가속하는 변칙 궤적 타겟.
  4. **랜덤 출현 (Random Mix)**: 위 3가지 타겟이 스테이지 설정에 따라 무작위로 섞여 출현.
* **타겟 사이즈 (5단계) 및 스테이지별 자동 빈도 조절**:
  * **Size 1 (특대 - XL / 반지름 $1.4R$)** → **Size 2 (대 - L / $1.2R$)** → **Size 3 (중 - M / $1.0R$)** → **Size 4 (소 - S / $0.8R$)** → **Size 5 (특소 - XS / $0.6R$)**
  * Stage 1에서는 Size 1~2가 80% 출현하며, Stage 5로 갈수록 Size 4~5의 출현 빈도가 65% 이상으로 자동 상승합니다.

### 3.2. 타겟 명중 판정 공식 (리드 샷 / Lead Shot Hitbox)
날아가는 클레이 타겟의 정중앙이 아니라, **진행 방향 앞쪽(리드 구간)을 겨냥해야 명중**하는 실제 클레이 사격의 손맛을 구현합니다.

```
         [타겟 진행 방향: 왼쪽 ───▶ 오른쪽 비행 시]
                    ___________________
                   /                   \
                  |      ● (중심 C)     |======> 진행 방향 단위벡터 (V)
                   \___________________/
                         |<---- R ---->|
                         [ 명중 유효 구간 ]
                 (타겟 중심 C ~ 진행방향 앞쪽 반지름 R 위치)
```

* **좌우(진행 방향) 판정 조건**: 타겟의 반지름을 $R$, 현재 중심 좌표를 $\vec{C}(x_c, y_c)$, 진행 방향 단위 벡터를 $\vec{V}$라 할 때, 총구 조준점 $\vec{M}(x_m, y_m)$의 진행 방향 투영 위치 $d_{lead}$가 **타겟의 중심($0$)부터 진행 방향 앞쪽 반지름 길이($+R$) 사이**에 들어와야 합니다.
  $$0 \le (\vec{M} - \vec{C}) \cdot \vec{V} \le R$$
* **상하(수직 폭) 판정 조건**: 상하 위치 또한 동일한 폭 길이($R$) 범위 이내에 위치해야 합니다.
  $$|y_m - y_c| \le \frac{R}{2}$$
* **명중 연출**: 위 두 위치 사이를 모두 정확하게 겨냥한 시점에 왼손 엄지를 떼면(또는 마우스 클릭 해제 시) 총알이 발사되어 **명중(HIT!)** 판정이 발생하며, 3D 파편 파티클과 함께 클레이가 멋지게 산산조각 나는 타격 장면을 연출합니다.

---

## 4. [핵심 의사결정] 개발 플랫폼 선정 및 스테이지별 하이브리드 아키텍처

지난 프로젝트에서 **웹 프로토타입(Three.js + Phaser.js)으로 할지, Unity로 할지 결정하지 못해 겪었던 시행착오**를 완전히 방지하기 위해, 본 프로젝트의 기술적 특성(Google Flow MP4 + FFmpeg 모션 추출 활용 + 3D 탄도학 + 모바일 웹 즉시 실행)을 분석하여 아래와 같이 **최종 개발 플랫폼 아키텍처를 확정**합니다.

### 4.1. 플랫폼 비교 분석 및 최종 선정 결론
* **Unity (WebGL 빌드)의 한계**: 모바일 브라우저에서 초기 로딩 용량(30~80MB)이 무겁고, 본 기획의 핵심인 **외부 FFmpeg 추출 스프라이트/동영상 에셋을 동적으로 교체하거나 AI 코딩 에이전트가 단일 코드로 즉시 수정·디버깅하기에 비효율적**입니다.
* **최종 선정 플랫폼**: **[Three.js (3D 배경·클레이 궤적·파편 물리) + Phaser 3 (FFmpeg 캐릭터 모션 스프라이트·터치 UI·사운드)] 웹 하이브리드 아키텍처**를 표준 플랫폼으로 채택합니다.
  * **Three.js 레이어 (하단 3D 캔버스)**: 3D 원근감을 가진 클레이 비행 궤적, 샷건 총구(Muzzle)의 3D 회전, 30조각 파편 폭발 물리 효과, Stage 4 파도 및 Stage 5 지프 트럭 지면 종스크롤 렌더링 담당.
  * **Phaser 3 / HTML5 UI 레이어 (상단 2D 오버레이)**: Google Flow + FFmpeg로 추출한 주인공 3인의 코믹 모션 시퀀스 재생, `3.2` 부채꼴 패드 및 `6.8` 화살표 슬라이드 입력 처리, 1초 후 상단으로 축소 소멸하는 UX 메시지 제어 담당.

### 4.2. 스테이지별 최적 렌더링 엔진 차등 적용 매트릭스

| 스테이지 | 배경 및 핵심 기믹 | 적용 기술 스택 (Three.js + Phaser 3 역할 분담) | 구현 핵심 포인트 |
| :--- | :--- | :--- | :--- |
| **Stage 1** | 미국 서부 초원 슈팅장 | **Phaser 3 (중심)** + Three.js (클레이/총구) | 서부 초원 2.5D 패럴랙스 배경 + 3D 클레이 포물선 비행 |
| **Stage 2** | 올림픽 경기용 슈팅장 | **Phaser 3 (중심)** + Three.js (고속 탄도) | 깔끔한 경기장 전광판 UI, 클레이 발사 속도 1.25배 가속 |
| **Stage 3** | 불꽃놀이 한밤의 서부 초원 | **Three.js (PointLight 조명/파티클)** + Phaser 3 | 밤하늘 불꽃놀이 3D 파티클이 터질 때 클레이 실루엣 역광 효과 |
| **Stage 4** | 카리브해 새하얀 모래 해변 (파도 회피) | **Three.js (3D 파도 평면 Wave Mesh)** + Phaser 3 (피격 모션) | 밀려오는 3D 파도 Z축 충돌 판정 → 캐릭터 접촉 시 움찔 모션 + 강제 오발 처리 |
| **Stage 5** | 지프 트럭 뒷자리 초원 질주 (종스크롤) | **Three.js (3D 무한 지면 UV 스크롤)** + Phaser 3 | 소실점에서 위에서 아래로 흘러오는 `ground_tile` UV 오프셋 회전 + 차량 진동 카메라 쉐이크 |

---

## 5. 게임 진행 순서 및 5대 스테이지 상세 시나리오

### 5.1. 전체 프로그램 흐름 (User Flow)
**`[1. 인트로 동영상 (6초 MP4)]`** ➔ **`[2. 로그인 화면 (소셜/게스트)]`** ➔ **`[3. 첫화면 (메인 로비)]`** ➔ **`[4. 게임 세팅 화면 (캐릭터 3종 / 클레이 4종 / 스테이지 선택)]`** ➔ **`[5. 인게임 스테이지 진행 (Stage 1~5)]`**

### 5.2. 게임 인트로 동영상 시나리오 (6초 MP4)
* **포맷 및 길이**: 6초 분량 고화질 MP4 (`intro_1960_texas.mp4`), 우측 상단 `[SKIP ⏭]` 버튼 제공.
* **분위기와 바이브**: 1960년대 미국 텍사스 시골 농장 배경의 코믹 서부 카우보이 애니메이션. 1960년식 낡은 민트/벽돌색 포드(Ford) 픽업트럭과 오래된 목장 풍차, 나무 울타리, 사격 장비들이 정겹게 배치되어 있음.
* **타임라인별 연출**:
  * **0.0초 ~ 2.0초**: 시끌벅적한 1960년대 텍사스 농장. 주변 카우보이들과 카우걸들이 샷건으로 클레이를 쏘며 환호하는 가운데, 코믹하면서도 멋지게 생긴 **젊은 남자 카우보이(주인공)**가 샷건을 어깨에 걸치고 의기양양한 표정으로 카메라 앞으로 걸어 나온다.
  * **2.0초 ~ 4.5초**: 양옆에서 5개의 클레이 원반이 순차적으로 솟구쳐 날아오른다. 주인공이 진지하면서도 익살스러운 사격 자세로 조준한 뒤 **탕! 탕! 탕! 탕! 탕!** 순식간에 5개를 연속으로 명중시켜 공중에서 화려하게 산산조각 낸다.
  * **4.5초 ~ 6.0초**: 총구에서 피어오르는 연기를 후 불며 무척 자랑스러워하는 주인공과, 뒤에서 모자를 던지며 열광적으로 축하하고 환호하는 동료 카우보이·카우걸들의 모습 위로 **`CLAYPOP VERSION 2`** 로고가 쾅 찍히며 로그인/첫화면으로 자연스럽게 디졸브 전환된다.

### 5.3. 첫화면(메인 로비) 및 게임 세팅 화면 UX 디자인
* **첫화면 디자인 컨셉**: 인트로 동영상의 6.0초 마지막 프레임(1960년대 포드 트럭과 목장 사격장 배경)이 자연스럽게 이어지는 웨스턴 나무 간판 UI.
* **주인공 캐릭터 3인 선택**:
  1. **젊은 남자 카우보이 (Billy)**: 밸런스형 표준 이동 속도 및 정밀 조준.
  2. **젊은 여자 카우걸 (Daisy)**: 경쾌하고 빠른 좌우 이동 속도 특화(Stage 4 파도 회피에 유리).
  3. **멋진 중년 카우보이 (Sheriff Buck)**: 묵직한 산탄 확산 범위 보유(리드 샷 판정 여유폭 +10% 보너스).
* **클레이 모양 4종 세팅**: `[원반 모양]`, `[부메랑 모양]`, `[UFO 모양]`, `[3가지 랜덤 출현]` 중 선택 가능.

### 5.4. 5개 스테이지 상세 기믹 설계
1. **Stage 1: 전형적인 미국 서부 초원의 아름다운 Clay 슈팅장**
   * 따사로운 오후 햇살의 텍사스 초원. 큰 사이즈(Size 1~2)의 원반 타겟 위주로 리드 샷 감각을 익히는 입문 스테이지.
2. **Stage 2: 올림픽 경기용 Clay 슈팅장**
   * 정교한 잔디와 관중석이 있는 국제 규격 사격장. 양쪽 발사대에서 동시에 2개가 교차 비행하는 더블 트랩(Double Trap) 패턴 등장.
3. **Stage 3: 불꽃놀이가 펼쳐지는 한밤의 미국 서부 초원 Clay 슈팅장**
   * 밤하늘에 화려한 폭죽이 터지며 조명 밝기가 실시간 변화함. 야광 도료가 발린 클레이와 불꽃놀이 파편이 어우러지는 시각적 쾌감 스테이지.
4. **Stage 4: 파도가 치고 물결이 드나드는 미국 서부 카리브해 새하얀 모래 해변 Clay 슈팅장**
   * **핵심 기믹 (파도 회피 & 오발 페널티)**: 주기적으로 해변 모래사장 위로 하얀 포말의 파도와 물결이 밀려왔다가 빠져나간다.
   * 게이머는 오른손 화살표(`6.8` 위치)를 문질러 물결이 닿지 않는 안전 지대로 캐릭터를 이동시켜야 한다.
   * **물결 접촉 시 반응**: 주인공 캐릭터가 물결에 닿으면 **차가운 물에 놀라 움찔(Flinch)하는 코믹 모션이 재생되면서 총부리(Muzzle)가 순간적으로 흔들리고, 그 즉시 총알이 강제 발사되지만 조준이 빗나가 타겟을 놓치게 된다.**
5. **Stage 5: 지프 트럭 뒷자리에 타고 달리는 미국 서부 초원 Clay 슈팅장 (종스크롤)**
   * **핵심 기믹 (종스크롤 주행 사격)**: 오픈형 클래식 지프 트럭 짐칸 뒷자리에 주인공이 탑승한 채 초원 비포장도로를 앞으로 질주한다.
   * **화면 연출**: 종스크롤 슈팅 게임처럼 **소실점(화면 상단 중앙)에서부터 아래쪽으로 그라운드(`ground_tile`)가 끊임없이 흘러 내려오는 입체 화면**을 구현한다. 덜컹거리는 트럭 위에서 부메랑·UFO 클레이를 격추하는 최종 스테이지.

---

## 6. [전담 섹션] Google Flow 생성 프롬프트 & FFmpeg 모션 추출 파이프라인 및 AI 에이전트 지시 프로토콜

지난 프로젝트에서 가장 큰 난관이었던 **"주인공 3D 모션 생성 → FFmpeg 추출 → 게임 내 상태별 반응 적용"** 과정을 완벽히 표준화하여, 개발자나 AI 코딩 에이전트가 즉시 실행할 수 있도록 정리한 파이프라인입니다.

### 6.1. 프로젝트 에셋 보관 표준 폴더 구조
아래 스크립트로 폴더 트리를 먼저 생성하여 Google Flow 원본 영상과 FFmpeg 추출 결과물을 체계적으로 분리 보관합니다.

```bash
mkdir -p assets/{intro,characters/{young_cowboy,young_cowgirl,middle_cowboy}/{raw_mp4,sprites},items/{shotgun,clay_disc,clay_boomerang,clay_ufo},stages/stage_{1..5}/{skybox,ground_tile}}
```

### 6.2. Google Flow 에셋 생성 마스터 프롬프트 (캐릭터 / 아이템 / 스테이지 / 4초 모션)

#### A. 주인공 캐릭터 3인 메인 디자인 프롬프트 (크로마키 그린 배경 필수)
* **공통 네거티브 프롬프트**: `realistic photo, dark gritty, blurry, cropped feet, background clutter, watermark, text`
* **1) 주인공 젊은 남자 카우보이 (`young_cowboy`)**:
  > `"3D comic funny animation style character, Pixar and DreamWorks inspired, a cheerful handsome young American cowboy from the 1960s, exaggerated expressive eyebrows, wearing a classic tan Stetson hat, red bandana, denim vest, leather chaps, holding a vintage double-barrel shotgun, full body back-view and three-quarter view, standing on solid bright green chroma key background (#00FF00), vibrant studio lighting, 4k"`
* **2) 주인공 젊은 여자 카우걸 (`young_cowgirl`)**:
  > `"3D comic funny animation style character, Pixar inspired, an energetic young American cowgirl from the 1960s, braided ginger hair, white cowboy hat, fringed suede vest, confident funny smile, holding a vintage shotgun, full body three-quarter back view, solid bright green chroma key background (#00FF00), crisp toon shading, 4k"`
* **3) 주인공 멋진 중년 카우보이 (`middle_cowboy`)**:
  > `"3D comic funny animation style character, Pixar inspired, a charismatic middle-aged cowboy sheriff from the 1960s, thick handlebar mustache, silver-rimmed black cowboy hat, leather duster coat, cool and humorous expression, holding a heavy custom shotgun, full body three-quarter back view, solid bright green chroma key background (#00FF00), 4k"`

#### B. 캐릭터 반응별 4초 단위 모션(MP4) 생성 프롬프트 (캐릭터별 6종 필수 모션)
Google Flow에서 위 캐릭터 이미지를 레퍼런스로 고정한 뒤, **4초(4-second clip)** 단위로 아래 6가지 모션 MP4를 각각 생성합니다.

1. **`idle_aim.mp4` (4초 - 기본 조준 및 숨쉬기)**:
   > `"4-secondseamless loop animation, 3D comic cowboy character holding a shotgun aiming forward, subtle rhythmic breathing and comic head bobbing, solid green background (#00FF00), fixed camera"`
2. **`walk_left_right.mp4` (4초 - 좌우 게걸음 이동)**:
   > `"4-second loop animation, 3D comic cowboy side-stepping briskly left and right while keeping the shotgun aimed forward, funny exaggerated leg movement, solid green background (#00FF00), fixed camera"`
3. **`walk_up_down.mp4` (4초 - 상하 전후진 이동)**:
   > `"4-second loop animation, 3D comic cowboy stepping forward and backward in a funny tiptoe stance while aiming shotgun, solid green background (#00FF00), fixed camera"`
4. **`shoot_recoil.mp4` (4초 - 격발 및 코믹 반동)**:
   > `"4-second animation, 3D comic cowboy fires the shotgun with a big comic recoil jolting his hat up, followed by a quick confident reload, solid green background (#00FF00), fixed camera"`
5. **`wave_flinch.mp4` (4초 - Stage 4 파도 접촉 시 움찔 & 오발 모션)**:
   > `"4-second animation, 3D comic cowboy gets splashed by water at his boots, shivers and flinches comically in surprise, his shotgun muzzle jerks upward and accidentally fires into the air, solid green background (#00FF00)"`
6. **`cheer_victory.mp4` (4초 - 연속 명중 환호 모션)**:
   > `"4-second animation, 3D comic cowboy spins his shotgun, tips his cowboy hat, and jumps with a huge proud comic grin, solid green background (#00FF00)"`

#### C. 아이템 및 Stage 5 종스크롤 원경 / `ground_tile` 생성 프롬프트
* **클레이 3종 (원반 / 부메랑 / UFO)**:
  > `"3D comic style clay target set: 1) bright neon orange standard clay disc, 2) V-shaped aerodynamic boomerang clay target with western star stripes, 3) glowing retro 1960s saucer UFO shaped clay target, isolated on solid green background (#00FF00), 4k"`
* **Stage 5 원경(`skybox_far.png`) 프롬프트**:
  > `"1960s American Texas prairie horizon panorama, comic 3D animation style, distant red rock mesas, wooden windmills, warm sunset sky with fluffy stylized clouds, seamless horizontal panoramic background"`
* **Stage 5 종스크롤 바닥 타일(`ground_tile.png`) 프롬프트 (상하 Seamless 필수)**:
  > `"Seamless vertically tileable top-down ground texture of a 1960s Texas dirt ranch road flanked by dry prairie grass and small desert pebbles, 3D comic cartoon painted style, no shadows on edges, 1024x1024 repeating texture"`

---

### 6.3. FFmpeg 모션 추출 및 스프라이트 시트 변환 자동화 스크립트
Google Flow에서 생성된 4초짜리 `.mp4` 파일의 그린스크린(`#00FF00`)을 투명하게 제거하고, 웹 게임 엔진(Phaser 3)에서 즉각 불러와 반응별로 재생할 수 있는 **경량 투명 WebP 스프라이트 시트(24fps 기준 총 96프레임, 12x8 그리드)**로 변환하는 표준 FFmpeg 명령어입니다.

```bash
#!/bin/bash
# 파일명: tools/extract_motion_ffmpeg.sh
# 사용법: ./tools/extract_motion_ffmpeg.sh young_cowboy wave_flinch

CHAR_NAME=$1      # 예: young_cowboy
MOTION_NAME=$2    # 예: wave_flinch
INPUT_MP4="assets/characters/${CHAR_NAME}/raw_mp4/${MOTION_NAME}.mp4"
OUTPUT_WEBP="assets/characters/${CHAR_NAME}/sprites/${MOTION_NAME}_sheet.webp"

# 1. 그린스크린(#00FF00) 크로마키 투명화 + 256x256 리사이즈 + 24fps 추출 + 12x8 타일 스프라이트 시트 병합
ffmpeg -y -i "$INPUT_MP4" \
  -vf "fps=24,colorkey=0x00FF00:0.28:0.12,scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000,tile=12x8" \
  -c:v libwebp -lossless 0 -q:v 80 "$OUTPUT_WEBP"

echo "✅ 변환 완료: $OUTPUT_WEBP (프레임 크기: 256x256, 총 96프레임, 12열x8행)"
```

---

### 6.4. [복사해서 바로 쓰는] AI 코딩 에이전트(Agent) 작업 지시 및 역질문 유도 프롬프트
개발 과정에서 AI 코딩 에이전트에게 캐릭터 모션 연동과 스테이지 구현을 지시할 때, **아래 블록을 그대로 복사하여 에이전트에게 전달**하면 에이전트가 구조를 오해하지 않고 필요한 정보를 먼저 역질문하며 정확히 코드를 작성합니다.

> **[AI Agent 전용 시스템 지시문 (복사하여 사용)]**
> ```text
> 당신은 'Claypop Version 2' (Three.js + Phaser 3 하이브리드 웹 슈팅 게임)의 수석 개발 에이전트입니다.
> 
> [필수 아키텍처 규칙]
> 1. 3D 클레이 비행 궤적, 파편 폭발, Stage 4 파도 충돌, Stage 5 바닥 타일(ground_tile.png) UV 종스크롤은 Three.js로 구현하십시오.
> 2. 주인공 캐릭터의 움직임은 3D 모델(GLTF)을 직접 리깅하지 않고, Google Flow로 생성 후 FFmpeg로 크로마키 제거 및 타일링된 WebP 스프라이트 시트(256x256, 12x8 그리드, 24fps, 4초=96프레임)를 Phaser 3 Sprite Animation State Machine으로 로드하여 상태별로 즉시 전환하십시오.
> 3. 캐릭터 상태(State)는 반드시 다음 6가지 입력 반응에 매핑하십시오:
>    - IDLE_AIM: 우측 화살표(6.8 위치) 미입력 시 기본 재생
>    - MOVE_LR: 우측 화살표 좌/우(1.5배 폭 버튼) 슬라이드 중 재생
>    - MOVE_UD: 우측 화살표 상/하 슬라이드 중 재생
>    - SHOOT_RECOIL: 좌측 부채꼴 패드(3.2 위치)에서 엄지를 뗄 때(pointerup) 즉시 1회 재생
>    - WAVE_FLINCH: Stage 4에서 파도 충돌 시 즉시 재생하며 총구를 흔들고 강제 오발 처리
>    - CHEER_VICTORY: 5연속 명중 또는 스테이지 클리어 시 재생
> 4. 모든 인게임 알림/판정 텍스트는 캐릭터와 클레이를 가리지 않도록 생성 후 정확히 1.0초(1000ms) 뒤에 0.4초 동안 좌측 상단(1.0)과 우측 상단(9.0)으로 번갈아 축소(Scale 0.22)되며 사라지게 구현하십시오.
> 
> [에이전트 필수 사전 확인 절차]
> 코드를 작성하기 전에, 현재 준비된 FFmpeg 스프라이트 시트 파일 경로, 프레임 해상도, 또는 우선 구현할 Stage 번호(1~5) 중 확인이 필요한 사항이 있다면 개발자에게 먼저 명확한 질문 리스트를 제시하여 답변을 받은 뒤 구현을 시작하십시오.
> ```

---

## 7. 미니게임의 몰입감을 높이는 추가 기획 제안 (아이디어 확장)

단순 반복 사격을 넘어 게이머가 계속 플레이하고 싶게 만드는 4가지 아케이드 재미 요소를 추가 제안합니다.

1. **'하이 눈(High Noon) 쇼다운 피버 타임' 시스템**
   * 리드 샷으로 클레이를 놓치지 않고 **5연속 명중(5 Chain Hit)**시키면 서부극 휘파람 소리와 함께 **6초간 '쇼다운 피버 타임'**이 발동됩니다.
   * 피버 타임 동안 화면 테두리에 황금빛 이펙트가 켜지고, 날아오는 클레이의 비행 속도가 40% 느려지는 슬로우 모션(Bullet Time)이 걸리며 황금 보너스 클레이가 대량 출현합니다.
2. **스페셜 해프닝 타겟 (보너스 & 방해 기믹)**
   * **황금 보안관 배지 클레이**: 크기는 가장 작지만(Size 5), 명중 시 남은 시간 `+5초` 및 점수 3배 획득.
   * **다이너마이트 묶음 클레이**: 맞추면 화면 전체에 대폭발이 일어나며 현재 화면에 떠 있는 모든 클레이를 한꺼번에 격추(전면 클리어).
   * **날아가는 카우보이 모자 (사격 금지 타겟)**: 인트로에 등장했던 동료의 모자가 바람에 날려 클레이 사이에 섞여 날아옵니다. 모자를 쏘면 동료가 코믹하게 화를 내며 점수가 감점됩니다.
3. **스테이지별 동적 난이도 자동 보정 (Dynamic Difficulty Adjustment)**
   * 플레이어의 최근 10발 명중률이 80% 이상이면 Size 4~5(소형) 및 부메랑 클레이 비중을 즉시 높여 긴장감을 유지하고, 반대로 3연속 미스 시에는 Size 1(특대형) 원반 클레이를 보내주어 좌절감을 방지합니다.
4. **6초 쇼츠(Shorts) 하이라이트 리플레이 카드**
   * Stage 클리어 시, 가장 아슬아슬한 리드 샷으로 부메랑 클레이를 맞춘 순간을 1960년대 빈티지 필름 필터로 요약해 보여주어 친구에게 자랑할 수 있는 재미를 제공합니다.