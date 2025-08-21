// In-memory store for quiz generation jobs
// In production, you might want to use Redis or a database

export interface QuizGenerationJob {
  jobId: string;
  quizId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  questionsData?: Record<string, unknown>[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  webhookPayload: Record<string, unknown>;
}

class QuizGenerationJobStore {
  private jobs: Map<string, QuizGenerationJob> = new Map();
  private readonly JOB_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes (extended for thorough biblical content processing)

  create(jobId: string, quizId: string, webhookPayload: Record<string, unknown>): QuizGenerationJob {
    const job: QuizGenerationJob = {
      jobId,
      quizId,
      status: 'pending',
      progress: 0,
      message: 'Preparing biblical knowledge assessment...',
      createdAt: new Date(),
      updatedAt: new Date(),
      webhookPayload
    };
    
    this.jobs.set(jobId, job);
    
    // Auto-cleanup old jobs
    setTimeout(() => {
      this.delete(jobId);
    }, this.JOB_EXPIRY_MS);
    
    return job;
  }

  get(jobId: string): QuizGenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  update(jobId: string, updates: Partial<QuizGenerationJob>): QuizGenerationJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    
    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };
    
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  delete(jobId: string): void {
    this.jobs.delete(jobId);
  }

  // Clean up old jobs
  cleanup(): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      if (now - job.createdAt.getTime() > this.JOB_EXPIRY_MS) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
export const jobStore = new QuizGenerationJobStore();

// Cleanup old jobs every 10 minutes
if (typeof process !== 'undefined') {
  setInterval(() => {
    jobStore.cleanup();
  }, 10 * 60 * 1000);
}