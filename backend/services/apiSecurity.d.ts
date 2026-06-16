export declare function checkRateLimit(req: any, res: any, options: {
  key: string;
  max: number;
  windowMs: number;
  message: string;
}): boolean;

export declare function createRateLimitMiddleware(options: {
  key: string;
  max: number;
  windowMs: number;
  message: string;
}): (req: any, res: any, next: () => void) => void;

export declare function validateGenerateRequest(body: any):
  | { ok: true; value: {
    topic: string;
    subject: string;
    testType: string;
    level: string;
    subLevel: string;
    questionCount: number;
    testMode: string;
  } }
  | { ok: false; error: string };

export declare function validateCheckTopicRequest(body: any):
  | { ok: true; value: { topic: string; level: string; subLevel: string } }
  | { ok: false; error: string };

export declare function validateImageRequest(query: any, subject: any):
  | { ok: true; value: { query: string; subject: string } }
  | { ok: false; error: string };