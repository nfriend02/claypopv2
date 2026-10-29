# Claypop v2 — Google Flow 컷신 프롬프트 (스타팅 15 + 엔딩 30)

* **스타팅 씬(Opening)**: 게임 시작 클릭 → 선택한 주인공이 스테이지에 어울리게 등장 → 하늘을 향해 총을 겨누는 4초 영상
* **엔딩 씬(Ending)**: 스테이지 종료 → 클리어 성공(Clear) / 실패(Fail) 4초 영상 → 스코어보드 화면

---

## 0. 생성 규칙 (모든 프롬프트 공통)

### 0.1 Flow 설정
| 항목 | 값 |
| --- | --- |
| 모드 | **Ingredients to Video** (권장) — 캐릭터 기준 이미지 + 스테이지 배경 이미지를 재료로 추가 |
| 길이 / 비율 | **4초**, **16:9 가로** (1280×720 이상), 24fps |
| 오디오 | 없어도 됨 (게임 BGM/효과음이 따로 재생됨) |

### 0.2 재료(Ingredients) 이미지
| 재료 | 파일 |
| --- | --- |
| Billy (young_cowboy) | `raw_generated/young_cowboy.png` |
| Daisy (young_cowgirl) | `raw_generated/young_cowgirl.png` |
| Sheriff Buck (middle_cowboy) | `raw_generated/middle_cowboy.png` |
| Stage 1 배경 | `public/assets/stages/stage01_sky.png` |
| Stage 2 배경 | `public/assets/stages/stage02_sky.png` |
| Stage 3 배경 | `public/assets/stages/stage03_sky.png` |
| Stage 4 배경 | `public/assets/stages/stage04_sky.png` |
| Stage 5 배경 | `public/assets/stages/stage05_sky.png` |

### 0.3 연출 원칙
1. **세로(모바일) 화면 대응**: 주인공은 항상 **화면 가운데 1/3 영역** 안에 둡니다. 세로 화면에서는 가운데를 잘라 보여주기 때문입니다.
2. **글자 금지**: 전광판·간판에 읽을 수 있는 글자를 넣지 않습니다. 스코어/등급은 게임 UI가 그 위에 그립니다.
3. **스타팅 씬의 마지막 1초**: 카메라가 주인공 **뒤쪽(뒷통수와 등이 보이는 시점)**으로 돌아가고, 주인공이 샷건을 **왼쪽 위 하늘**로 겨눈 채 정지합니다. 실제 게임 첫 화면의 자세와 이어지게 하기 위함입니다.
4. **엔딩 씬의 마지막 0.5초**: 동작이 멈춘 정지 화면으로 끝냅니다. 스코어보드가 그 위로 부드럽게 겹쳐 나타납니다.
5. **실패 씬의 톤**: 어둡거나 폭력적이지 않게, **귀엽게 시무룩한 코믹 톤**(픽사 단편 느낌)으로 만듭니다.

### 0.4 공통 스타일 문구 (각 프롬프트 끝에 이미 포함되어 있음)
```text
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### 0.5 공통 네거티브 프롬프트 (Flow의 "피해야 할 요소"에 입력)
```text
text, letters, numbers, subtitles, logos, watermark, readable signs, extra limbs, deformed hands, duplicate main character, character design change, different outfit, modern clothing, cell phones, realistic photo, gore, blood, injury, dark horror mood, camera shake blur, jump cuts, scene cuts
```

### 0.6 캐릭터 고정 묘사 (프롬프트마다 그대로 사용됨)
* **Billy**: `Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun`
* **Daisy**: `Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun`
* **Sheriff Buck**: `Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun`

---

## 1. 폴더 구조 & 파일명

생성한 MP4를 아래 이름 그대로 저장해 주세요. Flow 워터마크는 나중에 파이프라인에서 처리합니다.

```text
raw_videos/cutscenes/
├── opening/
│   ├── stage01/  young_cowboy.mp4   young_cowgirl.mp4   middle_cowboy.mp4
│   ├── stage02/  (동일 3개)
│   ├── stage03/  (동일 3개)
│   ├── stage04/  (동일 3개)
│   └── stage05/  (동일 3개)
└── ending/
    ├── stage01/  young_cowboy_clear.mp4  young_cowboy_fail.mp4
    │             young_cowgirl_clear.mp4 young_cowgirl_fail.mp4
    │             middle_cowboy_clear.mp4 middle_cowboy_fail.mp4
    ├── stage02/  (동일 6개)
    ├── stage03/  (동일 6개)
    ├── stage04/  (동일 6개)
    └── stage05/  (동일 6개)
