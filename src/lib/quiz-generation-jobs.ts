// In-memory store for quiz generation jobs
// In production, you might want to use Redis or a database

export interface QuizGenerationJob {
  jobId: string;
  quizId: string;
  questionId?: string; // For question replacement jobs
  educatorId?: string; // For WebSocket routing
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
  private readonly JOB_EXPIRY_MS = 120 * 60 * 1000; // 120 minutes (2 hours for complex AI processing)
  private readonly MIN_JOB_LIFETIME_MS = 15 * 60 * 1000; // Minimum 15 minutes before allowing expiry

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
    
    // Auto-cleanup old jobs (but only if they're completed or failed)
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && (currentJob.status === 'completed' || currentJob.status === 'failed')) {
        this.delete(jobId);
      } else if (currentJob && currentJob.status === 'processing') {
        // Give processing jobs more time
        setTimeout(() => {
          const jobToCheck = this.jobs.get(jobId);
          if (jobToCheck && jobToCheck.status !== 'completed') {
            // Mark as failed if still not complete
            this.update(jobId, {
              status: 'failed',
              error: 'Job timed out after extended processing time'
            });
            // Clean up after marking as failed
            setTimeout(() => this.delete(jobId), 5 * 60 * 1000); // 5 more minutes
          }
        }, this.JOB_EXPIRY_MS);
      }
    }, this.MIN_JOB_LIFETIME_MS);
    
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

  // Get all jobs (for monitoring/WebSocket updates)
  getAllJobs(): Map<string, QuizGenerationJob> {
    return this.jobs;
  }

  // Update job (simplified method for WebSocket integration)
  updateJob(jobId: string, updates: Partial<QuizGenerationJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() });
    }
  }

  // Get job (alias for consistency)
  getJob(jobId: string): QuizGenerationJob | undefined {
    return this.get(jobId);
  }

  // Clean up old jobs
  cleanup(): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - job.createdAt.getTime();
      
      // Don't delete jobs that are still processing unless they're really old
      if (job.status === 'processing' && jobAge < this.JOB_EXPIRY_MS) {
        continue;
      }
      
      // Delete completed/failed jobs after normal expiry
      if (jobAge > this.JOB_EXPIRY_MS) {
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