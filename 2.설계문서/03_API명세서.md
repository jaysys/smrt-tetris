# API명세서

## 1. 공통 규칙
- Base URL: `/v1`
- Content-Type: `application/json`
- 시간 포맷: ISO 8601 UTC
- DB 저장 시간 기준: UTC
- 사용자 표시 시간 기준: KST(UTC+09:00)
- Daily Challenge 기준 시각: KST 00:00:00
- 주간 랭킹 기준: 월요일 KST 00:00:00 시작
- 인증 방식
  - 게스트: `Authorization: Bearer <guest_token>`
  - 운영자: `Authorization: Bearer <admin_jwt>`
- 공통 응답
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

## 2. 오류 코드
| 코드 | 의미 |
|---|---|
| `BAD_REQUEST` | 요청 형식 오류 |
| `UNAUTHORIZED` | 인증 실패 |
| `FORBIDDEN` | 권한 없음 |
| `NOT_FOUND` | 대상 없음 |
| `VALIDATION_FAILED` | 값 검증 실패 |
| `SESSION_EXPIRED` | 게임 세션 만료 |
| `RESULT_FLAGGED` | 결과가 의심 기록으로 플래그됨 |
| `NICKNAME_BLOCKED` | 금칙어 닉네임 |
| `RATE_LIMITED` | 요청 제한 초과 |
| `CONFLICT` | 멱등성 충돌 또는 상태 충돌 |

## 2.1 공통 상태 코드
| HTTP Status | 사용 조건 |
|---|---|
| `200 OK` | 조회, 성공 저장, 멱등 재반환 |
| `201 Created` | 신규 자원 생성 |
| `400 Bad Request` | 필수 필드 누락, 형식 오류 |
| `401 Unauthorized` | 토큰 없음 또는 유효하지 않음 |
| `403 Forbidden` | 운영자 권한 없음 |
| `404 Not Found` | 세션/공유 링크/챌린지 없음 |
| `409 Conflict` | 중복 제출 충돌, 같은 키 다른 payload |
| `422 Unprocessable Entity` | 필드 검증 실패, 금칙어, enum 오류 |
| `429 Too Many Requests` | 요청 제한 초과 |

## 2.2 공통 계약 규칙
- 모든 POST/PUT/PATCH는 `success`, `data`, `error`, `meta` 구조를 유지한다.
- 결과 제출 API는 `Idempotency-Key` 헤더가 필수다.
- 네트워크 재시도 가능 여부는 엔드포인트별 정책을 따른다.

## 2.3 엔드포인트 운영 정책 요약
| Endpoint | 성공 Status | 재시도 | 멱등성 | 비고 |
|---|---|---|---|---|
| `GET /bootstrap` | 200 | 가능 | 불필요 | 읽기 전용 |
| `POST /game-sessions` | 201 | 가능 | 선택 | 타임아웃 시 재시도 허용 |
| `POST /game-sessions/{id}/finish` | 200 | 가능 | 필수 | `Idempotency-Key` 필수 |
| `POST /profiles/nickname` | 200 | 제한적 | 권장 | 중복 변경 방지 필요 |
| `PUT /settings` | 200 | 가능 | 권장 | 마지막 쓰기 우선 |
| `POST /daily-challenge/{id}/claim` | 200 | 가능 | 필수 | 중복 수령 방지 |
| `POST /share-links` | 201 | 가능 | 권장 | 동일 result 재사용 가능 |
| `POST /admin/daily-challenges` | 201 | 제한적 | 권장 | 중복 생성 주의 |
| `POST /admin/fraud-flags/{id}/actions` | 200 | 제한적 | 필수 | 동일 조치 중복 방지 |

## 3. 공개 API
## 3.1 부트스트랩 조회
### `GET /bootstrap`
목적: 첫 진입에 필요한 초기 데이터 조회

성공 Status: `200`
실패 Status: `401`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 제약 | 설명 |
|---|---|---|---|---|---|
| `guestToken` | string | Y | N | 20~512자 | 신규 또는 기존 게스트 토큰 |
| `defaultMode` | string | Y | N | enum | 기본 시작 모드 |
| `dailyChallenge` | object | Y | Y |  | 오늘의 챌린지 |
| `announcements` | array | Y | N | 최대 10건 | 공지 목록 |
| `settings` | object | Y | N |  | 사용자 기본 설정 |
| `featureFlags` | object | Y | N |  | 실험/기능 플래그 |

