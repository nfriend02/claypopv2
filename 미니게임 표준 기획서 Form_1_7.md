### **미니게임 표준 기획서 (Form_1_7)**
*Universal Mini-Game Master Specification & Production Blueprint — v1.7*
***검증 참조 프로젝트: 3D 아케이드 클레이 슈팅 게임 『Claypop Version 2』 (Claypop v2) — Three.js + Phaser 3 웹 하이브리드 아키텍처 (실서비스 검증/표준 준수)***
*이전 참조 프로젝트: 치킨런 v2 (chickenrunv2) — Form_1_6 / 범고래 (Killer Whale) — Form_1_5_2*

--------------------------------------------------------------------------------

### **0. 마스터 양식 개요 및 작성 규칙**
본 문서는 미니게임의 **엔진 선정 → 사전 설치 → 기획 → 3D 캐릭터/타겟 모션 영상 제작 → 배경·흐름 에셋 제작 → FFmpeg 컷 추출 파이프라인 → 리드 샷(Lead Shot) 탄도 판정 → Zero-Occlusion UX → 다국어 UX → 로그인/회원가입/마이페이지/로그아웃 → 관리자 도구 → 배포(GitHub/Firebase/Vercel) → 검증**까지 전 과정을 규정하는 **최상위 표준 기획서(Form_1_7)**이다.
Form_1_7은 Form_1_6의 모든 표준 규정을 계승하되, 3D 아케이드 클레이 슈팅 게임 『Claypop Version 2』의 기획 및 개발 사양을 바탕으로 **Three.js + Phaser 3 웹 하이브리드 아키텍처, 0~10 비율 정밀 좌표계 UX, 리드 샷 수학적 판정 알고리즘, Zero-Occlusion 메시지 소멸 프로토콜, Google Flow + FFmpeg 모션 자동화 파이프라인**을 정식 검증 표준으로 신설·갱신했다.

| 표시 | 의미 |
| ------ | ------ |
| ✅ **검증됨** | Claypop Version 2 및 chickenrunv2 표준에 기반하여 기술적/기획적 동작이 확인된 방식. 그대로 적용한다. |
| 🟨 **표준 필수 (참조 미구현)** | Form 표준상 필수이며 신규 기능 확장 시 반드시 구현해야 하는 항목. |

