import type { Game } from './game';
type WebTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
type ModelContext = {
  registerTool: (
    tool: WebTool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerGameTools(game: Game) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  const lifetime = new AbortController();
  if (!context?.registerTool) return () => lifetime.abort();
  const state = () => ({ ...game.state });
  const tools: WebTool[] = [
    {
      name: 'read_trashketball_state',
      title: 'Read game state',
      description:
        'Read level, score, shot counts, current aim and power, and whether a throw is in flight.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: state,
    },
    {
      name: 'throw_paper',
      title: 'Throw paper',
      description:
        'Set aim and power and throw one paper ball through the visible game controls. Returns the resulting score after the shot finishes. Yaw is horizontal degrees; elevation is the launch angle in degrees. Requires the game to be ready.',
      inputSchema: {
        type: 'object',
        properties: {
          yaw: { type: 'number', minimum: -22, maximum: 22 },
          elevation: { type: 'number', minimum: 22, maximum: 69 },
          power: { type: 'number', minimum: 15, maximum: 100 },
        },
        required: ['yaw', 'elevation', 'power'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== 'object')
          throw new Error('Expected yaw, elevation and power.');
        const value = input as Record<string, unknown>;
        for (const [key, min, max] of [
          ['yaw', -22, 22],
          ['elevation', 22, 69],
          ['power', 15, 100],
        ] as const) {
          const n = value[key];
          if (
            typeof n !== 'number' ||
            !Number.isFinite(n) ||
            n < min ||
            n > max
          )
            throw new Error(`${key} must be between ${min} and ${max}.`);
        }
        if (
          Object.keys(value).some(
            (k) => !['yaw', 'elevation', 'power'].includes(k),
          )
        )
          throw new Error('Unknown throw parameter.');
        if (game.state.phase !== 'ready')
          throw new Error(
            'Finish the current throw or choose the next level first.',
          );
        game.aim(
          value.yaw as number,
          value.elevation as number,
          value.power as number,
        );
        game.throwBall();
        if (game.state.phase === 'ready')
          throw new Error('Close the help panel before throwing.');
        await new Promise<void>((resolve, reject) => {
          const started = performance.now();
          const poll = () => {
            if (lifetime.signal.aborted) {
              reject(new Error('Game closed.'));
              return;
            }
            if (game.state.phase !== 'flying') {
              resolve();
              return;
            }
            if (performance.now() - started > 20000) {
              reject(new Error('Throw is still paused or in progress.'));
              return;
            }
            setTimeout(poll, 60);
          };
          poll();
        });
        return state();
      },
    },
    {
      name: 'enter_trashketball_level',
      title: 'Enter a level',
      description:
        'Enter level 1 or unlocked level 2, keeping the current score. Level 2 unlocks at 100 points.',
      inputSchema: {
        type: 'object',
        properties: { level: { type: 'integer', enum: [1, 2] } },
        required: ['level'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const level = (input as { level?: unknown })?.level;
        if (level !== 1 && level !== 2)
          throw new Error('Level must be 1 or 2.');
        if (game.state.phase === 'flying')
          throw new Error('Wait for the current shot to finish.');
        if (level === 2 && !game.state.unlocked)
          throw new Error('Score 100 points to unlock the beach.');
        game.changeLevel(level);
        return state();
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifetime.signal }),
      ).catch(() => {});
    } catch {
      /* Unsupported registries do not block the game. */
    }
  }
  return () => lifetime.abort();
}
