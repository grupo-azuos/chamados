/** Compose separa timers do processo web; sem override o desenvolvimento mantém as rotinas. */
export function backgroundJobsEnabled(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.BACKGROUND_JOBS_ENABLED !== 'false';
}