```

---

## 2. 스테이지 컨셉 요약

| Stage | 컨셉 | 바이브 | 핵심 소품 |
| --- | --- | --- | --- |
| 1 텍사스 서부 초원 | 따사로운 오후 햇살의 농장 사격장 | 포근함, 입문, 목가적 | 빨간 헛간, 건초더미, 나무 울타리, 풍차, 붉은 메사 |
| 2 올림픽 슈팅장 | 국제 대회 트랩 사격 경기장 | 긴장감, 환호, 스포츠 중계 | 관중석, 만국기, 레트로 대형 전광판, 트랩 하우스 |
| 3 한밤의 불꽃놀이 | 밤의 사막 초원 + 축제 불꽃 | 마법 같은, 화려한 축제 | 불꽃놀이, 별자리, 풍차 실루엣, 선인장, 붉은 뷰트 |
| 4 카리브해 모래 해변 | 에메랄드 바다와 하얀 모래 | 상쾌함, 장난스러움, 파도 주의 | 밀려오는 파도, 야자수 절벽, 갈매기, 게 |
| 5 질주하는 지프 트럭 | 노을 속 비포장도로 질주 | 스피드, 액션, 영화 같은 클라이맥스 | 민트색 1960년대 오픈 지프 트럭(나무 짐칸), 흙먼지, 붉은 캐니언 |

---

# PART A. 스타팅 씬 (Opening) — 15개

> 공통 마무리: 마지막 1초는 **뒤에서 본 시점**(뒷통수와 등이 보임)으로, 샷건을 **왼쪽 위 하늘**로 겨눈 채 정지합니다.

## Stage 1 — 텍사스 서부 초원

### A-1-1 · Billy → `opening/stage01/young_cowboy.mp4`
> 울타리를 훌쩍 뛰어넘어 착지하고 샷건을 한 바퀴 돌린 뒤 하늘을 겨눔
```text
4-second opening cutscene. A sunny warm afternoon on a 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden rail fences, a spinning windmill, red rock mesas on the horizon, golden grass swaying.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, runs in from the right and vaults over a wooden fence in a heroic leap, lands in the center with a puff of dust, flashes a confident grin and twirls the shotgun once.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his hat and his back as he shoulders the shotgun and aims up-left into the bright blue sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-1-2 · Daisy → `opening/stage01/young_cowgirl.mp4`
> 헛간 다락에서 밧줄을 타고 날아 내려와 착지
```text
4-second opening cutscene. A sunny warm afternoon on a 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden rail fences, a spinning windmill, red rock mesas on the horizon.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, swings down on a rope from the open hayloft of the red barn, lets go and lands nimbly in the center with her braids bouncing, gives a playful wink, and catches her falling hat on her head.
In the final second the camera swings smoothly behind her to an over-the-shoulder back view: we see the back of her hat, her braids and her back as she raises the shotgun and aims up-left into the bright blue sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-1-3 · Sheriff Buck → `opening/stage01/middle_cowboy.mp4`
> 헛간 문이 활짝 열리고 황금빛 먼지 속을 천천히 걸어 나옴
```text
4-second opening cutscene. A warm golden afternoon on a 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden rail fences, a windmill, red rock mesas on the horizon.
The big red barn doors swing open and Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, strides out in slow motion through glowing golden dust, his duster coat flowing, a tumbleweed rolling past. He stops in the center, twirls one end of his mustache and gives a cool half smile.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his black hat and his long coat as he shoulders the shotgun and aims up-left into the sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 2 — 올림픽 슈팅장