## 3.2 게임 세션 생성
### `POST /game-sessions`
성공 Status: `201`
실패 Status: `400`, `401`, `422`, `429`
재시도: 가능
멱등성: 선택

요청 필드
| 필드 | 타입 | Required | Nullable | 허용값/제약 |
|---|---|---|---|---|
| `mode` | string | Y | N | `MARATHON`, `SPRINT`, `DAILY_CHALLENGE` |
| `deviceType` | string | Y | N | `mobile`, `desktop`, `tablet` |
| `clientVersion` | string | Y | N | 최대 20자 |
| `viewport.width` | number | Y | N | 320 이상 |
| `viewport.height` | number | Y | N | 568 이상 |

요청 예시
```json
{
  "mode": "MARATHON",
  "deviceType": "mobile",
  "clientVersion": "1.0.0",
  "viewport": { "width": 390, "height": 844 }
}
```

응답 예시
```json
{
  "success": true,
  "data": {
    "sessionId": "gs_01",
    "mode": "MARATHON",
    "seed": "a8f1c2",
    "issuedAt": "2026-03-11T10:00:00Z",
    "configVersion": 12,
    "timeLimitSec": null,
    "rules": {
      "holdEnabled": true,
      "ghostEnabledDefault": true,
      "nextQueueSize": 5
    }
  }
}
```

## 3.3 게임 결과 제출
### `POST /game-sessions/{sessionId}/finish`
성공 Status: `200`
실패 Status: `400`, `401`, `404`, `409`, `422`, `429`
재시도: 가능
멱등성: 필수
필수 헤더: `Idempotency-Key`

요청 필드
| 필드 | 타입 | Required | Nullable | 허용값/제약 | 설명 |
|---|---|---|---|---|---|
| `mode` | string | Y | N | enum | 모드 |
| `score` | number | Y | N | 0 이상 | 최종 점수 |
| `linesCleared` | number | Y | N | 0 이상 | 제거 라인 수 |
| `level` | number | Y | N | 1 이상 | 최종 레벨 |
| `durationMs` | number | Y | N | 1 이상 | 플레이 시간 |
| `resultMetric` | object | Y | N | 모드별 스키마 | 모드별 핵심 기록 |
| `inputSummary` | object | Y | N | 정수값 | 입력 횟수 요약 |
| `checkpointHashes` | string[] | Y | N | 최소 1개 | 검증용 체크포인트 |
| `endedReason` | string | Y | N | `GAME_OVER`, `GOAL_COMPLETE`, `ABANDONED` | 종료 원인 |

요청 예시
```json
{
  "mode": "SPRINT",
  "score": 18400,
  "linesCleared": 40,
  "level": 1,
  "durationMs": 178250,
  "resultMetric": { "timeMs": 178250 },
  "inputSummary": {
    "moveLeft": 50,
    "moveRight": 62,
    "rotate": 44,
    "softDrop": 18,
    "hardDrop": 97,
    "hold": 7
  },
  "checkpointHashes": ["h1","h2","h3"],
  "endedReason": "GOAL_COMPLETE"
}
```

응답 필드
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `validationStatus` | string | Y | N | `ACCEPTED`, `FLAGGED`, `REJECTED` |
| `personalBest` | boolean | Y | N | 개인 최고 기록 여부 |
| `leaderboardUpdated` | boolean | Y | N | 랭킹 반영 여부 |
| `rankSummary` | object | Y | Y | 랭킹 요약 |
| `rewardSummary` | object | Y | Y | 미션/업적 보상 |
| `retryable` | boolean | Y | N | 클라이언트 재시도 가능 여부 |

중복 방지 정책
- 동일 `Idempotency-Key`와 동일 payload는 이전 처리 결과를 그대로 반환한다.
- 동일 `Idempotency-Key`와 다른 payload는 `409 CONFLICT`로 거절한다.
- `sessionId`당 공식 결과 반영은 1회만 허용한다.

## 3.4 랭킹 조회
### `GET /leaderboards?mode=MARATHON&period=daily&limit=50`
성공 Status: `200`
실패 Status: `400`, `401`, `422`, `429`
재시도: 가능
멱등성: 불필요

쿼리 파라미터
| 필드 | 타입 | Required | 허용값 |
|---|---|---|---|
| `mode` | string | Y | `MARATHON`, `SPRINT`, `DAILY_CHALLENGE` |
| `period` | string | Y | `daily`, `weekly`, `all_time` |
| `limit` | number | N | 1~100, 기본 50 |