##### 0.1 절대 원칙 (Form_1_6 계승 + Claypop v2 확장)
* **절대 코딩 원칙** : 모든 소스 코드, 주석, 변수명, 파일명, 내부 키, 콘솔 로그는 **100% 영어(English Only)**. 게임 데이터(캐릭터명, 스테이지명, 타겟명 등)도 코드 내부에서는 영어로 정의하고, 화면 표시만 i18n 키로 번역한다. ✅
* **다국어 UX 원칙** : 플레이어에게 보이는 모든 텍스트(메뉴, 버튼, 안내, 판정, 에러, 툴팁, aria-label, alt, placeholder, 문서 제목)는 한국어(ko, 기본), 영어(en), 일본어(ja) 3개 언어를 기본 지원한다. ✅
* **3D 비주얼 원칙** : 모든 캐릭터·NPC·타겟·아이템·장애물은 **배경 없음(Alpha), 테두리 없음(No Outline), 베이크된 그림자 없음(No Drop Shadow)**의 Stylized 3D 카툰 스타일을 유지한다. ✅
* **움직임 원칙 (AI 모션 파이프라인)** : 정지 이미지 + 단순 회전/유포 효과를 금지한다. **Google Flow AI 동영상(4초 MP4)으로 실제 동작을 만들고, FFmpeg 크로마키(#00FF00) 및 12x8 그리드 WebP 스프라이트 시트 변환 파이프라인**을 거쳐 Phaser 3 State Machine으로 즉각 전환한다. ✅
* **하이브리드 3D/2D 렌더링 원칙** : 하단 Three.js 캔버스(3D 탄도학, 원근 궤적, 30조각 파편 폭발 물리, Stage 4 파도 Mesh, Stage 5 종스크롤 UV)와 상단 Phaser 2D/HTML5 UI 레이어(FFmpeg 캐릭터 모션, 입력 컨트롤러, 1초 소멸 UX)를 결합한 하이브리드 구조를 채택한다. ✅
* **Zero-Occlusion UX 원칙** : 사격 및 캐릭터 주변 사격 골든 존(Y축 20%~75%) 침범을 절대 금지한다. 인게임 모든 메시지는 **1.0초 표시 후 0.4초 동안 좌측 상단(1.0)과 우측 상단(9.0) 스코어 트레이로 순차 축소(Scale 0.22)되며 소멸**한다. ✅
* **표준 해상도 & 반응형 정밀 좌표계** : 모바일 가로화면(Landscape, 최우선 표준), 모바일 세로화면(Portrait), 데스크톱(Desktop) 3대 프로필을 자동 판별하며, 가로 화면 기준 **0~10 비율 좌표계(3.2 부채꼴 패드, 6.8 상하좌우 슬라이드)**를 정밀 적용한다. ✅

##### 0.2 Form_1_6 → Form_1_7 변경 요약
| 구분 | Form_1_6 | Form_1_7 (Claypop v2 마스터) |
| ------ | ------ | ------ |
| **참조 프로젝트** | 치킨런 v2 (chickenrunv2) | **3D 아케이드 클레이 슈팅 『Claypop Version 2』** |
| **핵심 장르** | 3D 러너 | **3D 코믹 아케이드 클레이 슈팅 (Clay Shooting)** |
| **렌더링 아키텍처** | Three.js (단일 3D) | **Three.js (3D 탄도/물리) + Phaser 3 (2D 모션/UI) 하이브리드** |
| **조작 체계** | 좌하단 점프 / 우하단 이동 | **0~10 비율 좌표계: 3.2 위치 부채꼴 패드 (조준/발사) + 6.8 위치 십자 화살표 슬라이드 (이동)** |
| **판정 알고리즘** | 바운딩 박스 / 레인 충돌 | **리드 샷 (Lead Shot) 벡터 투영 물리 판정 공식 적용** |
| **UX 메시지 제어** | 일반 오버레이 배너 | **Zero-Occlusion 1초 유지 후 양 사이드 상단 순차 축소 소멸 (1-Second Hold & Corner Shrink)** |
| **캐릭터 모션** | 5개 기본 모션 | **6개 필수 모션 (idle_aim, walk_left_right, walk_up_down, shoot_recoil, wave_flinch, cheer_victory)** |
| **스테이지 기믹** | 단순 장애물 피하기 | **특화 기믹 (Stage 4 파도 접촉 오발 페널티, Stage 5 지프 트럭 UV 종스크롤 주행 사격)** |
| **에셋 파이프라인** | asset_pipeline.py | **`extract_motion_ffmpeg.sh` 크로마키 추출 + `asset_pipeline.py` 종합 통합** |

--------------------------------------------------------------------------------

### **1. 마스터 문서 메타 정보**
| 항목 | 표준 사양 및 규격 | Claypop Version 2 작성 기준 |
| ------ | ------ | ------ |
| **게임명** | {현지화 타이틀} (한/영/일) | 클레이팝 버전 2 / Claypop Version 2 / クレイポップ バージョン2 |
| **영문 식별자 (ID)** | kebab-case 또는 lowercase | claypopv2 |
| **문서 양식 버전** | **Form_1_7 (v1.7)** | Form_1_7 |
| **엔진 (13장 결정)** | Vite + Three.js + Phaser 3 하이브리드 | Vite 8 + Three.js 0.186 + Phaser 3.80 |
| **백엔드** | Firebase (Auth, Firestore, Analytics, Hosting) | Firebase 13 SDK |
| **장르** | 코믹 3D 아케이드 클레이 슈팅 | 3D Comic Arcade Clay Shooting |
| **타깃 플랫폼** | 모바일 웹(가로 필수, 세로 지원), 데스크톱 웹, PWA | 반응형 크로스 플랫폼 (Mobile Landscape/Portrait, Desktop) |
| **플레이 타임** | 판당 1.5~3분, 5개 스테이지 | 스테이지당 90~120초 (5 Stage 구성) |
| **비주얼 스타일** | Stylized 3D 카툰 (1960s Texas Western) | 픽사/드림웍스 풍 1960년대 텍사스 서부 농장 바이브 |
| **코드 언어** | English Only | 100% English Code Base |
| **UX 언어** | ko(기본), en, ja | 한국어, 영어, 일본어 3개 국어 |
| **배포 파이프라인** | Localhost → GitHub → Firebase Hosting + Vercel | Firebase Hosting & Vercel 이중 배포 |

--------------------------------------------------------------------------------

### **2. 표준 폴더 구조 및 에셋 규격**
#### 2.1 Three.js + Phaser 3 하이브리드 프로젝트 구조 ✅ (Claypop v2 실제 구조)
```
📁 claypopv2/
├── index.html                 # DOM 레이아웃(로그인/메인로비/세팅/HUD/결과/마이페이지) + PWA 태그
├── vite.config.js             # server.port 3000, host true
├── firebase.json / .firebaserc / firestore.rules
├── 📁 src/
│   ├── main.js                # 진입점: i18n 초기화 → HybridGameManager 생성
│   ├── style.css              # 전역 스타일 + body[data-ux] 프로필별 반응형 레이아웃
│   ├── 📁 core/               # HybridGameManager, GameState, SaveSystem, CloudSave,
│   │                          # firebase, i18n, strings, UXMode, WorldScale
│   ├── 📁 renderer/           # ThreeCanvas (3D 탄도, 클레이 궤적, 30조각 파편, WaveMesh, GroundUV)
│   ├── 📁 phaser/             # PhaserOverlay (캐릭터 Sprite State Machine, UI, NoticeManager)
│   ├── 📁 physics/            # LeadShotPhysics (리드샷 투영 알고리즘, 3D 탄도 계산)
│   ├── 📁 entities/           # PlayerCharacter, ClayTarget (Disc, Boomerang, UFO), SpecialTarget
│   ├── 📁 stages/             # StageManager, Stage1_Prairie, Stage2_Olympic, Stage3_Fireworks,
│   │                          # Stage4_Caribbean, Stage5_JeepTruck
│   ├── 📁 input/              # InputController (3.2 Arc Pad, 6.8 Arrow Slide, Touch/Mouse/Keyboard)
│   ├── 📁 audio/              # SoundSynth (샷건 격발음, 클레이 파쇄음, 서부 BGM, 파도 SFX)
│   └── 📁 ui/                 # AuthUI, AccountUI, IntroCutscene, ZeroOcclusionNotice, HighNoonUI
├── 📁 public/                 # 빌드 정적 런타임 에셋
│   ├── manifest.webmanifest
│   ├── 📁 icons/              # mobile/, desktop/, source/
│   └── 📁 assets/
│       ├── 📁 anim/           # {characterId}/{action}_sheet.webp + json (12x8 WebP)
│       ├── 📁 stages/         # stage01~05/skybox_far.webp, ground_tile.webp, props_sheet.webp
│       ├── 📁 items/          # shotgun.webp, clay_disc.webp, clay_boomerang.webp, clay_ufo.webp
│       ├── 📁 images/         # characters/portraits/, logos/, title_bg.webp
│       └── 📁 videos/         # intro_1960_texas.mp4 (6초 인트로)
├── 📁 raw_videos/             # Google Flow 원본 MP4: {characterId}/{action}.mp4
├── 📁 raw_backgrounds/        # AI 생성 원본 배경 에셋 (stage01~05)
├── 📁 raw_generated/          # 캐릭터/타겟 원본 PNG (배경 제거 전)
├── 📁 tools/                  # extract_motion_ffmpeg.sh (FFmpeg 크로마키 추출 스크립트)
├── 📁 scripts/                # asset_pipeline.py, make_icons.py
└── 📁 .cache/                 # 미리보기 GIF 및 테스트 스크린샷

```

#### 2.2 Unity 프로젝트 구조 (비교/대체용)
```
📁 ClaypopV2_Unity/
├── 📁 Assets/
│   ├── 📁 _Project/
│   │   ├── 📁 Scripts/        # Core/, HybridBridge/, Physics/, UI/, Localization/
│   │   ├── 📁 Prefabs/        # Characters/, Targets/, Stages/, UI/
│   │   ├── 📁 Art/            # Sprites/(FFmpeg WebP/PNG), Materials/, Textures/
│   │   └── 📁 Stages/         # Stage01_05/
│   └── 📁 StreamingAssets/    # intro_1960_texas.mp4
└── 📁 RawAssets/              # raw_videos, raw_backgrounds
```

#### 2.3 에셋 기술 규격표
| 에셋 | 형식 | 해상도/크기 | 기술 규격 및 사용 규칙 |
| ------ | ------ | ------ | ------ |
| **인트로 동영상** | MP4 (H.264 + AAC) | 1280×720, 6초 (intro_1960_texas.mp4) | 1.5MB 목표, muted 자동재생 + 사운드 토글, 우측 상단 [SKIP ⏭] 버튼 제공 |
| **캐릭터 기준 이미지** | PNG RGBA | 1024×1024 이상 | 전신 3/4 뷰, 단색 그린 크로마키(#00FF00) 배경 |
| **캐릭터 모션 원본** | MP4 | 16:9, 1280×720, 4초 (96프레임) | Google Flow 4초 루프/원샷 모션 클립 |
| **스프라이트 시트** | WebP + JSON | 256×256 프레임, 12열×8행 (3072×2048) | FFmpeg 크로마키 투명화, 24fps 96프레임 시트 |
| **원경 skybox_far** | PNG → WebP | 2:1 (2048×1024) | 1960s 텍사스 파노라마, 하단 30% 연무 처리 |
| **바닥 타일 ground_tile**| PNG → WebP | 1:2 또는 1:1 (1024×1024) | 수직 정사영, 상하/좌우 무한 타일링, Stage 5 UV 스크롤 지원 |
| **소품 props_sheet** | PNG → WebP | 3:2 (3×2 격자) | 서부 농장 소품 (헛간, 건초더미, 풍차, 바위 등) |
| **클레이 타겟** | 3D Mesh & WebP | 반지름 R (1.4R ~ 0.6R) | 3D 원반, 부메랑, UFO 타겟 모델 및 파편 파티클 |

--------------------------------------------------------------------------------

### **3. 3D 비주얼 디자인 및 하이브리드 렌더링 규격**
##### 3.1 핵심 3대 렌더링 원칙 ✅
* **No Background (알파 투명화)** : 캐릭터 및 타겟 스프라이트는 크로마키(#00FF00) 제거 후 완전 투명 알파 채널을 유지한다.
* **No Border / No Outline (무테두리)** : 유색 외곽선을 금지하고 픽사 스타일의 부드러운 툰 셰이딩(Toon Shading)과 림라이트(Rim Light)로 볼륨감을 표현한다.
* **No Drop Shadow (무그림자 베이킹)** : 스프라이트 이미지 자체에 그림자를 굽지 않으며, Three.js 3D 공간 상에서 원형 반투명 메시(Blob Shadow)로 발밑 그림자를 동적 렌더링한다.

##### 3.2 하이브리드 렌더링 아키텍처 역할 분담
| 구분 | Three.js (하단 3D 캔버스) | Phaser 3 / HTML5 (상단 2D 오버레이) |
| ------ | ------ | ------ |
| **주요 담당 영역** | • 클레이 비행 3D 포물선/부메랑/UFO 탄도학<br>• 샷건 총구(Muzzle) 3D 회전 및 조준선<br>• 30조각 클레이 파편 폭발 물리 파티클<br>• Stage 4 3D 파도 Mesh (Z축 충돌 감지)<br>• Stage 5 지프 트럭 ground_tile UV 종스크롤 | • Google Flow + FFmpeg 추출 3인 캐릭터 모션 재생<br>• 3.2 부채꼴 패드 & 6.8 화살표 슬라이드 터치 입력<br>• 1초 후 양 사이드 상단 축소 소멸 UX 메시지 제어<br>• HUD 콤보, 스코어, 시간, 언어/계정 오버레이 UI |
| **렌더링 동기화** | `renderer.render(scene, camera)` (60 FPS) | `phaserGame.step()` (Three.js 클럭에 동기화) |

##### 3.3 공간 좌표계 및 3D 탄도학 규격
* **카메라 좌표계** : 가로화면 기본 FOV 60°, Y축 20%~75% 구간을 '사격 골든 존(Golden Zone)'으로 설정한다.
* **탄도 계산식** : 클레이 타겟의 3D 포물선 비행 궤적은 $P(t) = P_0 + V_0 t + rac{1}{2} G t^2$ 공식을 따르며, 부메랑 타겟은 정점에서 삼각함수 기반 $Sin/Cos$ 반환 곡선을 적용한다.

--------------------------------------------------------------------------------

### **4. 기본 캐릭터 및 클레이 타겟 생성 (기준 이미지)**
##### 4.1 등장 엔티티 분류표
| 분류 | 엔티티 ID | 명칭 / 특성 | 필수 동작 수 및 클레이 특성 |
| ------ | ------ | ------ | ------ |
| **Player Character** | `young_cowboy` | **Billy (젊은 남자 카우보이)** | 6개 모션 / 밸런스형 표준 이동 속도 및 정밀 조준 |
| **Player Character** | `young_cowgirl` | **Daisy (젊은 여자 카우걸)** | 6개 모션 / 빠른 좌우 이동 특화 (Stage 4 파도 회피에 유리) |
| **Player Character** | `middle_cowboy` | **Sheriff Buck (멋진 중년 카우보이)**| 6개 모션 / 묵직한 산탄 확산 범위 (리드샷 유효폭 +10% 보너스) |
| **Standard Clay** | `clay_disc` | **원반 모양 (Standard Disc)** | 깔끔한 포물선 곡선을 그리며 비행하는 기본 타겟 |
| **Standard Clay** | `clay_boomerang`| **부메랑 모양 (Boomerang Clay)** | 정점에서 회전하며 출발 방향으로 되돌아오는 고난도 타겟 |
| **Standard Clay** | `clay_ufo` | **UFO 모양 (Zig-Zag UFO Clay)** | 상하로 꿈틀거리거나 순간 가속하는 변칙 궤적 타겟 |
| **Special Target** | `badge_gold` | **황금 보안관 배지** | Size 5 (특소), 명중 시 남은 시간 +5초 및 점수 3배 |
| **Special Target** | `dynamite_pack`| **다이너마이트 묶음** | 격발 시 화면 전체 클레이 전면 대폭발 클리어 |
| **Special Target** | `cowboy_hat` | **날아가는 카우보이 모자 (사격 금지)**| 명중 시 동료 카우보이가 코믹하게 화를 내며 점수 감점 |

##### 4.2 기준 이미지 프롬프트 템플릿
```text
[Character Reference Sheet - 1960s Texas Cowboy/Cowgirl]
A single full-body 3D comic funny animation style character, Pixar and DreamWorks inspired,
a cheerful handsome {young cowboy / young cowgirl / middle-aged cowboy sheriff} from 1960s Texas,
wearing classic Stetson hat, bandana, vest, holding a vintage double-barrel shotgun,
standing in a neutral ready pose, three-quarter front/back view, full body visible from head to feet.
Vibrant studio lighting, soft toon shading, clean game asset.
Solid bright green chroma key background (#00FF00), no ground plane, no cast shadow, no text, 4k.
```

--------------------------------------------------------------------------------

### **5. 캐릭터 & 타겟 3D 모션 동영상(MP4) 제작 규격 및 프롬프트**
##### 5.1 제작 흐름 및 9대 규격 ✅
1. **길이 4초**, 16:9, **1280×720**, 24fps (총 96프레임).
2. 기준 이미지를 레퍼런스로 고정 (Google Flow / Veo Ingredients to Video).
3. **단색 크로마키 그린 스튜디오 배경 (#00FF00)**.
4. 피사체 1명만 등장, 화면 중앙 및 일정 크기 유지 (Tracking Camera).
5. 머리 끝부터 발끝까지 **전신이 화면 내 완벽 포함**.
6. **루프(Loop) 동작** : 시작/끝 포즈 일치 (idle, walk).
7. **원샷(One-Shot) 동작** : 준비 → 동작 → 완료 후 마지막 포즈 0.5초 정지 (shoot, wave_flinch, cheer).
8. 워터마크, 자막, 글자 절대 없음.

##### 5.2 주인공 캐릭터 3인 x 6대 핵심 모션 마스터 프롬프트
###### A. 공통 네거티브 프롬프트
`realistic photo, dark gritty, blurry, cropped feet, background clutter, watermark, text, dark shadow`

###### B. 캐릭터별 6종 필수 모션 프롬프트
1. **`idle_aim.mp4` (4초 - 기본 조준 및 숨쉬기 / Loop)** :
   "4-second seamless loop animation, 3D comic cowboy character holding a shotgun aiming forward, subtle rhythmic breathing and comic head bobbing, solid green background (#00FF00), fixed camera."
2. **`walk_left_right.mp4` (4초 - 좌우 게걸음 이동 / Loop)** :
   "4-second loop animation, 3D comic cowboy side-stepping briskly left and right while keeping the shotgun aimed forward, funny exaggerated leg movement, solid green background (#00FF00), fixed camera."
3. **`walk_up_down.mp4` (4초 - 상하 전후진 이동 / Loop)** :
   "4-second loop animation, 3D comic cowboy stepping forward and backward in a funny tiptoe stance while aiming shotgun, solid green background (#00FF00), fixed camera."
4. **`shoot_recoil.mp4` (4초 - 격발 및 코믹 반동 / One-Shot)** :
   "4-second animation, 3D comic cowboy fires the shotgun with a big comic recoil jolting his hat up, followed by a quick confident reload, solid green background (#00FF00), fixed camera."
5. **`wave_flinch.mp4` (4초 - Stage 4 파도 접촉 시 움찔 & 강제 오발 / One-Shot)** :
   "4-second animation, 3D comic cowboy gets splashed by water at his boots, shivers and flinches comically in surprise, his shotgun muzzle jerks upward and accidentally fires into the air, solid green background (#00FF00)."
6. **`cheer_victory.mp4` (4초 - 연속 명중 및 스테이지 승리 환호 / One-Shot)** :
   "4-second animation, 3D comic cowboy spins his shotgun, tips his cowboy hat, and jumps with a huge proud comic grin, solid green background (#00FF00)."

--------------------------------------------------------------------------------

### **6. 배경 이미지 및 배경 흐름용 추가 이미지 규격과 프롬프트**
##### 6.1 배경 3층 구조 및 5대 스테이지 매트릭스
| 스테이지 ID | 배경 명칭 | 원경 Far (Skybox) | 바닥 Ground (Tile/UV) | 근경 Props (소품 시트) | 기믹 및 특수 렌더링 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| **Stage 1** | 미국 서부 초원 슈팅장 | 따사로운 노을빛 텍사스 초원 | 2.5D 초원 흙길 타일 | 빨간 헛간, 건초더미, 울타리 | 기본 입문 (Size 1~2 원반 중심) |
| **Stage 2** | 올림픽 경기용 슈팅장 | 정교한 관중석 & 전광판 | 국제 규격 사격 잔디 지면 | 더블 트랩 발사대, 깃발 | 발사 속도 1.25배 가속 + 더블 트랩 |
| **Stage 3** | 불꽃놀이 밤의 서부 초원 | 불꽃놀이 한밤의 텍사스 밤하늘 | 한밤의 서부 초원 타일 | 야광 조명탑, 폭죽 장치 | PointLight 3D 파티클 & 역광 실루엣 |
| **Stage 4** | 카리브해 모래 해변 | 에메랄드빛 바다 & 수평선 | 하얀 모래사장 텍스처 | 야자수, 해변 파라솔, 조개 | **3D 파도 Mesh 접촉 시 움찔 & 오발** |
| **Stage 5** | 지프 트럭 질주 슈팅장 | 소실점 원경 (skybox_far) | **ground_tile.png (UV 종스크롤)**| 비포장 도로 바위, 선인장 | **지프 트럭 종스크롤 주행 사격** |

##### 6.2 Stage 5 종스크롤 바닥 타일 프롬프트 (`ground_tile.png`)
```text
Create a seamless vertically tileable top-down ground texture of a 1960s Texas dirt ranch road
flanked by dry prairie grass and small desert pebbles, 3D comic cartoon painted style,
strict top-down orthographic view, no perspective, no horizon, top and bottom edges match perfectly.
1024x1024 repeating texture, flat even lighting, solid crisp details.
```

--------------------------------------------------------------------------------

### **7. FFmpeg 기반 컷(프레임) 추출 및 에셋 파이프라인**
##### 7.1 FFmpeg 모션 추출 스크립트 (`tools/extract_motion_ffmpeg.sh`) ✅
```bash
#!/bin/bash
# 파일명: tools/extract_motion_ffmpeg.sh
# 사용법: ./tools/extract_motion_ffmpeg.sh young_cowboy wave_flinch

CHAR_NAME=$1      # 예: young_cowboy
MOTION_NAME=$2    # 예: wave_flinch
INPUT_MP4="raw_videos/${CHAR_NAME}/${MOTION_NAME}.mp4"
OUTPUT_WEBP="public/assets/anim/${CHAR_NAME}/${MOTION_NAME}_sheet.webp"

mkdir -p "public/assets/anim/${CHAR_NAME}"

# 1. 크로마키 그린(#00FF00) 투명화 + 256x256 리사이즈 + 24fps 추출 + 12x8 그리드 스프라이트 병합
ffmpeg -y -i "$INPUT_MP4"   -vf "fps=24,colorkey=0x00FF00:0.28:0.12,scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000,tile=12x8"   -c:v libwebp -lossless 0 -q:v 80 "$OUTPUT_WEBP"

echo "✅ [Claypop v2 Pipeline] 변환 완료: $OUTPUT_WEBP (256x256, 96프레임, 12x8 Grid)"
```

##### 7.2 파이프라인 자동화 (`scripts/asset_pipeline.py`)
```powershell
python scripts/asset_pipeline.py videos                                   # raw_videos 전체 변환
python scripts/asset_pipeline.py videos --char young_cowboy --action shoot # 단일 클립 변환
python scripts/asset_pipeline.py backgrounds [--stage 1]                  # 스테이지 배경 처리
python scripts/asset_pipeline.py all                                      # 전체 에셋 파이프라인 재실행
```

--------------------------------------------------------------------------------

### **8. 다국어(i18n) 세팅 프로세스**
##### 8.1 Claypop v2 전용 strings.js 예시 ✅
```javascript
export const STRINGS = {
  'game.title': { ko: '클레이팝 버전 2', en: 'Claypop Version 2', ja: 'クレイポップ バージョン2' },
  'hud.score': { ko: '점수: {n}', en: 'Score: {n}', ja: 'スコア: {n}' },
  'hud.combo': { ko: '{n} 콤보!', en: '{n} Combo!', ja: '{n} コンボ！' },
  'notice.stageStart': { ko: 'STAGE {n} START!', en: 'STAGE {n} START!', ja: 'STAGE {n} スタート！' },
  'notice.perfectLead': { ko: 'PERFECT LEAD SHOT! +{pts}', en: 'PERFECT LEAD SHOT! +{pts}', ja: 'パーフェクト リードショット! +{pts}' },
  'notice.waveWarning': { ko: 'WAVE WARNING! 파도를 피하세요!', en: 'WAVE WARNING! Avoid Waves!', ja: '波 경고! 波を避けてください！' },
  'fever.title': { ko: 'HIGH NOON SHOWDOWN FEVER!', en: 'HIGH NOON SHOWDOWN FEVER!', ja: 'ハイヌーン ショーダウン フィーバー！' },
  'char.young_cowboy': { ko: '빌리 (젊은 카우보이)', en: 'Billy (Young Cowboy)', ja: 'ビリー (ヤングカウボーイ)' },
  'char.young_cowgirl': { ko: '데이지 (젊은 카우걸)', en: 'Daisy (Young Cowgirl)', ja: 'デイジー (ヤングカウガール)' },
  'char.middle_cowboy': { ko: '버크 보안관 (중년 카우보이)', en: 'Sheriff Buck', ja: 'バック 保安官' },
  'lang.label': { ko: 'English', en: 'Japanese', ja: 'Korean' }
};
```

--------------------------------------------------------------------------------

### **9. 사용자 생명주기, 로그인/회원가입/마이페이지/로그아웃 세팅**
#### 9.1 상태 전이 다이어그램 (User Flow)
`[1. 인트로 동영상 (6초 MP4)]` ➔ `[2. 로그인 화면 (4종)]` ➔ `[3. 첫화면 (메인 로비)]` ➔ `[4. 게임 세팅 화면 (캐릭터 3종/클레이 4종/스테이지 선택)]` ➔ `[5. 인게임 진행 (Stage 1~5)]` ➔ `[6. 3초 엔딩 연출 (Cheer/Sulk)]` ➔ `[7. 결과 화면 & 6초 쇼츠 리플레이 카드]`

#### 9.2 로그인 4종 & 가상 이메일 규격
* **게스트 (Guest)** : 별명 입력 후 `signInAnonymously()` 진입. `expireAt = now + 100일` 설정 후 TTL 자동 삭제.
* **Google** : 1-Click `signInWithPopup(GoogleAuthProvider)`.
* **이메일/비밀번호** : 표준 이메일 인증.
* **전화번호/비밀번호** : 가상 이메일 `{cc}-{number}@phone.claypopv2.app` 기반 인증 (SMS 비용 0원).

#### 9.3 Firestore 보안 규칙 (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      function isOwner() { return request.auth != null && request.auth.uid == uid; }
      function validClaypopProgress() {
        let d = request.resource.data;
        return d.keys().hasOnly(['mileage','totalRuns','highScores','selectedCharacter','selectedClay',
                                 'selectedStage','bgmVolume','sfxVolume','displayName','provider',
                                 'createdAt','updatedAt','nickname','accountId','expireAt'])
          && d.mileage is int && d.mileage >= 0
          && d.totalRuns is int && d.totalRuns >= 0
          && d.highScores is map
          && d.displayName is string && d.displayName.size() <= 120
          && (!('nickname' in d) || (d.nickname is string && d.nickname.size() <= 12))
          && (!('expireAt' in d) || d.expireAt is timestamp);
      }
      allow read: if isOwner();
      allow create, update: if isOwner() && validClaypopProgress();
      allow delete: if isOwner();
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

--------------------------------------------------------------------------------

### **10. 스테이지 연출: 3초 엔딩 애니메이션, 스틸컷 & 쇼츠 하이라이트**
* **3초 엔딩 연출 (3-Second Ceremony)** :
  * **클리어** : `cheer_victory.mp4` 환호 모션, 서부 폭죽 파티클, 팡파레 SFX (3.0초 보장).
  * **실패** : `wave_flinch.mp4` 또는 실망 모션, 블루 비네팅, 코믹 피격 SFX (3.0초 보장).
* **6초 쇼츠(Shorts) 하이라이트 리플레이 카드** : Stage 클리어 시 최고 리드 샷 명중 순간을 1960년대 빈티지 필름 필터로 6초 요약 재생하여 SNS 공유 및 자랑하기 기능 제공.

--------------------------------------------------------------------------------

### **11. 관리자(Admin) 'Pause/Go' 시스템**
* **진입 단축키** : `F8` 또는 관리자 계정(`admin: true` Custom Claim) 전용 ⏸ Pause / ▶ Go UI 버튼.
* **디버그 오버레이** : 일시정지 시 타겟 3D 히트박스($R$ 반지름), 리드 샷 투영 벡터 $ec{V}$, 총구 조준점 $ec{M}$, Stage 4 파도 Mesh Z축 충돌선 표시.

--------------------------------------------------------------------------------

### **12. 스테이지 · 캐릭터 · 타겟 · 아이템 마스터 표준 시트**
##### 12.1 주인공 캐릭터 3종 스탯 마스터 시트
| 캐릭터 ID | 캐릭터 명칭 | 이동 속도 (Speed) | 조준 정밀도 (Precision) | 확산 범위 (Spread) | 고유 특성 및 기믹 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| `young_cowboy` | **Billy** | ★★★☆☆ (3) | ★★★★☆ (4) | ★★★☆☆ (3) | **표준 밸런스형**: 이동 및 조준 안정성 최적화 |
| `young_cowgirl`| **Daisy** | ★★★★★ (5) | ★★★☆☆ (3) | ★★☆☆☆ (2) | **이동 특화형**: 이동 속도 +40% (Stage 4 파도 회피 최강) |
| `middle_cowboy`| **Sheriff Buck**| ★★☆☆☆ (2) | ★★★☆☆ (3) | ★★★★★ (5) | **산탄 확산형**: 리드 샷 유효 판정 범위 +10% 여유 보너스 |

##### 12.2 클레이 타겟 4종 & 스페셜 타겟 3종 시트
| 타겟 ID | 타겟 명칭 | 궤적 형태 (Trajectory) | 사이즈 범위 | 점수 | 특수 기믹 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| `clay_disc` | 원반 타겟 | 표준 포물선 곡선 비행 | Size 1~5 | 100 pt | 기본 리드 샷 연습 타겟 |
| `clay_boomerang`| 부메랑 타겟 | 정점 회전 후 반대/출발 곡선 복귀 | Size 2~5 | 250 pt | 궤적 예측이 필요한 고난도 타겟 |
| `clay_ufo` | UFO 타겟 | 지그재그 순간 가속 변칙 비행 | Size 3~5 | 400 pt | 속도 변화에 대응하는 최고 난도 타겟 |
| `badge_gold` | 황금 보안관 배지| 직선 고속 비행 | Size 5 (특소) | 1,000 pt | 명중 시 남은 시간 +5초 & 점수 3배 보너스 |
| `dynamite_pack`| 다이너마이트 | 포물선 완만 비행 | Size 2 (대) | 500 pt | 격발 시 화면 내 모든 클레이 일괄 전면 폭파 |
| `cowboy_hat` | 동료 카우보이 모자| 바람에 살랑이는 낙하 비행 | Size 3 (중) | -300 pt | **사격 금지**: 명중 시 동료 화냄 & 점수 감점 |

--------------------------------------------------------------------------------

### **13. 개발 플랫폼 선정: Three.js + Phaser 3 하이브리드 판단 프레임워크**
##### 13.1 엔진 판단 매트릭스 (Claypop v2 적용)
| # | 판단 항목 | Three.js + Phaser 3 하이브리드 점수 | 사유 및 기술적 근거 |
| ------ | ------ | ------ | ------ |
| 1 | 배포 대상 | **-2점 (웹 배포)** | 웹 브라우저 기반 무설치 즉시 실행 & PWA 설치 |
| 2 | 물리 복잡도 | **-1점 (탄도학/투영)** | 3D 포물선 탄도학 및 리드샷 벡터 계산은 수식으로 구현 충분 |
| 3 | 캐릭터 표현 | **-2점 (FFmpeg 스프라이트)**| Google Flow MP4 -> FFmpeg 12x8 WebP 시트 연동 최적화 |
| 4 | 로딩 속도 | **-2점 (경량 로딩)** | 3초 이내 초고속 초기 로딩 필수 |
| 5 | AI 에이전트 수정 | **-2점 (JS/Web HMR)** | 단일 JS 코드베이스 기반 AI Agent 즉시 수정 및 HMR |
| **합계** | **최종 점수: -9점** | **Three.js + Phaser 3 하이브리드 아키텍처 최종 확정** |

--------------------------------------------------------------------------------

### **14. 사전 설치 및 개발 환경 세팅**
```powershell
# 1. 필수 도구 확인
git --version
node -v          # v20 LTS 이상
python --version # v3.10 이상
ffmpeg -version  # v6.0 이상

# 2. Python 크로마키/이미지 패키지 설치
pip install "rembg[cpu]" pillow numpy imageio-ffmpeg

# 3. Vite + Three.js + Phaser 3 하이브리드 프로젝트 생성
npm create vite@latest claypopv2 -- --template vanilla
cd claypopv2
npm i three phaser firebase
npm run dev      # http://localhost:3000
```

--------------------------------------------------------------------------------

### **15. 조작 인터페이스, 리드 샷 수학 알고리즘 & Zero-Occlusion UX**
##### 15.1 모바일 가로화면 (0 ~ 10 비율) 정밀 조작부 배치
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

##### 15.2 조작 규격 및 프로필 매트릭스
1. **왼손 엄지 조작부 (위치: 3.2)** : 부채꼴 반원 패드. **문지르기(Touch & Rub)**로 총구 조준선 이동, **손가락을 떼는 즉시(Release / Touch End)** 총구 화염과 함께 산탄 발사.
2. **오른손 엄지 조작부 (위치: 6.8)** : 상하좌우 십자 화살표. **좌우 버튼 폭은 상하 버튼 가로 폭의 1.5배**, 세로 높이는 1.0배로 동일. 문지르기만 해도(Click-free Slide/Hover) 캐릭터 즉시 이동.
3. **반응형 UX 세팅** :
   * **Mobile Landscape** : FOV 60°, 3.2 부채꼴 & 6.8 화살표 정밀 배치.
   * **Mobile Portrait** : FOV 75°, 하단 좌측(2.8) 부채꼴 패드 & 하단 우측(7.2) 화살표 배치.
   * **Desktop** : FOV 55°, 마우스 드래그 조준 & 마우스 업 발사, WASD/방향키 이동 지원.

##### 15.3 타겟 명중 판정 공식 (리드 샷 / Lead Shot Hitbox 투영 수학식)
날아가는 클레이 타겟의 정중앙이 아닌, **진행 방향 앞쪽(리드 구간)**을 겨냥해야 명중하는 리드 샷 수학 공식이다.
```
         [타겟 진행 방향: 왼쪽 ───▶ 오른쪽 비행 시]
                    ___________________
                   /                                     |      ● (중심 C)     |======> 진행 방향 단위벡터 (V)
                   \___________________/
                         |<---- R ---->|
                         [ 명중 유효 구간 ]
                 (타겟 중심 C ~ 진행방향 앞쪽 반지름 R 위치)
```
* **진행 방향(좌우) 투영 조건** : 타겟 반지름 $R$, 중심 좌표 $ec{C}(x_c, y_c)$, 진행 방향 단위벡터 $ec{V}$, 총구 조준점 $ec{M}(x_m, y_m)$에 대해:
  $$0 \le (ec{M} - ec{C}) \cdot ec{V} \le R$$
* **수직 방향(상하) 조건** :
  $$|y_m - y_c| \le rac{R}{2}$$
* 위 두 조건을 동시 만족한 상태에서 Touch End 발생 시 명중(HIT!) 판정 및 30조각 3D 파편 파티클 연출.

##### 15.4 시야 가림 방지(Zero-Occlusion) & 1초 후 축소 소멸 프로토콜 (JS 구현 코드) ✅
```javascript
// [Claypop v2 필수 구현 규격] 메시지 1초 표시 후 양 사이드 상단으로 순차 축소 소멸하는 프로토콜
let msgCounter = 0;
export function spawnNonBlockingNotice(scene, text, type = 'info') {
  msgCounter++;
  const isLeft = (msgCounter % 2 === 1); // 홀수는 좌측 상단(1.0), 짝수는 우측 상단(9.0)으로 교차 분배
  const targetX = isLeft ? scene.scale.width * 0.10 : scene.scale.width * 0.90;
  const targetY = scene.scale.height * 0.08;

  const label = scene.add.text(scene.scale.width * 0.5, scene.scale.height * 0.28, text, {
    fontFamily: 'Impact, Pretendard, sans-serif',
    fontSize: '32px',
    color: '#FFE600',
    stroke: '#3B1700',
    strokeThickness: 6
  }).setOrigin(0.5).setAlpha(0.92).setDepth(999);

  // 1.0초(1000ms) 유지 후 0.4초 동안 양 사이드 상단으로 Scale 0.22 축소 이동하며 소멸
  scene.tweens.add({
    targets: label,
    delay: 1000,          // 정확히 1초 뒤 이동 시작
    x: targetX,           // 좌/우 상단 스코어 트레이 좌표
    y: targetY,
    scaleX: 0.22,         // 22% 크기로 축소
    scaleY: 0.22,
    alpha: 0,             // 완전히 투명하게 소멸
    duration: 400,        // 0.4초 간 부드러운 흡수 연출
    ease: 'Cubic.easeIn',
    onComplete: () => label.destroy()
  });
}
```

--------------------------------------------------------------------------------

### **16. 로컬 실행, 소스 관리, 배포 파이프라인**
```powershell
# 1. 로컬 개발 실행
npm run dev

# 2. 빌드 및 테스트
npm run build
npm run preview

# 3. GitHub 저장소 커밋 및 푸시
git add .
git commit -m "feat: complete Claypop v2 Hybrid Master Specification Form 1.7"
git push origin main

# 4. Firebase Hosting 배포
npx vite build
npx -y firebase-tools@latest deploy --only hosting --project claypopv2 --non-interactive
```

--------------------------------------------------------------------------------

### **17. 미니게임 몰입감 극대화 추가 기획 제안**
1. **'하이 눈(High Noon) 쇼다운 피버 타임' 시스템** : 5연속 리드 샷 명중 시 6초간 서부극 휘파람 소리와 함께 피버 타임 발동. 화면 테두리 황금빛 이펙트, 슬로우 모션(Bullet Time -40%), 황금 보너스 배지 클레이 대량 출현.
2. **스페셜 해프닝 타겟** : 황금 보안관 배지(+5초, 3배 점수), 다이너마이트 묶음(전면 폭파), 날아가는 동료 카우보이 모자(사격 금지 페널티).
3. **동적 난이도 자동 보정 (DDA)** : 최근 10발 명중률 80% 이상 시 소형/부메랑/UFO 클레이 출현율 상승, 3연속 미스 시 특대형(Size 1) 원반 출현으로 좌절 방지.
4. **6초 쇼츠(Shorts) 리플레이 카드** : 클리어 시 가장 멋진 리드 샷 순간을 1960s 빈티지 필름 스타일 6초 하이라이트로 카드 생성 및 SNS 공유.

--------------------------------------------------------------------------------

### **18. AI 코딩 에이전트(Agent) 작업 지시서 및 시스템 프롬프트**
개발 과정에서 AI 코딩 에이전트에게 전달할 **[AI Agent 전용 시스템 지시문]**이다. 그대로 복사하여 사용한다.

```text
당신은 'Claypop Version 2' (Three.js + Phaser 3 하이브리드 웹 슈팅 게임)의 수석 개발 에이전트입니다.

[필수 아키텍처 규칙]
1. 3D 클레이 비행 궤적, 파편 폭발 물리, Stage 4 파도 Mesh 충돌, Stage 5 바닥 타일(ground_tile.png) UV 종스크롤은 Three.js로 구현하십시오.
2. 주인공 캐릭터의 움직임은 Google Flow로 생성 후 FFmpeg로 크로마키(#00FF00) 제거 및 타일링된 WebP 스프라이트 시트(256x256, 12x8 그리드, 24fps, 4초=96프레임)를 Phaser 3 Sprite Animation State Machine으로 로드하여 상태별로 즉시 전환하십시오.
3. 캐릭터 상태(State)는 다음 6가지 입력 반응에 매핑하십시오:
   - IDLE_AIM: 우측 화살표(6.8 위치) 미입력 시 기본 재생
   - MOVE_LR: 우측 화살표 좌/우(1.5배 폭 버튼) 슬라이드 중 재생
   - MOVE_UD: 우측 화살표 상/하 슬라이드 중 재생
   - SHOOT_RECOIL: 좌측 부채꼴 패드(3.2 위치)에서 엄지를 뗄 때(pointerup) 즉시 1회 재생
   - WAVE_FLINCH: Stage 4에서 파도 충돌 시 즉시 재생하며 총구를 흔들고 강제 오발 처리
   - CHEER_VICTORY: 5연속 명중 또는 스테이지 클리어 시 재생
4. 모든 인게임 알림/판정 텍스트는 사격 골든 존을 가리지 않도록 생성 후 정확히 1.0초(1000ms) 뒤에 0.4초 동안 좌측 상단(1.0)과 우측 상단(9.0)으로 번갈아 축소(Scale 0.22)되며 사라지게 구현하십시오.
5. 리드 샷 명중 판정은 진행 방향 단위벡터 투영 공식(0 <= (M - C) . V <= R 및 |ym - yc| <= R/2)을 엄격 적용하십시오.

[에이전트 필수 사전 확인 절차]
코드를 작성하기 전에, 현재 준비된 FFmpeg 스프라이트 시트 파일 경로, 프레임 해상도, 또는 우선 구현할 Stage 번호(1~5) 중 확인이 필요한 사항이 있다면 개발자에게 먼저 명확한 질문 리스트를 제시하여 답변을 받은 뒤 구현을 시작하십시오.
```

--------------------------------------------------------------------------------

### **19. 최종 제작 검증 및 완료 기준 (Master Checklist Q1~Q24)**
| 번호 | 검수 항목 | 합격 및 검증 기준 |
| ------ | ------ | ------ |
| **Q1** | 엔진 및 아키텍처 | Three.js + Phaser 3 하이브리드 아키텍처 판단 및 적용 완료 |
| **Q2** | 사전 환경 세팅 | Node.js, Python, FFmpeg (`colorkey` 지원) 사전 설치 및 작동 확인 |
| **Q3** | 폴더 구조 | `claypopv2` 표준 폴더 구조 준수, 원본(`raw_*`) 및 런타임 분리 |
| **Q4** | 3D 카툰 비주얼 | 무테두리, 무그림자, 크로마키 알파 투명화 Stylized 3D 적용 |
| **Q5** | 캐릭터 모션 | 3인 주인공 × 6개 필수 모션 WebP 12x8 스프라이트 시트 연동 완료 |
| **Q6** | 타겟 비행 시스템 | 원반, 부메랑, UFO 3D 포물선/곡선 궤적 렌더링 검증 |
| **Q7** | 배경 3층 구조 | Stage 1~5 원경, 바닥 타일, 소품 시트 분리 및 Stage 5 UV 종스크롤 작동 |
| **Q8** | FFmpeg 파이프라인 | `extract_motion_ffmpeg.sh` 및 `asset_pipeline.py` 자동화 검증 |
| **Q9** | 절대 코딩 원칙 | 소스 코드, 변수명, 키, 주석 100% 영어 (English Only) 준수 |
| **Q10**| 로그인 4종 | 게스트(100일 TTL), Google, 이메일, 전화 가상 이메일 로그인 정상 동작 |
| **Q11**| 에러 모호성 원칙 | 보안을 위해 로그인 실패 시 모호한 에러 메시지 제공 준수 |
| **Q12**| 마이페이지 | 별명, 플레이 횟수, 최고 점수, 비밀번호 변경, 게스트 안내 정상 동작 |
| **Q13**| 로그아웃/탈퇴 | 로그아웃 확인 모달 및 2단계 회원 탈퇴 Firestore 삭제 처리 |
| **Q14**| DB 동기화 | Firestore `users` 컬렉션 보안 규칙 필드 화이트리스트 검증 |
| **Q15**| 3초 엔딩 연출 | 클리어 환호 / 실패 시무룩 3초 보장 연출 동작 |
| **Q16**| 5개 스테이지 | Stage 1~5 순차 진행 및 스코어/해금 동기화 |
| **Q17**| 관리자 Pause/Go | `F8` 키 입력 시 즉시 물리 정지 및 리드샷 탄도 오버레이 표시 |
| **Q18**| 30분 무입력 | 30분 이상 터치/키보드 무입력 시 자동 안전 로그아웃 |
| **Q19**| 0~10 좌표계 UX | 3.2 위치 부채꼴 패드 & 6.8 위치 1.5배 가로폭 화살표 정밀 동작 |
| **Q20**| Zero-Occlusion | 1.0초 유지 후 0.4초 간 양 사이드 상단 축소 소멸 프로토콜 검증 |
| **Q21**| 리드 샷 수학 공식 | 투영 벡터 기반 명중 판정 및 30조각 3D 파편 연출 검증 |
| **Q22**| 다국어 (i18n) | ko, en, ja 3개 국어 완전 지원 및 언어 순환 버튼 검증 |
| **Q23**| PWA & 아이콘 | Manifest, maskable 아이콘, favicon 및 반응형 UX 적용 |
| **Q24**| 최종 배포 | Firebase Hosting & Vercel 배포 URL 정상 작동 확인 |

--------------------------------------------------------------------------------
**문서 승인 (Sign-off)**
* **상태** : 승인 (APPROVED AS UNIVERSAL MASTER SPECIFICATION v1.7 FOR CLAYPOP V2)
* **적용 버전** : Form_1_7 — Three.js + Phaser 3 웹 하이브리드, 0~10 정밀 좌표계, 리드 샷 수학 판정, Zero-Occlusion UX, Google Flow + FFmpeg 모션 자동화 표준 수립