### A-2-1 · Billy → `opening/stage02/young_cowboy.mp4`
> 선수 입장 터널에서 뛰어나와 관중에게 손을 흔듦
```text
4-second opening cutscene. A bright Olympic clay trap shooting stadium on a clear blue day: rolling green turf, small brick trap houses, colorful spectator stands full of cheering fans, rows of international flags, a giant retro 1960s scoreboard with blinking lights and no readable text, camera flashes popping in the crowd.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, jogs out of the athletes' tunnel onto the shooting station, waving his hat to the roaring crowd with a huge excited grin, then puts the hat back on with a snap.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his hat and his back as he shoulders the shotgun and aims up-left into the sky, the crowd going quiet, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-2-2 · Daisy → `opening/stage02/young_cowgirl.mp4`
> 옆돌기로 사대에 등장, 카메라 플래시 세례
```text
4-second opening cutscene. A bright Olympic clay trap shooting stadium on a clear blue day: rolling green turf, small brick trap houses, colorful spectator stands full of cheering fans, rows of international flags, a giant retro 1960s scoreboard with blinking lights and no readable text.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, cartwheels onto the shooting station holding her shotgun safely, lands with arms wide like a gymnast while a storm of camera flashes pops from the stands, and blows a confident kiss to the crowd.
In the final second the camera swings smoothly behind her to an over-the-shoulder back view: we see the back of her hat, her braids and her back as she raises the shotgun and aims up-left into the sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-2-3 · Sheriff Buck → `opening/stage02/middle_cowboy.mp4`
> 침착하게 걸어 들어오자 관중석이 숨죽이고, 전광판이 반짝임
```text
4-second opening cutscene. A bright Olympic clay trap shooting stadium on a clear blue day: rolling green turf, small brick trap houses, packed colorful spectator stands, rows of international flags, a giant retro 1960s scoreboard with blinking lights and no readable text.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, walks calmly onto the shooting station like a seasoned champion; the whole crowd falls into an awed hush, he tips his hat to the judges with a dignified nod and the scoreboard lights flash gold.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his black hat and his long coat as he shoulders the shotgun and aims up-left into the sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 3 — 한밤의 불꽃놀이

### A-3-1 · Billy → `opening/stage03/young_cowboy.mp4`
> 거대한 불꽃이 터지는 순간 역광 실루엣으로 등장
```text
4-second opening cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky with glowing constellations, red rock buttes, old windmill silhouettes, cacti, colorful fireworks blooming in red, gold and cyan.
The scene starts dark; a giant golden firework bursts and reveals Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, as a heroic backlit silhouette in the center; colored light washes over him as he grins and spins the shotgun.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his hat and his back, rim-lit by fireworks, as he shoulders the shotgun and aims up-left into the glittering night sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-3-2 · Daisy → `opening/stage03/young_cowgirl.mp4`
> 스파클러로 하늘에 별을 그리고 던지자 불꽃이 연달아 터짐
```text
4-second opening cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky with glowing constellations, red rock buttes, old windmill silhouettes, cacti, colorful fireworks.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, skips into the center waving a sparkler, draws a glowing star in the air with it, then tosses it up; a chain of pink and cyan fireworks bursts above her as she laughs, her braids glowing in the colorful light.
In the final second the camera swings smoothly behind her to an over-the-shoulder back view: we see the back of her hat, her braids and her back as she raises the shotgun and aims up-left into the sparkling night sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-3-3 · Sheriff Buck → `opening/stage03/middle_cowboy.mp4`
> 부츠에 성냥을 그어 도화선에 불을 붙이자 뒤에서 불꽃이 일제히 발사
```text
4-second opening cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, old windmill silhouettes, cacti.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center, strikes a match on his boot heel and lights a long fuse on the ground; the spark races away and a whole row of fireworks rockets launches behind him and blooms into a huge golden crown of light, he does not even look back, just smirks under his mustache.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view: we see the back of his black hat and his long coat, rim-lit in gold, as he shoulders the shotgun and aims up-left into the night sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 4 — 카리브해 모래 해변

### A-4-1 · Billy → `opening/stage04/young_cowboy.mp4`
> 서핑보드를 타고 파도를 넘어 해변으로 뛰어내림
```text
4-second opening cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, gentle rolling waves with white foam, seagulls, fluffy cream clouds.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, rides a wave on a wooden surfboard with the shotgun held up high to keep it dry, hops off onto the wet sand in the center with a splash and a cocky grin, shaking water off his boot.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view with the turquoise sea in front: we see the back of his hat and his back as he shoulders the shotgun and aims up-left into the sunny sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-4-2 · Daisy → `opening/stage04/young_cowgirl.mp4`
> 물보라를 튀기며 해변을 달려와 파도를 피해 점프
```text
4-second opening cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, waves rolling onto the shore with white foam, seagulls.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, sprints along the shoreline kicking up sparkling splashes, a wave rushes toward her boots and she nimbly leaps over it with a playful laugh, landing in the center on dry sand with a little victory pose.
In the final second the camera swings smoothly behind her to an over-the-shoulder back view with the turquoise sea in front: we see the back of her hat, her braids and her back as she raises the shotgun and aims up-left into the sunny sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-4-3 · Sheriff Buck → `opening/stage04/middle_cowboy.mp4`
> 작은 나무 보트에서 내려 부츠를 적시고 모자의 물을 털어냄
```text
4-second opening cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, gentle waves with white foam, a curious seagull on a rock.
A small wooden rowboat glides onto the shore and Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, steps off into ankle-deep water with a dignified splash, walks up to the center of the beach, takes off his hat, flicks the water off it and puts it back on with a cool nod to the seagull.
In the final second the camera swings smoothly behind him to an over-the-shoulder back view with the turquoise sea in front: we see the back of his black hat and his long coat as he shoulders the shotgun and aims up-left into the sunny sky, holding perfectly still.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 5 — 질주하는 지프 트럭

### A-5-1 · Billy → `opening/stage05/young_cowboy.mp4`
> 달리는 지프 트럭 짐칸으로 길가에서 뛰어오름
```text
4-second opening cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, a mint green 1960s open-top jeep truck with a wooden cargo bed speeding toward the vanishing point, a trail of golden dust behind it.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, sprints alongside the speeding truck and leaps up into the wooden cargo bed, holding onto his hat with one hand, landing in a wide stance with a thrilled grin as the wind whips his bandana.
In the final second the camera settles behind him inside the truck bed in an over-the-shoulder back view, the road rushing forward ahead: we see the back of his hat and his back as he shoulders the shotgun and aims up-left into the sunset sky, holding steady while the truck rumbles.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-5-2 · Daisy → `opening/stage05/young_cowgirl.mp4`
> 운전석 창문에서 짐칸으로 재빠르게 넘어감
```text
4-second opening cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, a mint green 1960s open-top jeep truck with a wooden cargo bed speeding along, golden dust trailing behind.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, climbs out of the passenger window of the moving truck, swings over the cab roof like an acrobat and drops into the cargo bed, her braids flying in the wind, and slaps the cab roof with a fearless laugh as if to say "faster!".
In the final second the camera settles behind her inside the truck bed in an over-the-shoulder back view, the road rushing forward ahead: we see the back of her hat, her braids and her back as she raises the shotgun and aims up-left into the sunset sky, holding steady while the truck rumbles.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### A-5-3 · Sheriff Buck → `opening/stage05/middle_cowboy.mp4`
> 트럭이 드리프트하며 들어오고, 이미 짐칸에 선 채 코트를 휘날림
```text
4-second opening cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, cacti and boulders along the roadside.
A mint green 1960s open-top jeep truck with a wooden cargo bed drifts sideways into frame in a huge cloud of golden dust; standing tall and perfectly balanced in the cargo bed is Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, his duster coat flapping heroically in the wind; he racks the shotgun with one hand, unbothered.
In the final second the camera settles behind him inside the truck bed in an over-the-shoulder back view as the truck straightens and races toward the vanishing point: we see the back of his black hat and his flapping coat as he shoulders the shotgun and aims up-left into the sunset sky, holding steady while the truck rumbles.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

