export type ParsedVapiLead = {
  structuredOutput: Record<string, unknown> | null;
  transcript: string;
  sentiment: string | null;
};

function parsePossibleJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseLeadResult(result: unknown): Record<string, unknown> | null {
  if (typeof result === 'string') {
    return parsePossibleJson(result);
  }
  if (result && typeof result === 'object') {
    return result as Record<string, unknown>;
  }
  return null;
}

function unwrapLeadEnvelope(value: Record<string, unknown>): Record<string, unknown> | null {
  const values = Object.values(value);
  for (const entry of values) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name : null;
    if (name !== 'lead_info') {
      continue;
    }
    return parseLeadResult(obj.result) ?? null;
  }
  return null;
}

function looksLikeLeadPayload(value: Record<string, unknown>): boolean {
  const hasPersonal = typeof value.personal === 'object' && value.personal !== null;
  const hasAcademic = typeof value.academic === 'object' && value.academic !== null;
  const hasPreferences = typeof value.preferences === 'object' && value.preferences !== null;
  return hasPersonal && (hasAcademic || hasPreferences);
}

function findLeadPayloadDeep(root: unknown): Record<string, unknown> | null {
  if (!root || typeof root !== 'object') {
    return null;
  }

  const seen = new Set<object>();
  const queue: unknown[] = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    const obj = current as Record<string, unknown>;
    const ref = obj as object;
    if (seen.has(ref)) {
      continue;
    }
    seen.add(ref);

    if (looksLikeLeadPayload(obj)) {
      return obj;
    }

    if (obj.name === 'lead_info') {
      const parsed = parseLeadResult(obj.result);
      if (parsed && looksLikeLeadPayload(parsed)) {
        return parsed;
      }
    }

    if (obj.result) {
      const parsed = parseLeadResult(obj.result);
      if (parsed && looksLikeLeadPayload(parsed)) {
        return parsed;
      }
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return null;
}

export function extractLeadData(messages: unknown[]): ParsedVapiLead {
  const transcriptLines: string[] = [];
  let structuredOutput: Record<string, unknown> | null = null;
  let sentiment: string | null = null;

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      continue;
    }

    const message = msg as Record<string, unknown>;
    const role = typeof message.role === 'string' ? message.role : null;
    const content = typeof message.content === 'string' ? message.content : null;

    if (role && content) {
      transcriptLines.push(`${role}: ${content}`);
    }

    if (!structuredOutput) {
      structuredOutput = findLeadPayloadDeep(message) ?? structuredOutput;
    }

    const name = typeof message.name === 'string' ? message.name : null;
    const result = message.result;

    if (name === 'lead_info') {
      structuredOutput = parseLeadResult(result) ?? structuredOutput;
    }

    if (!structuredOutput) {
      structuredOutput = unwrapLeadEnvelope(message) ?? structuredOutput;
    }

    if (!structuredOutput && result) {
      const maybeParsed = parseLeadResult(result);
      if (maybeParsed && looksLikeLeadPayload(maybeParsed)) {
        structuredOutput = maybeParsed;
      }
    }

    const messageType = typeof message.type === 'string' ? message.type : null;
    if (!structuredOutput && messageType === 'function-call') {
      const fn = message.functionCall;
      if (fn && typeof fn === 'object') {
        const fnObj = fn as Record<string, unknown>;
        if (fnObj.name === 'lead_info') {
          const fnResult = fnObj.result;
          structuredOutput = parseLeadResult(fnResult) ?? structuredOutput;
        }
      }
    }

    if (!sentiment && typeof message.sentiment === 'string') {
      sentiment = message.sentiment;
    }
  }

  return {
    structuredOutput,
    transcript: transcriptLines.join('\n'),
    sentiment,
  };
}
