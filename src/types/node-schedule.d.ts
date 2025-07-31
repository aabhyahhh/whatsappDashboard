declare module 'node-schedule' {
  interface Job {
    cancel(): void;
    reschedule(spec: string | Date): boolean;
  }

  interface ScheduleJob {
    (spec: string | Date, callback: () => void): Job;
    schedule(spec: string | Date, callback: () => void): Job;
  }

  const schedule: ScheduleJob;
  export = schedule;
} 