---

# PART B. 엔딩 씬 (Ending) — 30개

> 공통 마무리: 마지막 0.5초는 동작이 멈춘 정지 화면입니다(스코어보드가 그 위로 나타남). 클리어는 **환호·축제**, 실패는 **귀엽게 시무룩한 코미디** 톤입니다.

## Stage 1 — 텍사스 서부 초원

### B-1-1 · Billy · 클리어 → `ending/stage01/young_cowboy_clear.mp4`
> 모자를 하늘로 던지며 점프, 클레이 조각이 색종이처럼 쏟아짐
```text
4-second victory ending cutscene. A sunny warm afternoon on a 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden fences, spinning windmill, red rock mesas.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, faces the camera in the center, lets out a huge joyful whoop and tosses his hat high into the sky, jumping with both fists raised while bright orange clay shards rain down around him like confetti and farm chickens flap excitedly at his feet. He catches his hat on his head.
For the last half second he freezes in a proud pose: shotgun resting on his shoulder, big grin, thumbs up. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-1-2 · Billy · 실패 → `ending/stage01/young_cowboy_fail.mp4`
> 모자가 눈까지 흘러내리고 회전초가 지나가며 까마귀가 총열에 앉음
```text
4-second gentle comic failure ending cutscene. A quiet 1960s Texas prairie farm shooting range in warm late-afternoon light: red barn, hay bales, wooden fences, windmill creaking slowly.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, stands in the center with slumped shoulders and a big pouty lower lip; his hat slowly slides down over his eyes, a tumbleweed rolls lazily past him, and a crow lands on the tip of his lowered shotgun barrel and caws at him.
For the last half second he freezes: lifting the hat brim with one finger, giving the camera a sheepish embarrassed smile. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-1-3 · Daisy · 클리어 → `ending/stage01/young_cowgirl_clear.mp4`
> 건초더미 위로 뛰어올라 올가미를 돌리며 환호
```text
4-second victory ending cutscene. A sunny warm afternoon on a 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden fences, spinning windmill, red rock mesas.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, hops up onto a round hay bale in the center, twirls a lasso above her head with one hand and raises the shotgun with the other, cheering loudly as her braids swing and golden hay sparkles fly around her in the sunlight.
For the last half second she freezes in a triumphant pose on the hay bale: lasso loop in the air, a wink and a big smile at the camera. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-1-4 · Daisy · 실패 → `ending/stage01/young_cowgirl_fail.mp4`
> 흙을 툭 차며 뾰로통, 건초 한 줌이 머리 위로 떨어짐
```text
4-second gentle comic failure ending cutscene. A quiet 1960s Texas prairie farm shooting range in warm late-afternoon light: red barn, hay bales, wooden fences, windmill.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, stands in the center pouting with puffed cheeks, crosses her arms and kicks a little cloud of dirt; her braids droop, and a clump of hay falls from the barn loft right onto her hat, she blows a straw off her nose with a huff.
For the last half second she freezes: a grumpy-cute pout, one eyebrow raised, hay sticking out of her hat. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-1-5 · Sheriff Buck · 클리어 → `ending/stage01/middle_cowboy_clear.mp4`
> 총구의 연기를 후 불고 보안관 배지를 반짝이게 닦음
```text
4-second victory ending cutscene. A glowing golden-hour 1960s Texas prairie farm shooting range: red barn, round hay bales, wooden fences, windmill, red rock mesas, warm sun flare.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center, coolly blows the smoke from the shotgun barrel, rests it on his shoulder, then polishes his gold star badge with his sleeve until it gleams with a sparkling lens flare; a horse in the background neighs approvingly.
For the last half second he freezes: a confident smirk under the mustache, two fingers touching his hat brim in a salute. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-1-6 · Sheriff Buck · 실패 → `ending/stage01/middle_cowboy_fail.mp4`
> 한숨에 콧수염이 축 처지고, 멀쩡한 클레이 원반이 모자 위에 톡 떨어짐
```text
4-second gentle comic failure ending cutscene. A quiet 1960s Texas prairie farm shooting range in warm late-afternoon light: red barn, hay bales, wooden fences, windmill.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center and lets out a long deep sigh that makes his mustache droop comically; an unbroken orange clay disc falls slowly from the sky and lands with a soft bonk flat on top of his hat. He rolls his eyes upward to look at it.
For the last half second he freezes: deadpan unimpressed face, the clay disc balanced on his hat. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 2 — 올림픽 슈팅장