응답 필드
| 필드 | 타입 | 설명 |
|---|---|---|
| `mode` | string | 모드 |
| `period` | string | `daily`, `weekly`, `all_time` |
| `entries` | array | 랭킹 목록 |
| `myRank` | object/null | 내 순위 |

엔트리 구조
```json
{
  "rank": 1,
  "nickname": "blocker",
  "score": 41000,
  "timeMs": null,
  "achievedAt": "2026-03-11T10:10:00Z",
  "isMine": false
}
```

## 3.5 개인 기록 조회
### `GET /me/stats`
성공 Status: `200`
실패 Status: `401`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 제약 | 설명 |
|---|---|---|---|---|---|
| `personalBests` | array | Y | N | 최대 3건 | 모드별 개인 최고 기록 |
| `playCount` | number | Y | N | 0 이상 | 총 플레이 수 |
| `dailyChallengeCompletionCount` | number | Y | N | 0 이상 | 데일리 완료 횟수 |
| `achievements` | array | Y | N |  | 달성 업적 목록 |
| `recentResults` | array | Y | N | 최대 10건 | 최근 결과 |

배열 항목 구조
- `personalBests[]`: `mode`, `bestScore`, `bestTimeMs`, `updatedAt`
- `achievements[]`: `code`, `title`, `completedAt`, `claimed`
- `recentResults[]`: `resultId`, `mode`, `score`, `timeMs`, `createdAt`, `validationStatus`

## 3.6 닉네임 등록/변경
### `POST /profiles/nickname`
성공 Status: `200`
실패 Status: `400`, `401`, `409`, `422`, `429`
재시도: 제한적
멱등성: 권장

요청 필드
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `nickname` | string | Y | N | 2~12자, 한글/영문/숫자/밑줄 |

요청 예시
```json
{
  "nickname": "lineclearer"
}
```

응답 필드
- `profileId`
- `nickname`
- `status`

## 3.7 설정 조회
### `GET /settings`
성공 Status: `200`
실패 Status: `401`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 허용값/제약 |
|---|---|---|---|---|
| `soundEnabled` | boolean | Y | N |  |
| `vibrationEnabled` | boolean | Y | N |  |
| `effectLevel` | string | Y | N | `low`, `normal`, `high` |
| `ghostPieceEnabled` | boolean | Y | N |  |
| `highContrastMode` | boolean | Y | N |  |
| `themeId` | string | Y | N | 최대 50자 |

## 3.8 설정 저장
### `PUT /settings`
성공 Status: `200`
실패 Status: `400`, `401`, `422`
재시도: 가능
멱등성: 권장

요청 예시
```json
{
  "soundEnabled": true,
  "vibrationEnabled": false,
  "effectLevel": "low",
  "ghostPieceEnabled": true,
  "highContrastMode": false,
  "themeId": "default"
}
```

## 3.9 Daily Challenge 조회
### `GET /daily-challenge`
성공 Status: `200`
실패 Status: `401`, `404`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `challengeId` | string | Y | N | 챌린지 ID |
| `title` | string | Y | N | 챌린지명 |
| `ruleType` | string | Y | N | `score_target`, `line_target`, `no_hold`, `time_attack` |
| `goalValue` | number | Y | N | 목표값 |
| `reward` | object | Y | N | 보상 구조 |
| `validFrom` | string | Y | N | UTC ISO 8601 |
| `validTo` | string | Y | N | UTC ISO 8601 |
| `myProgress` | object | Y | N | 사용자 진행도 |
| `claimed` | boolean | Y | N | 보상 수령 여부 |

중첩 구조
- `reward`: `rewardType`, `rewardValue`
- `myProgress`: `progressValue`, `completed`, `completedAt`

## 3.10 Daily Challenge 보상 수령
### `POST /daily-challenge/{challengeId}/claim`
성공 Status: `200`
실패 Status: `401`, `404`, `409`, `422`
재시도: 가능
멱등성: 필수

## 3.11 미션 목록 조회
### `GET /missions`
성공 Status: `200`
실패 Status: `401`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `missions` | array | Y | N | 반복 미션 목록 |

배열 항목 구조
- `missions[]`: `missionId`, `missionType`, `title`, `goalValue`, `progressValue`, `completed`, `claimed`, `reward`

## 3.12 공유 링크 생성
### `POST /share-links`
성공 Status: `201`
실패 Status: `401`, `404`, `422`, `429`
재시도: 가능
멱등성: 권장

요청 예시
```json
{
  "resultId": "gr_01",
  "shareType": "link"
}
```

