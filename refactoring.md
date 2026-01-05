## euclide-geometry/problems/002/sketch.js

전체 애니메이션 코드 리팩토링을 위해 euclide-geometry/problems/002/sketch.js 에 대해 테스트를 진행한다.

### 문제점과 해결책
1.  sketch.js 에는 이미 완성된 애니메이션을 유지하기 위해 수많은 displayStatic 함수를 호출하고 있다.
- 문제 기술 단계에 그려진 애니메이션들을 관리하는 클래스(예를 들면 MTriangle)의 정의에 p5 전역변수를 읽는 부분을 추가한다.
이를 이용하여 p.draw 에서 지금이 솔루션 애니메이션 단계임(즉, 이미 문제기술 단계가 지났음)을 브로드케스팅하면 따로 displayStatic 함수를 부를 필요가 없다.

2. lib/animation.js 에는 비슷한 클래스가 중복 정의되고 있다. 예를 들어 MTriangle, MFadingTriangle, MFilledTriangle 등등은 모두 삼각형이다.
- 완성된 코드는 아니지만 animator.js 에 새로 사용할 코드의 윤곽을 적어두었다. 참고하여 리팩토링에 이용하도록