### B-2-1 · Billy · 클리어 → `ending/stage02/young_cowboy_clear.mp4`
> 시상대 맨 위에서 금메달을 깨물고 만국기와 꽃가루
```text
4-second victory ending cutscene. A bright Olympic clay trap shooting stadium: green turf, colorful packed stands roaring, international flags waving, giant retro scoreboard flashing gold lights with no readable text, golden confetti falling.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, stands on the top step of the winner's podium in the center, a shiny gold medal around his neck; he bites the medal like a champion, then raises the shotgun high as fireworks of camera flashes pop from the crowd.
For the last half second he freezes: gold medal held up to the camera, huge proud grin, confetti hanging in the air. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-2-2 · Billy · 실패 → `ending/stage02/young_cowboy_fail.mp4`
> 벤치에 앉아 수건을 머리에 뒤집어쓰고, 관중석의 탄식
```text
4-second gentle comic failure ending cutscene. An Olympic clay trap shooting stadium in soft afternoon light: green turf, spectator stands with fans groaning sympathetically, flags drooping in no wind, the retro scoreboard lights dimming with no readable text.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, sits on the athletes' bench in the center with a white towel draped over his head, slumped like a sad boxer; a single fan in the stands gives a sympathetic tiny wave.
For the last half second he freezes: peeking out from under the towel with puppy-dog eyes and a wobbly brave smile. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-2-3 · Daisy · 클리어 → `ending/stage02/young_cowgirl_clear.mp4`
> 금메달을 걸고 시상대 위에서 공중제비, 관중 기립박수
```text
4-second victory ending cutscene. A bright Olympic clay trap shooting stadium: green turf, colorful stands with the crowd on its feet in a standing ovation, international flags waving, giant retro scoreboard flashing rainbow lights with no readable text, streamers and golden confetti.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, stands on the top step of the winner's podium in the center wearing a gold medal, does a joyful backflip and lands back on the podium, then waves both arms to the crowd, braids flying.
For the last half second she freezes: one hand holding up the gold medal, the other making a peace sign, beaming smile. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-2-4 · Daisy · 실패 → `ending/stage02/young_cowgirl_fail.mp4`
> 발을 동동 구르며 분해하다가 은근슬쩍 관중에게 손 흔들기
```text
4-second gentle comic failure ending cutscene. An Olympic clay trap shooting stadium in soft afternoon light: green turf, spectator stands with fans making sympathetic "aww" faces, flags drooping, the retro scoreboard lights dimming with no readable text.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, stands on the shooting station in the center and stomps both boots in a cute frustrated tantrum, cheeks puffed, braids bouncing; then she notices the crowd watching, straightens up and gives a small awkward wave.
For the last half second she freezes: embarrassed blushing smile, half wave, the other hand hiding her face. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-2-5 · Sheriff Buck · 클리어 → `ending/stage02/middle_cowboy_clear.mp4`
> 금메달을 받고 정중한 경례, 콧수염을 씰룩이며 미소
```text
4-second victory ending cutscene. A bright Olympic clay trap shooting stadium: green turf, colorful stands roaring, international flags waving, giant retro scoreboard flashing gold lights with no readable text, golden confetti drifting down.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands tall on the top step of the winner's podium in the center as a gold medal is placed around his neck; he gives a crisp dignified salute, then his mustache twitches into a proud smile and he raises the shotgun high.
For the last half second he freezes: gold medal and star badge both gleaming, hat tipped, cool champion grin. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-2-6 · Sheriff Buck · 실패 → `ending/stage02/middle_cowboy_fail.mp4`
> 고개를 저으며 총을 닦는데, 비둘기가 모자 위에 앉음
```text
4-second gentle comic failure ending cutscene. An Olympic clay trap shooting stadium in soft afternoon light: green turf, mostly quiet stands, flags drooping, the retro scoreboard lights dimming with no readable text.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center slowly shaking his head and wiping his shotgun barrel with a handkerchief as if blaming the gun; a white pigeon flutters down and settles on the brim of his hat, cooing.
For the last half second he freezes: deadpan side-eye up at the pigeon, mustache drooping. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 3 — 한밤의 불꽃놀이