응답 예시
```json
{
  "success": true,
  "data": {
    "shareId": "sh_01",
    "url": "https://example.com/share/sh_01"
  }
}
```

## 3.13 공유 결과 조회
### `GET /share-links/{shareId}`
성공 Status: `200`
실패 Status: `404`, `429`
재시도: 가능
멱등성: 불필요

응답 필드
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `shareId` | string | Y | N | 공유 ID |
| `mode` | string | Y | N | 모드 |
| `nickname` | string | Y | Y | 닉네임 |
| `score` | number | Y | Y | 점수형 모드 결과 |
| `timeMs` | number | Y | Y | 시간형 모드 결과 |
| `createdAt` | string | Y | N | UTC ISO 8601 |
| `summaryImageUrl` | string | Y | Y | 이미지 URL |
| `rankSummary` | object | Y | Y | 랭킹 요약 |

## 3.14 분석 이벤트 수집
### `POST /events`
요청 예시
```json
{
  "events": [
    {
      "name": "game_start",
      "occurredAt": "2026-03-11T10:00:00Z",
      "properties": {
        "mode": "MARATHON",
        "deviceType": "mobile"
      }
    }
  ]
}
```

## 4. 운영 API
## 4.1 Daily Challenge 생성
### `POST /admin/daily-challenges`
성공 Status: `201`
실패 Status: `400`, `401`, `403`, `422`
재시도: 제한적
멱등성: 권장

요청 필드
- `title`
- `ruleType`
- `goalValue`
- `rewardType`
- `rewardValue`
- `startAt`
- `endAt`

요청 필드 상세
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `title` | string | Y | N | 최대 100자 |
| `ruleType` | string | Y | N | enum |
| `goalValue` | number | Y | N | 1 이상 |
| `rewardType` | string | Y | N | enum |
| `rewardValue` | number | Y | N | 1 이상 |
| `startAt` | string | Y | N | UTC ISO 8601 |
| `endAt` | string | Y | N | UTC ISO 8601 |

응답 필드
- `challengeId`
- `status`
- `configVersionId`

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `challengeId` | string | Y | N | 생성된 챌린지 ID |
| `status` | string | Y | N | `scheduled`, `active` |
| `configVersionId` | number | Y | N | 연결된 설정 버전 |

## 4.2 Daily Challenge 수정
### `PATCH /admin/daily-challenges/{challengeId}`
성공 Status: `200`
실패 Status: `400`, `401`, `403`, `404`, `422`
재시도: 제한적
멱등성: 권장

요청 필드 상세
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `title` | string | N | N | 최대 100자 |
| `goalValue` | number | N | N | 1 이상 |
| `rewardValue` | number | N | N | 1 이상 |
| `startAt` | string | N | N | UTC ISO 8601 |
| `endAt` | string | N | N | UTC ISO 8601 |
| `status` | string | N | N | `scheduled`, `active`, `closed` |

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `challengeId` | string | Y | N | 수정 대상 ID |
| `status` | string | Y | N | 수정 후 상태 |
| `updatedFields` | array | Y | N | 수정된 필드 목록 |
| `updatedAt` | string | Y | N | UTC ISO 8601 |

