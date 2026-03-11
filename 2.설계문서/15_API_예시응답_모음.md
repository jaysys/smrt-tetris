# API 예시응답 모음

## 1. 목적
프런트엔드, 백엔드, QA가 동일한 응답 형식으로 기능을 검증할 수 있도록 대표 응답 예시를 제공한다.

## 2. 성공 응답 예시
### 2.1 게임 세션 생성 성공
```json
{
  "success": true,
  "data": {
    "sessionId": "gs_1001",
    "mode": "MARATHON",
    "seed": "bag_seed_abc",
    "issuedAt": "2026-03-11T11:00:00Z",
    "configVersion": 3,
    "timeLimitSec": null,
    "rules": {
      "holdEnabled": true,
      "ghostEnabledDefault": true,
      "nextQueueSize": 5
    }
  },
  "error": null,
  "meta": {}
}
```

### 2.2 결과 제출 성공
```json
{
  "success": true,
  "data": {
    "validationStatus": "ACCEPTED",
    "personalBest": true,
    "leaderboardUpdated": true,
    "rankSummary": {
      "period": "daily",
      "rank": 12
    },
    "rewardSummary": {
      "dailyChallengeCompleted": false,
      "achievementsUnlocked": ["ACH_FIRST_PLAY"]
    },
    "retryable": false
  },
  "error": null,
  "meta": {}
}
```

## 3. 검증 실패 응답 예시
### 3.1 의심 기록 플래그
```json
{
  "success": true,
  "data": {
    "validationStatus": "FLAGGED",
    "personalBest": false,
    "leaderboardUpdated": false,
    "rankSummary": null,
    "rewardSummary": null,
    "retryable": false
  },
  "error": null,
  "meta": {
    "flagReason": "input_rate_suspicious"
  }
}
```

### 3.2 즉시 거절
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESULT_FLAGGED",
    "message": "checkpoint hash mismatch",
    "details": {
      "validationStatus": "REJECTED"
    }
  },
  "meta": {
    "retryable": false
  }
}
```

## 4. 권한 오류 예시
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

## 5. 중복 요청 예시
### 5.1 동일 payload 재전송
```json
{
  "success": true,
  "data": {
    "validationStatus": "ACCEPTED",
    "personalBest": true,
    "leaderboardUpdated": true,
    "rankSummary": {
      "period": "daily",
      "rank": 12
    },
    "rewardSummary": {
      "dailyChallengeCompleted": false,
      "achievementsUnlocked": []
    },
    "retryable": false
  },
  "error": null,
  "meta": {
    "idempotentReplay": true
  }
}
```

### 5.2 동일 키 다른 payload
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONFLICT",
    "message": "idempotency key already used with different payload",
    "details": {}
  },
  "meta": {
    "retryable": false
  }
}
```

## 6. 금칙어 닉네임 예시
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NICKNAME_BLOCKED",
    "message": "nickname contains blocked word",
    "details": {
      "field": "nickname"
    }
  },
  "meta": {
    "retryable": false
  }
}
```