### B-3-1 · Billy · 클리어 → `ending/stage03/young_cowboy_clear.mp4`
> 피날레 불꽃이 거대한 황금 별 모양으로 터지고 신나게 춤춤
```text
4-second victory ending cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, windmill silhouettes, cacti, a grand fireworks finale filling the sky.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, faces the camera in the center doing a goofy happy cowboy dance, kicking his heels, as behind him the fireworks burst into a giant golden sheriff star shape and showers of red and cyan sparks light up his face.
For the last half second he freezes: arms spread wide, shotgun raised, golden star glowing behind him, huge grin. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-3-2 · Billy · 실패 → `ending/stage03/young_cowboy_fail.mp4`
> 불발 폭죽이 "퓨슉" 하고 얼굴에 그을음, 머리카락이 살짝 곤두섬
```text
4-second gentle comic failure ending cutscene. A calm midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, windmill silhouettes, cacti, a few last weak fireworks.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, stands in the center looking up hopefully as one last firework rocket rises, sputters and fizzles into a tiny sad puff right in front of him, leaving a cartoon soot smudge on his face and his hair sticking up from under his hat. He blinks.
For the last half second he freezes: sooty face, blinking white eyes, a tiny cough of smoke, sheepish smile. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-3-3 · Daisy · 클리어 → `ending/stage03/young_cowgirl_clear.mp4`
> 스파클러를 들고 빙글빙글 돌자 하늘에 하트 불꽃이 연속으로 터짐
```text
4-second victory ending cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky with glowing constellations, red rock buttes, windmill silhouettes, cacti, a dazzling fireworks finale.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, spins happily in the center with a bright sparkler in her hand, leaving swirling ribbons of light, as pink and gold heart-shaped fireworks burst one after another above her and glittering sparks rain down.
For the last half second she freezes: mid-twirl, sparkler raised high, braids flying, delighted laughing face lit in pink and gold. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-3-4 · Daisy · 실패 → `ending/stage03/young_cowgirl_fail.mp4`
> 스파클러가 툭 꺼지고 바위에 앉아 턱을 괴고 한숨
```text
4-second gentle comic failure ending cutscene. A calm midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, windmill silhouettes, cacti, the fireworks show ending with drifting smoke.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, holds up a sparkler that suddenly fizzles out with a tiny pop; she slumps down onto a rock in the center, rests her chin in her hands and sighs, her braids drooping, while a single shooting star streaks across the sky above her.
For the last half second she freezes: chin in hands, glancing up at the shooting star with a small hopeful smile. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-3-5 · Sheriff Buck · 클리어 → `ending/stage03/middle_cowboy_clear.mp4`
> 뒤돌아보지도 않고 모자를 들자 하늘 가득 황금 왕관 불꽃이 터짐
```text
4-second victory ending cutscene. A magical midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, windmill silhouettes, cacti.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center facing the camera, calmly lifts his hat off his head without looking back, and exactly at that moment a massive golden fireworks finale explodes behind him like a crown of light, sparks reflecting off his star badge and shotgun.
For the last half second he freezes: hat raised high, cool satisfied smirk under the mustache, golden glow behind him. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-3-6 · Sheriff Buck · 실패 → `ending/stage03/middle_cowboy_fail.mp4`
> 나무상자에 앉아 이마를 짚고, 마지막 불발 폭죽이 비틀비틀 날아감
```text
4-second gentle comic failure ending cutscene. A calm midnight over the Texas desert prairie: starry deep-blue sky, red rock buttes, windmill silhouettes, cacti, drifting firework smoke.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, sits on a wooden crate in the center with the shotgun across his knees and does a slow facepalm; behind him the very last firework rocket wobbles drunkenly into the sky and pops into a tiny lonely spark.
For the last half second he freezes: peeking between his fingers with a tired half-smile, mustache drooping. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 4 — 카리브해 모래 해변

