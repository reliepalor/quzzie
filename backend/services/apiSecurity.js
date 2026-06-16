const buckets = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0]).trim();
  }

  const forwardedIp = req.headers?.['x-real-ip'];
  if (typeof forwardedIp === 'string' && forwardedIp.length > 0) {
    return forwardedIp.trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function cleanupBuckets(now) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(req, res, options) {
  const { key, max, windowMs, message } = options;
  const now = Date.now();

  cleanupBuckets(now);

  const bucketKey = `${key}:${getClientIp(req)}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs
    });

    return true;
  }

  if (bucket.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.status(429).json({
      error: message,
      retryAfterSeconds: retryAfter
    });

    return false;
  }

  bucket.count += 1;
  return true;
}

export function createRateLimitMiddleware(options) {
  return (req, res, next) => {
    if (checkRateLimit(req, res, options)) {
      next();
    }
  };
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateTextField(name, value, maxLength, required = true) {
  const text = toTrimmedString(value);

  if (!text && !required) {
    return { ok: true, value: '' };
  }

  if (!text) {
    return { ok: false, error: `${name} is required` };
  }

  if (text.length > maxLength) {
    return { ok: false, error: `${name} must be at most ${maxLength} characters` };
  }

  return { ok: true, value: text };
}

export function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const topic = validateTextField('topic', body.topic, 120);
  if (!topic.ok) return topic;

  const subject = validateTextField('subject', body.subject, 80);
  if (!subject.ok) return subject;

  const testType = validateTextField('testType', body.testType, 30);
  if (!testType.ok) return testType;

  const level = validateTextField('level', body.level, 30);
  if (!level.ok) return level;

  const subLevel = validateTextField('subLevel', body.subLevel, 30, false);
  if (!subLevel.ok) return subLevel;

  const parsedQuestionCount = Number.parseInt(String(body.questionCount), 10);

  if (!Number.isInteger(parsedQuestionCount) || parsedQuestionCount < 1 || parsedQuestionCount > 20) {
    return { ok: false, error: 'questionCount must be an integer between 1 and 20' };
  }

  return {
    ok: true,
    value: {
      topic: topic.value,
      subject: subject.value,
      testType: testType.value,
      level: level.value,
      subLevel: subLevel.value,
      questionCount: parsedQuestionCount,
      testMode: toTrimmedString(body.testMode) || 'learning'
    }
  };
}

export function validateCheckTopicRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const topic = validateTextField('topic', body.topic, 120);
  if (!topic.ok) return topic;

  const level = validateTextField('level', body.level, 30);
  if (!level.ok) return level;

  const subLevel = validateTextField('subLevel', body.subLevel, 30, false);
  if (!subLevel.ok) return subLevel;

  return {
    ok: true,
    value: {
      topic: topic.value,
      level: level.value,
      subLevel: subLevel.value
    }
  };
}

export function validateImageRequest(query, subject) {
  const normalizedQuery = toTrimmedString(query);
  const normalizedSubject = toTrimmedString(subject);

  if (!normalizedQuery) {
    return { ok: false, error: 'Missing query' };
  }

  if (normalizedQuery.length > 80) {
    return { ok: false, error: 'Query is too long' };
  }

  if (normalizedSubject.length > 50) {
    return { ok: false, error: 'Subject is too long' };
  }

  return {
    ok: true,
    value: {
      query: normalizedQuery
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .slice(0, 4)
        .join(' '),
      subject: normalizedSubject
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .slice(0, 4)
        .join(' ')
    }
  };
}