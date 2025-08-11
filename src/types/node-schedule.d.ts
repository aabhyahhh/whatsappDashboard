declare module 'node-schedule' {
  interface Job {
    cancel(reschedule?: boolean): boolean;
    reschedule(spec: string | Date | RecurrenceRule): boolean;
    nextInvocation(): Date;
  }

  interface RecurrenceRule {
    year?: number | number[];
    month?: number | number[];
    date?: number | number[];
    dayOfWeek?: number | number[];
    hour?: number | number[];
    minute?: number | number[];
    second?: number | number[];
    tz?: string;
  }

  interface ScheduleJob {
    (job: Job): void;
    (name: string, rule: string | Date | RecurrenceRule, callback: () => void): Job;
    (rule: string | Date | RecurrenceRule, callback: () => void): Job;
    scheduleJob(rule: string | Date | RecurrenceRule, callback: () => void): Job;
    scheduleJob(name: string, rule: string | Date | RecurrenceRule, callback: () => void): Job;
  }

  const schedule: ScheduleJob;
  export = schedule;
} 