### B-4-1 · Billy · 클리어 → `ending/stage04/young_cowboy_clear.mp4`
> 파도가 등 뒤에서 무지개 물보라를 만들고 서핑보드를 번쩍 들어 환호
```text
4-second victory ending cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, seagulls circling, fluffy cream clouds.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, stands on the sand in the center and cheers with both arms up; a big wave crashes behind him and its spray forms a sparkling rainbow, he jams a wooden surfboard into the sand beside him and leans on it like a champion.
For the last half second he freezes: shotgun on his shoulder, surfboard beside him, rainbow spray behind, thumbs up and huge grin. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-4-2 · Billy · 실패 → `ending/stage04/young_cowboy_fail.mp4`
> 파도에 흠뻑 젖고 게가 부츠를 집게로 꼬집음
```text
4-second gentle comic failure ending cutscene. A Caribbean beach in soft afternoon light: turquoise water, white sand, palm cliffs, gentle waves.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, stands in the center when a wave splashes over him from behind and soaks him completely, water dripping from his hat brim; then a little red crab scuttles up and pinches the toe of his boot, and he hops on one foot.
For the last half second he freezes: soaking wet, a tiny fish flopping out of his hat, wincing sheepish smile. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-4-3 · Daisy · 클리어 → `ending/stage04/young_cowgirl_clear.mp4`
> 파도를 피해 깡충깡충 뛰며 물보라 속에서 코코넛 음료로 건배
```text
4-second victory ending cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, seagulls, sparkling sunlight on the waves.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, dances happily along the shoreline in the center, playfully hopping over the incoming waves, then pulls out a coconut drink with a tiny umbrella and raises it in a toast as sparkling sea spray glitters around her.
For the last half second she freezes: coconut raised in a cheers, shotgun on her shoulder, braids flying, bright laughing smile. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-4-4 · Daisy · 실패 → `ending/stage04/young_cowgirl_fail.mp4`
> 모자가 파도에 실려 둥둥 떠내려가고, 손을 뻗어보지만 놓침
```text
4-second gentle comic failure ending cutscene. A Caribbean beach in soft afternoon light: turquoise water, white sand, palm cliffs, gentle waves.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, stands at the water's edge in the center when a sea breeze knocks off her white hat; a wave carries it away, floating like a little boat, she reaches out with both hands but it bobs just out of reach, and a seagull lands on it.
For the last half second she freezes: arms still reaching out, mouth open in a cute "nooo" pout, braids blowing in the wind. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-4-5 · Sheriff Buck · 클리어 → `ending/stage04/middle_cowboy_clear.mp4`
> 엄숙하던 보안관이 의외로 신나게 훌라 스텝, 거대한 파도가 축포처럼 솟음
```text
4-second victory ending cutscene. A sunny Caribbean beach: crystal turquoise water, bright white sand, palm-covered rocky cliffs, seagulls circling.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center and surprisingly breaks into a funny little hula shuffle, coat swaying, while a giant wave behind him shoots up like a celebratory fountain and a flower lei lands around his neck from nowhere.
For the last half second he freezes: hula pose with the shotgun raised, flower lei on, proud mustache grin. Slow gentle push-in camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-4-6 · Sheriff Buck · 실패 → `ending/stage04/middle_cowboy_fail.mp4`
> 코트가 흠뻑 젖어 축 늘어지고, 갈매기가 모자를 물고 날아감
```text
4-second gentle comic failure ending cutscene. A Caribbean beach in soft afternoon light: turquoise water, white sand, palm cliffs, gentle waves, seagulls.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands in the center completely drenched by a wave, his long coat dripping and sagging heavily; a cheeky seagull swoops down, snatches his black hat in its beak and flies off, leaving his messy hair exposed.
For the last half second he freezes: dripping wet, deadpan stare after the seagull, mustache drooping with water. Cute, harmless, Pixar short film comedy tone. Static camera.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

## Stage 5 — 질주하는 지프 트럭