배열 항목 구조
- `updatedFields[]`: 문자열 필드명

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "challenge not found",
    "details": {
      "challengeId": "dc_missing"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 4.3 시즌 설정
### `POST /admin/seasons`
성공 Status: `201`
실패 Status: `400`, `401`, `403`, `422`
재시도: 제한적
멱등성: 권장

요청 필드 상세
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `seasonName` | string | Y | N | 최대 100자 |
| `startAt` | string | Y | N | UTC ISO 8601 |
| `endAt` | string | Y | N | UTC ISO 8601, startAt 이후 |
| `resetRanking` | boolean | Y | N |  |
| `rewardPolicy` | object | Y | N | 시즌 보상 정책 |

중첩 구조
- `rewardPolicy`: `tierType`, `rewardType`, `rewardValue`, `distributionRule`

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `seasonId` | string | Y | N | 시즌 ID |
| `seasonName` | string | Y | N | 시즌명 |
| `status` | string | Y | N | `scheduled`, `active` |
| `createdAt` | string | Y | N | UTC ISO 8601 |

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "endAt must be after startAt",
    "details": {
      "field": "endAt"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 4.4 공지 등록
### `POST /admin/announcements`
성공 Status: `201`
실패 Status: `400`, `401`, `403`, `422`
재시도: 제한적
멱등성: 권장

요청 필드 상세
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `title` | string | Y | N | 최대 120자 |
| `body` | string | Y | N | 최대 5000자 |
| `priority` | number | Y | N | 0 이상 |
| `startAt` | string | Y | N | UTC ISO 8601 |
| `endAt` | string | N | Y | UTC ISO 8601 |
| `status` | string | Y | N | `draft`, `published` |

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `announcementId` | string | Y | N | 공지 ID |
| `status` | string | Y | N | 현재 상태 |
| `publishedAt` | string | Y | Y | UTC ISO 8601 |

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "title is required",
    "details": {
      "field": "title"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 4.5 의심 기록 조회
### `GET /admin/fraud-flags?status=open`
성공 Status: `200`
실패 Status: `401`, `403`, `422`
재시도: 가능
멱등성: 불필요

쿼리 파라미터
| 필드 | 타입 | Required | 허용값 |
|---|---|---|---|
| `status` | string | N | `open`, `reviewed`, `confirmed`, `dismissed` |
| `severity` | string | N | `low`, `medium`, `high` |
| `limit` | number | N | 1~100 |

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `flags` | array | Y | N | 플래그 목록 |
| `nextCursor` | string | Y | Y | 다음 페이지 커서 |

배열 항목 구조
- `flags[]`: `flagId`, `playerId`, `resultId`, `flagType`, `severity`, `status`, `createdAt`, `reason`

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "admin scope required",
    "details": {}
  },
  "meta": {
    "retryable": false
  }
}
```

## 4.6 의심 기록 조치
### `POST /admin/fraud-flags/{flagId}/actions`
성공 Status: `200`
실패 Status: `400`, `401`, `403`, `404`, `409`
재시도: 제한적
멱등성: 필수

요청 필드 상세
| 필드 | 타입 | Required | Nullable | 제약 |
|---|---|---|---|---|
| `action` | string | Y | N | `APPROVE_RESULT`, `EXCLUDE_RESULT`, `SUSPEND_PLAYER`, `DISMISS_FLAG` |
| `reason` | string | Y | N | 최대 255자 |

요청 예시
```json
{
  "action": "EXCLUDE_RESULT",
  "reason": "impossible_time_record"
}
```

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `flagId` | string | Y | N | 플래그 ID |
| `action` | string | Y | N | 수행한 조치 |
| `resultStatus` | string | Y | Y | `accepted`, `flagged`, `rejected` |
| `playerStatus` | string | Y | Y | `active`, `suspended` |
| `processedAt` | string | Y | N | UTC ISO 8601 |

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONFLICT",
    "message": "flag already processed",
    "details": {
      "flagId": "ff_01"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 4.7 운영 설정 조회
### `GET /admin/config-versions`
성공 Status: `200`
실패 Status: `401`, `403`
재시도: 가능
멱등성: 불필요

응답 필드 상세
| 필드 | 타입 | Required | Nullable | 설명 |
|---|---|---|---|---|
| `configVersions` | array | Y | N | 설정 버전 목록 |
| `activeConfig` | object | Y | Y | 현재 활성 설정 |

배열 항목 구조
- `configVersions[]`: `id`, `configType`, `effectiveFrom`, `effectiveTo`, `createdAt`

중첩 구조
- `activeConfig`: `id`, `configType`, `payload`, `effectiveFrom`

대표 오류 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "token missing",
    "details": {}
  },
  "meta": {
    "retryable": false
  }
}
```

## 5. 이벤트 명세
| 이벤트명 | 설명 | 필수 속성 |
|---|---|---|
| `landing_view` | 랜딩 진입 | `source`, `deviceType` |
| `quick_start_click` | 바로 시작 클릭 | `mode` |
| `mode_select` | 모드 선택 | `mode` |
| `tutorial_skip` | 튜토리얼 스킵 | `step` |
| `game_start` | 게임 시작 | `mode`, `sessionId` |
| `game_finish` | 게임 종료 | `mode`, `durationMs`, `endedReason` |
| `retry_click` | 결과 화면 재도전 | `mode` |
| `ranking_view` | 랭킹 조회 | `mode`, `period` |
| `share_click` | 공유 클릭 | `mode`, `shareType` |
| `daily_claim` | 데일리 보상 수령 | `challengeId` |

## 6. 오류 응답 기본 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "nickname must be 2 to 12 characters",
    "details": {
      "field": "nickname",
      "reason": "length_out_of_range"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 7. 상세 응답 예시 문서
- `15_API_예시응답_모음.md`
