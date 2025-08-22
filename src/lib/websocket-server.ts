import { logger } from "@/lib/logger";
import { jobStore } from "@/lib/quiz-generation-jobs";

// Server-side WebSocket message sender
// This would integrate with your WebSocket server implementation
// For now, we'll use a polling-to-WebSocket bridge

interface WebSocketBroadcaster {
  sendToUser(userId: string, message: unknown): void;
  sendToAll(message: unknown): void;
}

// Mock broadcaster that would be replaced with actual WebSocket server
class MockBroadcaster implements WebSocketBroadcaster {
  sendToUser(userId: string, message: unknown) {
    logger.debug(`[WS] Would send to user ${userId}:`, message);
  }
  
  sendToAll(message: unknown) {
    logger.debug(`[WS] Would broadcast:`, message);
  }
}

let broadcaster: WebSocketBroadcaster = new MockBroadcaster();

export function setBroadcaster(b: WebSocketBroadcaster) {
  broadcaster = b;
}

// Job status monitor that sends WebSocket updates
export function startJobMonitor() {
  // Monitor job status changes and send WebSocket updates
  setInterval(() => {
    const jobs = jobStore.getAllJobs();
    
    for (const [jobId, job] of jobs) {
      // Send status update via WebSocket
      const message = {
        type: 'quiz_status',
        data: {
          jobId,
          quizId: job.quizId,
          questionId: job.questionId,
          status: job.status,
          progress: job.progress,
          message: job.message,
          error: job.error,
        },
        timestamp: Date.now(),
      };
      
      // In a real implementation, we'd send to the specific user
      // For now, we'll use the job's educatorId if available
      if (job.educatorId) {
        broadcaster.sendToUser(job.educatorId, message);
      }
    }
  }, 1000); // Check every second
}

// Function to send immediate status update
export function sendJobStatusUpdate(jobId: string) {
  const job = jobStore.getJob(jobId);
  if (!job) return;
  
  const message = {
    type: job.questionId ? 'question_replace' : 'quiz_status',
    data: {
      jobId,
      quizId: job.quizId,
      questionId: job.questionId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      error: job.error,
    },
    timestamp: Date.now(),
  };
  
  if (job.educatorId) {
    broadcaster.sendToUser(job.educatorId, message);
  }
}

// Update job and send WebSocket notification
export function updateJobWithNotification(
  jobId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Partial<any>
) {
  jobStore.updateJob(jobId, updates);
  sendJobStatusUpdate(jobId);
}