### B-5-1 · Billy · 클리어 → `ending/stage05/young_cowboy_clear.mp4`
> 달리는 트럭 운전석 지붕 위에 올라 두 팔을 번쩍, 노을 속으로 질주
```text
4-second victory ending cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, golden dust trailing behind a speeding mint green 1960s open-top jeep truck with a wooden cargo bed.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, climbs up onto the cab roof of the speeding truck in the center of the frame and throws both arms up in a triumphant cheer, his bandana and hat strings whipping in the wind, the huge setting sun right behind him.
For the last half second he freezes: silhouetted against the giant sun, shotgun raised high, big grin. Camera tracks alongside the truck.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-5-2 · Billy · 실패 → `ending/stage05/young_cowboy_fail.mp4`
> 트럭이 덜컹하는 순간 균형을 잃고 짐칸에 엉덩방아
```text
4-second gentle comic failure ending cutscene. A dusky sunset over Texas red rock canyons: orange-purple sky, a bumpy dirt ranch road, a mint green 1960s open-top jeep truck with a wooden cargo bed slowing down.
Billy, a cheerful handsome young 1960s cowboy with a tan Stetson hat, red bandana, red plaid shirt, blue denim vest, brown leather chaps and boots, holding a vintage double-barrel shotgun, is standing in the cargo bed in the center when the truck hits a big bump; he wobbles with windmilling arms and lands on his bottom with a comic thud, his hat bouncing up and landing back on his head crooked.
For the last half second he freezes: sitting in the truck bed, hat askew, dizzy cartoon stars circling, sheepish smile. Cute, harmless, Pixar short film comedy tone.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-5-3 · Daisy · 클리어 → `ending/stage05/young_cowgirl_clear.mp4`
> 짐칸 위에서 모자를 흔들며 환호, 트럭이 언덕을 점프
```text
4-second victory ending cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, a mint green 1960s open-top jeep truck with a wooden cargo bed racing along with a huge golden dust trail.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, stands in the cargo bed in the center waving her white hat in circles and whooping as the truck launches off a small dirt ramp and soars through the air, her braids flying straight up, then lands with a bouncy thump.
For the last half second she freezes: mid-air with the truck, hat waving, shotgun raised, ecstatic smile, sunset behind. Camera tracks alongside the truck.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-5-4 · Daisy · 실패 → `ending/stage05/young_cowgirl_fail.mp4`
> 바람에 날아간 모자를 쫓다가 트럭이 퍼져서 멈춤
```text
4-second gentle comic failure ending cutscene. A dusky sunset over Texas red rock canyons: orange-purple sky, a dirt ranch road, cacti along the roadside.
Daisy, an energetic young 1960s cowgirl with two long braided ginger pigtails, a white cowboy hat, fringed tan suede vest, blue jeans and boots, holding a vintage shotgun, rides in the cargo bed of a mint green 1960s open-top jeep truck with a wooden cargo bed when the wind blows her hat away; she lunges for it and misses, the hat gets stuck on a cactus, and the truck sputters, coughs a puff of black smoke and rolls to a stop.
For the last half second she freezes: leaning over the side of the stopped truck, staring at her hat on the cactus with a cute exasperated pout. Cute, harmless, Pixar short film comedy tone.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-5-5 · Sheriff Buck · 클리어 → `ending/stage05/middle_cowboy_clear.mp4`
> 트럭 보닛 위에 서서 코트를 휘날리며 영웅처럼 노을 속으로
```text
4-second victory ending cutscene. A dramatic sunset over Texas red rock canyons: glowing orange sky with purple clouds, a long dirt ranch road, a mint green 1960s open-top jeep truck with a wooden cargo bed racing toward the camera with golden dust behind.
Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, stands heroically on the hood of the speeding truck in the center, one boot on the grille, duster coat billowing like a cape, he rests the shotgun on his shoulder and tips his hat as the sun flares behind him.
For the last half second he freezes: legendary hero pose on the hood, coat flying, star badge gleaming, cool smirk. Camera slowly rises in front of the truck.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

### B-5-6 · Sheriff Buck · 실패 → `ending/stage05/middle_cowboy_fail.mp4`
> 트럭이 멈추며 흙먼지 구름을 뒤집어쓰고 콜록콜록
```text
4-second gentle comic failure ending cutscene. A dusky sunset over Texas red rock canyons: orange-purple sky, a dirt ranch road, cacti and boulders.
A mint green 1960s open-top jeep truck with a wooden cargo bed sputters and rolls to a stop in the center; Sheriff Buck, a charismatic middle-aged 1960s sheriff with a thick handlebar mustache, black cowboy hat with silver band, long brown leather duster coat, gold sheriff star badge, holding a heavy custom shotgun, standing in the cargo bed, is engulfed by the big dust cloud that catches up from behind, and coughs, his whole outfit turned dusty beige.
For the last half second he freezes: covered in dust, only his blinking eyes and mustache visible, dust slowly drifting off his hat. Cute, harmless, Pixar short film comedy tone.
3D comic animation style, Pixar and DreamWorks inspired, 1960s American western theme, toon shading, vibrant saturated colors, expressive exaggerated acting, cinematic lighting, 16:9, 24fps, 4 seconds.
```

---

## 3. 생성 후 검수 체크리스트

1. 주인공의 외모·의상이 기준 이미지와 같은가 (모자 색, 머리 모양, 콧수염, 코트, 샷건)
2. 주인공이 화면 가운데 1/3 안에 머물러 세로 화면에서도 잘리지 않는가
3. 화면에 읽을 수 있는 글자나 숫자가 없는가
4. 스타팅 씬: 마지막 1초가 **뒷모습 + 왼쪽 위 하늘 조준**으로 끝나는가
5. 엔딩 씬: 마지막 0.5초가 정지에 가까운 화면으로 끝나는가
6. 실패 씬이 다치거나 무서운 느낌 없이 귀엽게 표현되었는가
7. 파일명과 폴더가 1장의 구조와 정확히 일치하는가
