// Minimal structured logger (no external deps)
type Level = 'debug' | 'info' | 'warn' | 'error';

const COLORS: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function emit(level: Level, scope: string, message: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `${COLORS[level]}[${ts}] ${level.toUpperCase().padEnd(5)}${RESET} [${scope}] ${message}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (extra !== undefined) fn(line, extra);
  else fn(line);
}

export const logger = {
  debug: (scope: string, msg: string, extra?: unknown) => emit('debug', scope, msg, extra),
  info: (scope: string, msg: string, extra?: unknown) => emit('info', scope, msg, extra),
  warn: (scope: string, msg: string, extra?: unknown) => emit('warn', scope, msg, extra),
  error: (scope: string, msg: string, extra?: unknown) => emit('error', scope, msg, extra),
};
